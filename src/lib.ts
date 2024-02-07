import type {
    Client as SSHClient,
    SFTPWrapper,
    ConnectConfig,
    Stats
} from 'ssh2'
import { readdirSync, statSync } from 'fs'

export interface Instruction {
    source: string,
    target: string
}

export interface UploadConfig extends ConnectConfig {
    files: string
}

enum SFTPEvents {
    READY = 'ready'
}

const pattern = RegExp([
    /^(:?source=)(?<source>(?<=source=)[\w\/\-\.]+)(:?,\s?target=)(?<target>(?<=target=)[\w\/\-\.]+)$/,
    /^[\w\/\-\.]+$/
].map((re) => re.source).join("|"))

export class UploadQueue {
    sftp: SFTPWrapper
    instructions: Array<Instruction>
    _completed: Array<number>
    _failed: Array<number>

    constructor(sftp: SFTPWrapper, instructions: Array<Instruction>) {
        this.sftp = sftp
        this.instructions = instructions
        this._completed = []
        this._failed = []
    }

    /**
     * 
     * @param {SSHClient} client ssh2 "Client" instance
     * @param {UploadConfig} config ssh credentials and upload configuration
     * @returns {Promise<UploadQueue>} UploadQueue instance
     */
    static createUploadQueue(client: SSHClient, config: UploadConfig): Promise<UploadQueue> {
        return new Promise((resolve, reject) => {
            client.on(SFTPEvents.READY, () => {
                client.sftp(async (e, sftp) => {
                    if (e) {
                        console.error(`Client :: ${e}`)
                        reject(e)
                    } else {
                        console.error(`Client :: connected`)
                        resolve(new UploadQueue(sftp, this.parseFiles(config.files)))
                    }
                });
            }).connect(config);

        })
    }

    /**
     * 
     * @param {string} files String representation of all files and directories to upload. 
     * @returns {Array<Instructions>} Upload instructions for UploadQueue
     */
    static parseFiles(files: string): Array<Instruction> {
        return files.split(/\n/)
            .map((s) => s.trim())
            .filter((s) => s)
            .map((s, i) => {
                const m = s.trim().match(pattern)
                const { source, target } = m.groups
                if (m && source && target) {
                    console.info(`Parse :: source: ${source} \t target: ${target}`)
                    return { source, target }
                } else if (m && !source && !target) {
                    console.info(`Parse :: source: ${m[0]} \t target: ${m[0]}`)
                    return { source: m[0], target: m[0] }
                } else {
                    throw new Error(`Could not match line ${i}: ${s}`)
                }

            })
    }

    /**
     * 
     * @param {string} target The target location of a file to be uploaded
     * @returns {string} The target directory location of the file
     */
    static getTargetDirectory(target: string): string | undefined {
        const p = /^[\w\/]+(?=\/)/
        const m = target.match(p)
        return m ? m[0] : undefined
    }

    /**
     * 
     * @param {string} path The path to match with
     * @param {Array<string>} paths Array of paths to match against 
     * @returns {string} The longest matching path
     */
    static getLongestMatch(path: string, paths: Array<string>): string {
        const { m } = paths.reduce((a, p) => {
            const m = path.match(p)
            if (m) {
                const n = p.split('/').length
                return n > a.n ? { n, m: m[0] } : a
            }
            return a
        }, { n: 0, m: '' })
        return m
    }

    /**
     * 
     * @param {string} path Path to split
     * @returns {Array<string>} Paths to each directory leading up to the specified directory
     */
    static splitPath(path: string): Array<string> {
        const [first, ...rest] = path.split('/')
        const { paths } = rest.reduce(({ paths, previous }, current) => {
            const path = `${previous}/${current}`
            return {
                paths: [...paths, path],
                previous: path
            }
        }, { paths: [first], previous: first })
        return paths.filter((s) => s)
    }

    /**
     * 
     * @param {string} a Path to subtract from
     * @param {string} b Path to subtract with
     * @returns {string} The result of subtraction
     */
    static subPath(a: string, b: string) {
        const p = RegExp(`^${b}`)
        const m = p.test(a)
        return m && b ? a.replace(RegExp(`^${b}`), '').replace(/^\//, '') : a
    }

    /**
     * 
     * @param {Instruction} instruction Instruction of how to copy source files to a target location on the remote host
     * @returns {Promise<void>}
     */
    upload(instruction: Instruction): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sftp.fastPut(
                instruction.source,
                instruction.target,
                {},
                (e) => {
                    if (e) {
                        console.error(`Upload :: ${instruction.source} :: ${e}`)
                        reject()
                    } else {
                        console.info(`Upload :: ${instruction.source} :: complete`)
                        resolve()
                    }
                }
            )
        })
    }

    /**
     * 
     * @param {string} path Path to test
     * @returns {boolean}
     */
    async exist(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.sftp.exists(path, (e) => {
                if (e) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        })
    }

    /**
     * 
     * @param {string} path Path to create on the remote host. The parent location must exist.
     * @returns {Promise<void>}
     */
    async mkdir(path: string): Promise<void> {
        console.info(`Mkdir :: ${path}`)
        return new Promise((resolve, reject) => {
            if (!path) {
                reject(new Error(`Mkdir :: Malformed directory path "${path}"`))
            }
            this.sftp.mkdir(path, (e) => {
                if (e) {
                    console.error(e)
                    reject(e)
                } else {
                    resolve()
                }
            })
        })
    }

    /**
     * 
     * @param {Array<string>} paths Paths to create, must be in order from parent to child
     * @returns {void}
     */
    async recvMkdir(paths: Array<string>): Promise<void> {
        const [current, ...rest] = paths
        const exist = await this.exist(current)
        if (!exist) {
            await this.mkdir(current)
        }
        if (rest.length > 0) {
            await this.recvMkdir(rest)
        }
        return
    }

    /**
     * 
     * @param {Instruction} instruction Instruction of how to copy source files to a target location on the remote host
     * @param {Array<string>} [exists=[]] Accumulator of created directories
     * @returns {Promise<void>}
     */
    async recvUpload({ source, target }: Instruction, exists: Array<string> = []): Promise<void> {
        const stat = statSync(source)
        if (stat.isDirectory()) {
            const exist = await this.exist(target)
            if (!exist) {
                await this.mkdir(target)
            }
            return await readdirSync(source).reduce((pending, file) =>
                pending.then(() => this.recvUpload({
                    source: `${source}/${file}`,
                    target: `${target}/${file}`
                }, [...exists, target])),
                Promise.resolve()
            );
        } else {
            // TODO - clean this up. Perhaps one or a few additional helper functions?
            const dir = UploadQueue.getTargetDirectory(target)
            const ext = UploadQueue.getLongestMatch(dir, exists)
            const cre = UploadQueue.subPath(dir, ext)
            const make = UploadQueue.splitPath(cre)
            // ENDOF TOOD

            if (make.length > 0) {
                await this.recvMkdir(make)
            }
            await this.upload({
                source,
                target
            })
        }
    }

    /**
     * 
     * @param {Array<Instruction>} instructions Instruction of how to copy source files to a target location on the remote host
     * @returns {Promise<void>}
     */
    async uploadAll(instructions: Array<Instruction>): Promise<void> {
        return await instructions.reduce((pending, instruction) =>
            pending.then(() => this.recvUpload(instruction)),
            Promise.resolve()
        );
    }
}


