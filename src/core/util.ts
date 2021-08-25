import { MissingEnvironmentProperty } from "./exceptions"
import * as fs from 'fs';


export function requireEnv(environmentProperty: string, defaultValue?: string) {
    const propertyValue = process.env?.[environmentProperty]

    if (propertyValue) return propertyValue
    if (defaultValue) return defaultValue

    throw new MissingEnvironmentProperty(environmentProperty)
}

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