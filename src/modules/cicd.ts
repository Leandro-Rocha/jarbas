import Dockerode from 'dockerode'
import faker from 'faker'
import simpleGit from 'simple-git'
import { EVENTS, JarbasContext, jarbasEvents } from '../core/events'
import { getEnvironmentForProjectEnvironment, JarbasProject } from './config'
import { buildImage } from './docker/build'
import { createContainer } from './docker/create'
import { docker } from './docker/docker'
import { listContainers, manageContainer } from './docker/manage'

export function createPipeline(project: JarbasProject) {
    jarbasEvents.on(EVENTS.GITHUB_PUSH, async (ctx: JarbasContext) => {
        const pushInfo = ctx.pushInfo

        // Checks if this project listens to this repo/branch
        if (project.githubInfo.id !== pushInfo.id) return
        const mapping = project.branchMapping.find((mapping) => mapping.branch === pushInfo.branch)
        if (!mapping) return

        const uuid = faker.random.alpha({ count: 32 })
        const tempFolder = '/tmp/' + uuid
        const repoUrl = pushInfo.url

        console.debug(`Cloning [${repoUrl}] into [${tempFolder}]`)
        await simpleGit().clone(repoUrl, tempFolder)
        console.info(`Finished cloning url [${repoUrl}]`)

        ctx.repositoryInfo = { repositoryFolder: tempFolder }
        jarbasEvents.emit(EVENTS.REPO_CLONED, ctx)
    })

    jarbasEvents.on(EVENTS.REPO_CLONED, async (ctx: JarbasContext) => {
        // Checks if this project listens to this repo/branch
        const pushInfo = ctx.pushInfo
        if (project.githubInfo.id !== pushInfo.id) return

        const repoFolder = ctx.repositoryInfo.repositoryFolder
        if (!repoFolder) {
            console.error(`Cannot build image as [repositoryFolder] is not set in context`)
            return
        }

        const branch = pushInfo.branch

        const targetBranches = project.branchMapping.filter((mapping) => mapping.branch === pushInfo.branch)

        for (const mapping of targetBranches) {
            const environment = mapping.environment

            // If the push was not in the main branch
            if (branch !== pushInfo.defaultBranch) {
                console.debug(`Checking out branch [${branch}]`)
                simpleGit(`${repoFolder}`).checkout(branch)
            }

            const labels = {
                agent: 'jarbas',
                jarbasProject: project.name,
                jarbasEnvironment: environment,
            }

            const imageName = `${project.name.toLowerCase()}:${environment}`
            await buildImage(repoFolder, imageName, labels)

            ctx.imageName = imageName
            jarbasEvents.emit(EVENTS.IMAGE_BUILT, ctx)
        }
    })

    jarbasEvents.on(EVENTS.IMAGE_BUILT, async (ctx: JarbasContext) => {
        const imageName = ctx.imageName
        if (!imageName) {
            console.error(`Cannot create container as [imageName] is not set in context`)
            return
        }
        const targetBranches = project.branchMapping.filter((mapping) => mapping.branch === ctx.pushInfo.branch)

        for (const mapping of targetBranches) {
            const environment = mapping.environment

            const containerOptions: Dockerode.ContainerCreateOptions = {
                Image: imageName,
                Env: getEnvironmentForProjectEnvironment(project, environment),
                HostConfig: {
                    RestartPolicy: { Name: 'unless-stopped' },
                },
                Labels: {
                    agent: 'jarbas',
                    jarbasProject: project.name,
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

        // Checks if this project listens to this repo/branch
        if (project.githubInfo.id !== pushInfo.id) return
        const mapping = project.branchMapping.find((mapping) => mapping.branch === pushInfo.branch)
        if (!mapping) return

        const targetBranches = project.branchMapping.filter((mapping) => mapping.branch === ctx.pushInfo.branch)

        for (const mapping of targetBranches) {
            const environment = mapping.environment

            const obsoleteContainers = await listContainers({
                status: ['running'],
                label: ['agent=jarbas', `jarbasProject=${project.name}`, `jarbasEnvironment=${environment}`],
            })

            for (const container of obsoleteContainers) await manageContainer(container, 'stop')
            docker.getContainer(ctx.newContainerID).start()
            for (const container of obsoleteContainers) await manageContainer(container, 'remove')
        }

        jarbasEvents.emit(EVENTS.CONTAINERS_STOPPED, ctx)
    })
}
