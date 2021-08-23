import Docker from 'dockerode'

console.debug(`Starting Docker module`);

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

console.info(`Docker module started`);

export async function test() {

    const list = await docker.listContainers()
    const cafofoId = list.find(container => container.Image === 'cafofo-assistant')?.Id!

    console.log(`ID ${cafofoId}`)

    const cafofoContainer = docker.getContainer(cafofoId)
    console.log(cafofoContainer)

    await cafofoContainer.stop()

    await cafofoContainer.restart()
}
