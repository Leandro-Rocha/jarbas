import { default as Docker, default as Dockerode } from 'dockerode'
import { JarbasWatcherConfig } from './config'

console.debug(`Starting Docker module`)
export const docker = new Docker({ socketPath: '/var/run/docker.sock' })


console.info(`Docker module started`)

export async function listContainers(filters?: any) {
    return await docker.listContainers({ all: true, filters: filters })
}


export async function buildImage(config: JarbasWatcherConfig, path: string) {
    const imageName = config.docker.imageName

    console.debug(`Building [${imageName}]`)

    process.on('uncaughtException', logUncaughtException)

    const stream = await docker.buildImage(
        {
            context: path,
            src: ['Dockerfile', ...config.docker.buildSources || []]
        },
        {
            t: `${imageName}`,
            labels: { 'agent': 'jarbas', 'jarbasProject': config.name }
        })

    await followStream(stream)

    process.off('uncaughtException', logUncaughtException)

    console.info(`Finished building [${imageName}]`)
}


async function followStream(stream: NodeJS.ReadableStream) {
    await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => {
            if (err) {
                console.error(err)
                reject(err)
            }
            else {
                resolve(res)
            }
        }, (event => console.debug(event)))
    })
}

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


export async function createContainer(options: Dockerode.ContainerCreateOptions) {
    console.debug(`Creating container for image [${options.Image}]`)
    const container = await docker.createContainer(options)
    console.debug(`Finished creating container [${container.id}]`)

    return container
}

const logUncaughtException = (error: any) => { console.error('Build failed: ', error) }
