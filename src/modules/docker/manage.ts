import Dockerode from 'dockerode'
import { docker } from './docker'

export async function manageContainer(containerInfo: Dockerode.ContainerInfo, action: keyof Dockerode.Container) {
    const container = docker.getContainer(containerInfo.Id)

    try {
        console.debug(`Performing [${action}] on container [${containerInfo.Id}]`)
        await container[action]()
    }
    catch (error) {
        console.warn(`Cannot [${action}] container [${containerInfo.Id}]-[${containerInfo.State}]`)
    }
}

export async function listContainers(filters?: any) {
    return await docker.listContainers({ all: true, filters: filters })
}

