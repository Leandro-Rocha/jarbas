import { buildImage } from '../modules/docker/build'

test('dockerode build', async () => {
    try {
        await buildImage(`${__dirname}/resources/build/error`, 'jest')
    } catch (error) {}
}, 10000)
