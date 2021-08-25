import './setup'
import { JarbasConfig } from './modules/config'
import { GithubWebhook } from './modules/github/webhook'

async function init() {
    await JarbasConfig.init()
    GithubWebhook.init()
}

init()





