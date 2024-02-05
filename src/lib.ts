import type { SFTPWrapper, ConnectConfig } from 'ssh2'
import type { Client as SSHClient } from 'ssh2'

interface Instruction {
    source: string,
    target: string
}

enum SFTPEvents {
    READY = 'ready'
}

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

    static createUploadQueue(client: SSHClient, config: ConnectConfig, instructions: Array<Instruction>): Promise<UploadQueue> {
        return new Promise((resolve, reject) => {
            client.on(SFTPEvents.READY, () => {
                client.sftp(async (e, sftp) => {
                    if (e) {
                        console.error(`Client :: ${e}`)
                        reject(e)
                    } else {
                        console.error(`Client :: connected`)
                        resolve(new UploadQueue(sftp, instructions))
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


