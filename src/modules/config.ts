import { readFile, readPropertyFile, requireEnv, writeFile } from "../core/util"
import { fetchGithubRepoInfo, parseGithubInfoFromUrl } from "./github/util"
import * as fs from 'fs'

export type JarbasConfigType = {
    webhookPort: string,
    webhookPath: string,
    watchers: JarbasWatcherConfig[]
}

export type JarbasWatcherConfig = {
    name: string,
    active: boolean,
    github: {
        url: string,
        id?: number,
        branch?: string,
    },
    docker: {
        imageName: string,
        buildSources?: string[],
    },
}

const configFolder = requireEnv('CONFIG_FOLDER', '/config/')
const configFile = requireEnv('CONFIG_FILE', 'jarbas-config.json')
const configPath = configFolder + configFile

export namespace JarbasConfig {
    let jarbasConfig: JarbasConfigType

    export async function init() {
        try {

            if (!fs.existsSync(configFolder)) throw `Config folder [${configFolder} does not exists]`
            if (!fs.existsSync(configFolder)) throw `Config file [${configPath} does not exists]`

            jarbasConfig = await loadConfigFile()
        } catch (error) {
            console.error(`Fatal error loading config file: ${error.message || error}`)
            process.exit()
        }
    }

    export function getConfig() { return jarbasConfig }
}

async function loadConfigFile() {

    console.debug(`Loading config from [${configPath}]`)

    const config: JarbasConfigType = JSON.parse(readFile(configPath))
    await enhanceConfig(config)
    saveConfigFile(config)

    return config
}

function saveConfigFile(config: JarbasConfigType) {
    console.debug(`Saving config file [${configPath}]`)
    writeFile(configPath, JSON.stringify(config, null, 4))
}

async function enhanceConfig(config: JarbasConfigType) {
    console.debug(`Enhancing config file info`)

    for (const watcher of config.watchers) {
        const github = watcher.github

        if (!github.id || !github.branch) {
            console.debug(`Github repo ID not found. Fetching...`)
            const parsedInfo = await parseGithubInfoFromUrl(github.url)

            if (!parsedInfo.owner || !parsedInfo.name)
                throw `Cannot get [owner] and [name] from ${github.url}`

            const repoInfo = await fetchGithubRepoInfo(parsedInfo.owner, parsedInfo.name)

            if (!repoInfo) {
                console.error(`Unable to fetch repo info from [${github.url}]. Watcher will be disabled`)
                watcher.active = false
                continue
            }

            console.debug(`Found repo id [${repoInfo.data.id}]`)

            watcher.github.id = repoInfo.data.id
            watcher.github.branch = parsedInfo.branch === 'master' ? repoInfo.data.default_branch : parsedInfo.branch
        }
    }
}

export function getWatchersFromRepoInfo(repoId: number, branch = 'master') {
    return JarbasConfig.getConfig().watchers.filter(watcher =>
        watcher.github.id === repoId
        && watcher.github.branch === branch)
}

export function getEnvironmentForWatcher(watcher: string) {
    const envFile = `${configFolder}/environments/${watcher}.env`

    if (fs.existsSync(envFile)) {
        console.debug(`Loading environment from [${envFile}]`)
        return readPropertyFile(envFile)
    }
    console.debug(`Cannot find environment file [${envFile}]. Ignoring...`)
    return []
}


