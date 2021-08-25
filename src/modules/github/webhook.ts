import { PushEvent } from '@octokit/webhooks-types'
import createHandler from 'github-webhook-handler'
import http from 'http'
import { requireEnv } from '../../core/util'
import { newDeployment } from '../cicd'
import { getWatchersFromRepoInfo, JarbasConfig } from '../config'


export namespace GithubWebhook {

    const GITHUB_WEBHOOK_SECRET = requireEnv('GITHUB_WEBHOOK_SECRET')

    export function init() {
        const webhookPort = JarbasConfig.getConfig().webhookPort
        const webhookPath = JarbasConfig.getConfig().webhookPath

        const handler = createHandler({ path: webhookPath, secret: GITHUB_WEBHOOK_SECRET })

        http.createServer(function (req, res) {
            handler(req, res, function () {
                res.statusCode = 404
                res.end('no such location')
            })
        }).listen(webhookPort)


        handler.on('push', async function (event: { payload: PushEvent }) {

            const ref = event.payload.ref
            const pushBranch = ref.substring(ref.lastIndexOf('/') + 1)

            const repoInfo = event.payload.repository
            const repoUrl = repoInfo.url
            const repoId = repoInfo.id
            console.info(`New [push] event on branch [${pushBranch}] of [${repoUrl}]`)

            const watchers = getWatchersFromRepoInfo(repoId, pushBranch)
            if (watchers.length === 0) {
                console.warn(`There are no watchers for branch [${pushBranch}] on ${repoUrl}. Ignoring`)
                return
            }

            for (const watcher of watchers) await newDeployment(watcher)

            console.info(`Finished processing event on [${repoUrl}]`)
        })


        console.info(`Webhook started on :${webhookPort}${webhookPath}`)
    }
}