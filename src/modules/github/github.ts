import simpleGit from 'simple-git'

export async function gitClone(repoUrl: string, path: string) {
    console.debug(`Cloning [${repoUrl} into [${path}]`)
    await simpleGit().clone(repoUrl, path)
    console.debug('Finished cloning')
}
