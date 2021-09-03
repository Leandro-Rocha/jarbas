import faker from 'faker';
import simpleGit from 'simple-git';
import { CloneContext } from '../../core/events';

export async function gitClone(repositoryName: string, repositoryUrl: string): Promise<CloneContext> {

    const uuid = faker.random.alpha({ count: 32 })
    const tempFolder = '/tmp/' + uuid

    console.debug(`Cloning [${repositoryName}] into [${tempFolder}]`);
    await simpleGit().clone(repositoryUrl, tempFolder)

    console.info(`Finished cloning url [${repositoryName}]`)
    return { repositoryFolder: tempFolder }
}
