import { request } from "@octokit/request"
import parseGithubUrl from "parse-github-url"
import * as fs from 'fs'

export async function parseGithubInfoFromUrl(url: string) {
    const githubInfo = parseGithubUrl(url)!
    return githubInfo
}

export async function fetchGithubRepoInfo(owner: string, name: string) {
    console.debug(`Fetching info for [${owner}] [${name}]`)

    return await request('GET /repos/{owner}/{repo}', {
        owner: owner,
        repo: name
    })
}


export function listFolderContents(path: string) {
    return fs.readdirSync(path)
}