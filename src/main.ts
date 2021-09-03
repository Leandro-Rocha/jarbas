import './setup'
import { JarbasConfig } from './modules/config'
import { GithubWebhook } from './modules/github/webhook'
import './modules/github/clone'
import './modules/docker/docker'
import './modules/cicd'

async function init() {
    await JarbasConfig.init()
    const githubHooks = new GithubWebhook(JarbasConfig.getConfig())

    process.on('SIGTERM', () => { githubHooks.shutdown() })
    process.on('SIGINT', () => { githubHooks.shutdown() })
}

init()





