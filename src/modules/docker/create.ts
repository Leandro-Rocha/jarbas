import Dockerode from 'dockerode'
import { docker } from './docker'


export async function createContainer(options: Dockerode.ContainerCreateOptions) {
    console.debug(`Creating container for image [${options.Image}]`)
    const container = await docker.createContainer(options)
    console.debug(`Finished creating container [${container.id}]`)

    return container
}