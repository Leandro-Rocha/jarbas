import { listFolderContents } from '../github/util'
import { docker } from './docker'

export async function buildImage(repositoryFolder: string, imageName: string, labels?: { [key: string]: string }) {
    console.debug(`Building [${imageName}] on [${repositoryFolder}]`)

    const stream = await docker.buildImage(
        {
            context: repositoryFolder,
            src: listFolderContents(repositoryFolder, ['.git']),
        },
        {
            t: imageName,
            labels,
        },
    )

    try {
        await followStream(stream)
    } catch (error) {
        console.error(`Error building image [${imageName}]. Aborting...`)
        throw error
    }

    console.info(`Finished building [${imageName}]`)
}

async function followStream(stream: NodeJS.ReadableStream) {
    return await new Promise((resolve, reject) => {
        docker.modem.followProgress(
            stream,
            (err, res) => {
                err ? reject(err) : resolve(res)
            },
            (event) => {
                if (event.error) {
                    reject(event.error)
                } else {
                    console.debug(event.stream || event)
                }
            },
        )
    })
}
