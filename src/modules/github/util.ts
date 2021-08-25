import { request } from "@octokit/request"
import parseGithubUrl from "parse-github-url"


export async function parseGithubInfoFromUrl(url: string) {
    console.debug(`Parsing github url [${url}]`)
    const githubInfo = parseGithubUrl(url)!

    console.debug(githubInfo)
    return githubInfo
}

export async function fetchGithubRepoInfo(owner: string, name: string) {
    console.debug(`Fetching info for [${owner}] [${name}]`)

    const response = await request('GET /repos/{owner}/{repo}', {
        owner: owner,
        repo: name
    })

    console.debug(response)
    return response
}