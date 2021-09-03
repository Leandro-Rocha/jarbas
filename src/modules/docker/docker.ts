import Docker from 'dockerode'
import './build'
import './create'
import './manage'

console.debug(`Starting Docker module`)
export const docker = new Docker({ socketPath: '/var/run/docker.sock' })
console.info(`Docker module started`)
