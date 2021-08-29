import Dockerode from "dockerode"
import faker from "faker"
import * as fs from "fs"
import { getEnvironmentForWatcher, JarbasWatcherConfig } from "./config"
import { buildImage, createContainer, docker, listContainers, manageContainer } from "./docker"
import { gitClone } from "./github/github"


export async function newDeployment(config: JarbasWatcherConfig) {

    console.info(`Starting new deployment for [${config.name}]`)

    const uuid = faker.datatype.uuid()
    const imageName = config.docker.imageName
    const tempFolder = '/tmp/' + uuid

    await gitClone(config.github.url, tempFolder)
    await buildImage(config, tempFolder)

    const containerOptions: Dockerode.ContainerCreateOptions =
    {
        Image: imageName,
        Env: (getEnvironmentForWatcher(config.name)),
        HostConfig: { RestartPolicy: { Name: 'unless-stopped' } },
        Labels: {
            agent: 'jarbas',
            jarbasProject: config.name
        },
    }
    const newContainer = await createContainer(containerOptions)

    console.debug(`Stopping old containers running [${imageName}]`)
    const containersToStop = await listContainers({
        status: ['running'], label: ['agent=jarbas', `jarbasProject=${config.name}`]
    })
    for (const container of containersToStop) await manageContainer(container, 'stop')

    console.debug(`Starting new container running [${imageName}]`)
    await newContainer.start({})

    console.debug(`Removing old containers running [${imageName}]`)
    const containersToRemove = await listContainers({ status: ['exited'], label: ['agent=jarbas', `jarbasProject=${config.name}`] })
    for (const container of containersToRemove) await manageContainer(container, 'remove')

    console.debug(`Removing old images`)
    const removedImages = await docker.pruneImages({
        all: true,
        filters: { label: ['agent=jarbas', `jarbasProject=${config.name}`] }
    })
    console.debug(removedImages)

    console.debug(`Removing folder [${tempFolder}]`)
    fs.rmSync(tempFolder, { recursive: true, force: true })

    console.info(`Finished deployment for [${config.name}]`)
}

