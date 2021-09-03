import { PushEvent } from '@octokit/webhooks-types'
import { Server } from 'http'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import { URL } from 'url'
import { EVENTS, JarbasContext, jarbasEvents } from '../../core/events'
import { JarbasConfigInterface } from '../config'

export class GithubWebhook {

    servers: Server[] = []

    constructor(config: JarbasConfigInterface) {

        const webhooks = fetchPortAndPathsFromConfig(config)

        for (const [port, paths] of Object.entries(webhooks)) {

            const app = new Koa()
            const router = new Router()

            app.use(bodyParser())
            app.use(router.routes())
            app.use(router.allowedMethods())

            paths.forEach(path => { router.post(path, webhookHandler) })
            this.servers.push(app.listen(port))
            console.info(`Webhook started on:`, [port, paths])
        }
    }

    shutdown() {
        for (const server of this.servers) { server.close(() => { console.info(`HTTP server closed`) }) }
    }
}

function fetchPortAndPathsFromConfig(config: JarbasConfigInterface) {
    return config.projects
        .filter(project => project.active)
        .map(pipeline => pipeline.triggers)
        .filter(trigger => trigger.githubWebhook)
        .map(trigger => trigger.githubWebhook)
        .map(payloadUrl => new URL(payloadUrl))
        .reduce((map, url) => {
            if (!map[url.port])
                map[url.port] = []

            map[url.port].push(url.pathname)
            return map
        }, {} as { [key: string]: string[] })
}

function webhookHandler(ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>, next: Koa.Next) {
    const event = ctx.request.headers?.['x-github-event']
    if (event === 'push') {
        const pushEvent: PushEvent = ctx.request.body
        const ref = pushEvent.ref
        const pushBranch = ref.substring(ref.lastIndexOf('/') + 1)
        const repository = pushEvent.repository

        console.info(`New [push] event on branch [${pushBranch}] of [${repository.full_name}]`)

        const jarbasCtx: Partial<JarbasContext> = {
            pushInfo: {
                id: repository.id,
                name: repository.full_name,
                url: repository.url,
                branch: pushBranch,
                defaultBranch: repository.default_branch
            }
        }

        jarbasEvents.emit(EVENTS.GITHUB_PUSH, jarbasCtx)
    }
    else {
        console.warn(`[${event}] received but [push] was expected. Ignoring...`)
    }

    ctx.status = 200
    if (next) next()
}