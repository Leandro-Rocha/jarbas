import { listFolderContents } from '../github/util'
import { docker } from './docker'

export async function buildImage(repositoryFolder: string, repositoryName: string, environment: string) {

    console.debug(`Building [${repositoryName}] for [${environment}]`)

    process.on('uncaughtException', logUncaughtException)

    const imageName = `${repositoryName.toLowerCase()}:${environment}`
    const stream = await docker.buildImage(
        {
            context: repositoryFolder,
            src: listFolderContents(repositoryFolder),
        },
        {
            t: imageName,
            labels: {
                agent: 'jarbas',
                jarbasProject: repositoryName,
                jarbasEnvironment: environment
            }
        })

    await followStream(stream)

    process.off('uncaughtException', logUncaughtException)
    console.info(`Finished building [${repositoryName}]`)
    return imageName
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

const logUncaughtException = (error: any) => { console.error('Build failed: ', error) }
