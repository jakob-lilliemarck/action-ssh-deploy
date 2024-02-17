import type {
    Client as SSHClient,
    SFTPWrapper,
    ConnectConfig,
} from 'ssh2'
import { Path } from './path'
import { Instruction } from "./instruction";
import { readdirSync, statSync } from 'fs'

export interface UploadConfig extends ConnectConfig {
    files: string
}

enum SFTPEvents {
    READY = 'ready'
}

export interface UploadConfig extends ConnectConfig {
    files: string
}

export class Queue {
    private _ssh: SSHClient
    private _sftp: SFTPWrapper
    private _instructions: Array<Instruction>
    private _existing: Set<string>

    constructor({ ssh, sftp, instructions, existing }: { ssh: SSHClient, sftp: SFTPWrapper, instructions: Array<Instruction>, existing?: Set<string> }) {
        this._ssh = ssh
        this._sftp = sftp
        this._instructions = instructions
        this._existing = existing ?? new Set<string>()
    }

    get instructions() {
        return this._instructions
    }

    static createUploadQueue(ssh: SSHClient, config: UploadConfig): Promise<Queue> {
        return new Promise((resolve, reject) => {
            ssh.on(SFTPEvents.READY, () => {
                ssh.sftp(async (e, sftp) => {
                    if (e) {
                        console.error(`${Queue.name}::createUploadQueue::${e}`)
                        reject(e)
                    } else {
                        console.info(`${Queue.name}::createUploadQueue::connected`)
                        resolve(new Queue({
                            ssh,
                            sftp,
                            instructions: Instruction.fromString(config.files)
                        }))
                    }
                });
            }).connect(config);
        })
    }

    exist({ path }: Path): Promise<boolean> {
        return new Promise((resolve) => {
            if (this._existing.has(path)) {
                // console.debug(`${Queue.name}::exist::${path}::true`)
                resolve(true)
            } else {
                this._sftp.exists(path, (e) => {
                    if (e) {
                        // console.debug(`${Queue.name}::exist::${path}::true`)
                        this._existing.add(path)
                        resolve(true)
                    } else {
                        // console.debug(`${Queue.name}::exist::${path}::false`)
                        resolve(false)
                    }
                })
            }
        })
    }

    mkdir(instruction: Instruction): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const exist = await this.exist(instruction.target)
            if (exist) {
                resolve()
            } else {
                this._sftp.mkdir(instruction.target.path, (e) => {
                    if (e) {
                        console.error(`${Queue.name}::mkdir::${e}`)
                        reject(e)
                    } else {
                        console.info(`${Queue.name}::mkdir::${instruction.target.path}`)
                        this._existing.add(instruction.target.path)
                        resolve()
                    }
                })
            }
        })
    }

    upload(instruction: Instruction): Promise<void> {
        return new Promise((resolve, reject) => {
            this._sftp.fastPut(
                instruction.source.path,
                instruction.target.path,
                {},
                (e) => {
                    if (e) {
                        console.error(`${Queue.name}::upload::${e}`)
                        reject()
                    } else {
                        console.info(`${Queue.name}::upload::${instruction.source.path}`)
                        resolve()
                    }
                }
            )
        })
    }

    async recvMkdir(instructions: Array<Instruction>, existing: Set<string> = new Set()): Promise<Set<string>> {
        const [current, ...remaining] = instructions
        await this.mkdir(current)
        if (remaining.length > 0) {
            await this.recvMkdir(remaining, new Set([...existing, current.target.path]))
        } else {
            return existing
        }
    }

    async recvUpload(instruction: Instruction) {
        // Create the parent directory if it doesn't exist
        await this.recvMkdir(instruction.explodeTargetParent())
        if (statSync(instruction.source.path).isDirectory()) {
            // If source is a directory, create it
            await this.mkdir(instruction)
            // Then recursivly sync the source and target directories
            await readdirSync(instruction.source.path).reduce((pending, path) =>
                pending.then(() => this.recvUpload(
                    new Instruction({
                        source: `${instruction.source.path}/${path}`,
                        target: `${instruction.target.path}/${path}`
                    })
                )), Promise.resolve());
        } else {
            // If source is a file, upload it
            await this.upload(instruction)
        }
    }

    async uploadAll(): Promise<void> {
        await this.instructions.reduce((pending, instruction) => {
            return pending.then(() => this.recvUpload(instruction))
        }, Promise.resolve());
        this._ssh.end()
    }
}