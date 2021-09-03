import * as fs from 'fs'

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function readFile(file: string) {
    return fs.readFileSync(file).toString()
}

export function writeFile(file: string, contents: string) {
    return fs.writeFileSync(file, contents)
}

export function readPropertyFile(file: string): string[] {
    return readFile(file)
        .split('\n')
        .filter(line => line && !line.startsWith('#'))
}