import * as fs from 'fs'
import { getProperty } from 'profile-env'
import { readFile, readPropertyFile, writeFile } from "../core/util"
import { fetchGithubRepoInfo, parseGithubInfoFromUrl } from "./github/util"

export interface JarbasConfigInterface {
    projects: JarbasProject[],
}

export interface JarbasProject {
    name: string,
    active: boolean,
    githubInfo: GitHubInfo,
    branchMapping: { [key: string]: string },
    triggers: { [key: string]: string },
    pipeline: JarbasProjectPipeline[]
}

export interface GitHubInfo {
    url: string,
    id?: number
}

export interface JarbasProjectPipeline {
    environment: string,
    actions: string[]
}

export interface GithubWebhookTrigger {
    githubWebhook: string,
}

const configFolder = getProperty('CONFIG_FOLDER', '/config/')!
const configFile = getProperty('CONFIG_FILE', 'jarbas-config.json')!
const configPath = configFolder + configFile

export namespace JarbasConfig {
    let jarbasConfig: JarbasConfigInterface

    export async function init() {
        try {

            if (!fs.existsSync(configFolder)) throw `Config folder [${configFolder} does not exists]`
            if (!fs.existsSync(configFolder)) throw `Config file [${configPath} does not exists]`

            jarbasConfig = loadConfigFile()
            await enhanceConfig(jarbasConfig)
            saveConfigFile(jarbasConfig)

        } catch (error: any) {
            console.error(`Fatal error loading config file: ${error.message || error}`)
            process.exit()
        }
    }

    export function getConfig() { return jarbasConfig }
}

function loadConfigFile(): JarbasConfigInterface {
    console.debug(`Loading config from [${configPath}]`)
    return JSON.parse(readFile(configPath))
}

function saveConfigFile(config: JarbasConfigInterface) {
    console.debug(`Saving config file [${configPath}]`)
    writeFile(configPath, JSON.stringify(config, null, 4))
}

async function enhanceConfig(config: JarbasConfigInterface) {
    console.debug(`Enhancing config file with missing info`)

    for (const project of config.projects) {
        const github = project.githubInfo

        if (!github.id) {
            console.debug(`Github repo ID not found. Fetching...`)
            const parsedInfo = await parseGithubInfoFromUrl(github.url)

            if (!parsedInfo.owner || !parsedInfo.name)
                throw `Cannot get [owner] and [name] from ${github.url}`

            const repoInfo = await fetchGithubRepoInfo(parsedInfo.owner, parsedInfo.name)

            if (!repoInfo) {
                console.error(`Unable to fetch repo info from [${github.url}]. Watcher will be disabled`)
                project.active = false
                continue
            }

            console.debug(`Found repo id [${repoInfo.data.id}]`)

            project.githubInfo.id = repoInfo.data.id
        }
    }
}


export function getEnvironmentForProjectEnvironment(project: JarbasProject, environment: string) {
    let envFile = `${configFolder}/environments/${project.name}.${environment}.env`

    if (!fs.existsSync(envFile))
        envFile = `${configFolder}/environments/${project.name}.env`

    if (fs.existsSync(envFile)) {
        console.debug(`Loading environment from [${envFile}]`)
        return readPropertyFile(envFile)
    }
    console.debug(`Cannot find environment file [${envFile}]. Ignoring...`)
    return []
}

export function getProjectsFromRepositoryId(id: number) {
    return JarbasConfig.getConfig().projects
        .filter(project => project.githubInfo.id === id)
}