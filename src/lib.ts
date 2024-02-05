import type { SFTPWrapper, ConnectConfig } from 'ssh2'
import type { Client as SSHClient } from 'ssh2'

interface Instruction {
    source: string,
    target: string
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

    static createUploadQueue(client: SSHClient, config: ConnectConfig, files: string): Promise<UploadQueue> {
        return new Promise((resolve, reject) => {
            client.on(SFTPEvents.READY, () => {
                client.sftp(async (e, sftp) => {
                    if (e) {
                        console.error(`Client :: ${e}`)
                        reject(e)
                    } else {
                        console.error(`Client :: connected`)
                        resolve(new UploadQueue(sftp, this.parseFiles(files)))
                    }
                });
            }).connect(config);

        })
    }

    private _upload(instruction: Instruction, i: number) {
        return new Promise((resolve, reject) => {
            console.info(`Upload :: ${instruction.source} :: started`)
            this.sftp.fastPut(
                instruction.source,
                instruction.target,
                {},
                (e) => {
                    if (e) {
                        this._failed.push(i)
                        console.error(`Upload :: ${instruction.source} :: ${e}`)
                        reject(i)
                    } else {
                        this._completed.push(i)
                        console.info(`Upload :: ${instruction.source} :: complete`)
                        resolve(i)
                    }
                }
            )
        })
    }

    async uploadAll() {
        return this.instructions.reduce((pending, instruction, i) =>
            pending.then(() => this._upload(instruction, i)),
            Promise.resolve()
        );
    }
}


