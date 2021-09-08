import simpleGit from 'simple-git'
import { gitClone } from '../modules/github/clone'

test('dockerode build', async () => {
    const cloneInfo = await gitClone('jest', 'https://github.com/Leandro-Rocha/cafofo-assistant')

    const branches = simpleGit(`${cloneInfo.repositoryFolder}`).branch()
    console.log(branches)

    simpleGit(`${cloneInfo.repositoryFolder}`).checkout('development')
})
