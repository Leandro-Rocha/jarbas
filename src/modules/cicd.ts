import Dockerode from 'dockerode'
import simpleGit from 'simple-git'
import { EVENTS, JarbasContext, jarbasEvents } from '../core/events'
import { getEnvironmentForProjectEnvironment, getProjectsFromRepositoryId, JarbasProject } from './config'
import { buildImage } from './docker/build'
import { createContainer } from './docker/create'
import { docker } from './docker/docker'
import { listContainers, manageContainer } from './docker/manage'
import { gitClone } from './github/clone'

jarbasEvents.on(EVENTS.GITHUB_PUSH, async (ctx: JarbasContext) => {
    const pushInfo = ctx.pushInfo

    ctx.cloneInfo = await gitClone(pushInfo.name, pushInfo.url)
    jarbasEvents.emit(EVENTS.REPO_CLONED, ctx)
})

jarbasEvents.on(EVENTS.REPO_CLONED, async (ctx: JarbasContext) => {
    const repoFolder = ctx.cloneInfo.repositoryFolder
    if (!repoFolder) throw `Cannot build image as [repositoryFolder] is not set in context`

    const pushInfo = ctx.pushInfo
    const branch = pushInfo.branch
    const projects = getProjectsFromRepositoryId(pushInfo.id)

    if (projects.length === 0) {
        console.warn(`There are no projects for branch [${branch}] on ${pushInfo.name}. Aborting...`)
        return
    }

    // FIXME: We should iterate over target branches instead of projects
    for (const project of projects) {
        const environment = findEnvironmentFromBranch(project, branch)
        if (!environment) {
            console.debug(`Cannot define target environment from project [${project}] and branch [${branch}]`)
            continue
        }

        if (branch !== pushInfo.defaultBranch) {
            console.debug(`Checking out branch [${branch}]`)
            simpleGit(`${ctx.cloneInfo.repositoryFolder}`).checkout(branch)
        }

        ctx.imageName = await buildImage(ctx.cloneInfo.repositoryFolder, ctx.pushInfo.name, environment)
        jarbasEvents.emit(EVENTS.IMAGE_BUILT, ctx)
    }
})

jarbasEvents.on(EVENTS.IMAGE_BUILT, async (ctx: JarbasContext) => {
    const imageName = ctx.imageName

    if (!imageName) {
        console.error(`Cannot create container as [imageName] is not set in context`)
        return
    }

    const pushInfo = ctx.pushInfo
    const branch = pushInfo.branch
    const projects = getProjectsFromRepositoryId(pushInfo.id)

    if (projects.length === 0) {
        console.warn(`There are no projects for branch [${branch}] on ${pushInfo.name}. Aborting...`)
        return
    }

    for (const project of projects) {
        const environment = findEnvironmentFromBranch(project, branch)
        if (!environment) {
            console.debug(`Cannot define target environment from project [${project}] and branch [${branch}]`)
            continue
        }

        const containerOptions: Dockerode.ContainerCreateOptions = {
            Image: imageName,
            Env: getEnvironmentForProjectEnvironment(project, environment),
            HostConfig: {
                RestartPolicy: { Name: 'unless-stopped' },
                Mounts: [
                    {
                        Source: '/home/pi/cafofo-drive/deluge/autoadd',
                        Target: '/tmp',
                        Type: 'bind',
                    },
                ],
            },
            Labels: {
                agent: 'jarbas',
                jarbasProject: pushInfo.name,
                jarbasEnvironment: environment,
            },
        }

        const newContainer = await createContainer(containerOptions)

        //TODO Make an array of new containers instead
        ctx.newContainerID = newContainer.id
        jarbasEvents.emit(EVENTS.CONTAINER_CREATED, ctx)
    }
})

jarbasEvents.on(EVENTS.CONTAINER_CREATED, async (ctx: JarbasContext) => {
    const pushInfo = ctx.pushInfo
    const branch = pushInfo.branch
    const projects = getProjectsFromRepositoryId(pushInfo.id)

    if (projects.length === 0) {
        console.warn(`There are no projects for branch [${branch}] on ${pushInfo.name}. Aborting...`)
        return
    }

    for (const project of projects) {
        const environment = findEnvironmentFromBranch(project, branch)
        if (!environment) {
            console.debug(`Cannot define target environment from project [${project}] and branch [${branch}]`)
            continue
        }

        const containersToStop = await listContainers({
            status: ['running'],
            label: ['agent=jarbas', `jarbasProject=${ctx.pushInfo.name}`, `jarbasEnvironment=${environment}`],
        })

        if (containersToStop.length > 0) {
            for (const container of containersToStop) await manageContainer(container, 'stop')
        }
    }

    jarbasEvents.emit(EVENTS.CONTAINERS_STOPPED, ctx)
})

jarbasEvents.on(EVENTS.CONTAINERS_STOPPED, async (ctx: JarbasContext) => {
    const imageName = ctx.newContainerID

    if (!imageName) {
        console.error(`Cannot start container as [newContainerID] is not set in context`)
        return
    }

    const newContainer = docker.getContainer(ctx.newContainerID)

    if (!newContainer) {
        console.error(`Unable to find container with id = [${ctx.newContainerID}]. Aborting...`)
        return
    }

    console.debug(`Starting new container running [${imageName}]`)
    newContainer.start()

    jarbasEvents.emit(EVENTS.CONTAINER_STARTED, ctx)
})

jarbasEvents.on(EVENTS.CONTAINER_STARTED, async (ctx: JarbasContext) => {
    const pushInfo = ctx.pushInfo
    const branch = pushInfo.branch
    const projects = getProjectsFromRepositoryId(pushInfo.id)

    if (projects.length === 0) {
        console.warn(`There are no projects for branch [${branch}] on ${pushInfo.name}. Aborting...`)
        return
    }

    for (const project of projects) {
        const environment = findEnvironmentFromBranch(project, branch)
        if (!environment) {
            console.debug(`Cannot define target environment from project [${project}] and branch [${branch}]`)
            continue
        }
        const imageName = ctx.imageName

        if (!imageName) {
            console.error(`Cannot remove containers as [imageName] is not set in context`)
            return
        }

        console.debug(`Removing old containers running [${imageName}]`)
        const containersToRemove = await listContainers({
            status: ['exited'],
            label: ['agent=jarbas', `jarbasProject=${pushInfo.name}`, `jarbasEnvironment=${environment}`],
        })

        for (const container of containersToRemove) await manageContainer(container, 'remove')

        jarbasEvents.emit(EVENTS.CONTAINER_REMOVED, ctx)
    }
})

function findEnvironmentFromBranch(project: JarbasProject, targetBranch: string) {
    for (const [environment, branch] of Object.entries(project.branchMapping)) {
        if (branch === targetBranch) return environment
    }
    return
}
