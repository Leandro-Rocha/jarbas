
export class MissingEnvironmentProperty extends Error {
    constructor(name: string) {
        super(`Environment property ${name} is not set`);
        this.name = this.constructor.name;
    }
}