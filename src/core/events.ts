import EventEmitter from "events"

export const EVENTS = {
    GITHUB_PUSH: 'GITHUB_PUSH',
    REPO_CLONED: 'REPO_CLONED',
    IMAGE_BUILT: 'IMAGE_BUILT',
    CONTAINER_CREATED: 'CONTAINER_CREATED',
    CONTAINERS_STOPPED: 'CONTAINERS_STOPPED',
    CONTAINER_STARTED: 'CONTAINER_STARTED',
    CONTAINER_REMOVED: 'CONTAINER_REMOVED',
}

export const jarbasEvents = new EventEmitter()

export interface JarbasContext {
    // project: JarbasProject,
    pushInfo: {
        id: number,
        name: string,
        url: string,
        branch: string,
        defaultBranch: string,
    },
    cloneInfo: CloneContext,
    // environment: string,
    imageName: string,
    newContainerID: string
}

export interface CloneContext {
    repositoryFolder: string,
}