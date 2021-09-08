import './setup'
import { JarbasConfig } from './modules/config'
import { GithubWebhook } from './modules/github/webhook'
import './modules/docker/docker'
import './modules/cicd'
import { createPipeline } from './modules/cicd'

async function init() {
    await JarbasConfig.init()

    JarbasConfig.getConfig().projects.forEach((project) => createPipeline(project))
    const githubHooks = new GithubWebhook(JarbasConfig.getConfig())

    process.on('SIGTERM', () => {
        githubHooks.shutdown()
    })
    process.on('SIGINT', () => {
        githubHooks.shutdown()
    })
}

init()
