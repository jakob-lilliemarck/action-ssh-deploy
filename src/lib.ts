import type { SFTPWrapper } from 'ssh2'

interface Instruction {
    source: string,
    target: string
}

export class UploadQueue {
    instructions: Array<Instruction>
    _completed: Array<number>
    _failed: Array<number>

    constructor(instructions) {
        this.instructions = instructions
        this._completed = []
        this._failed = []
    }

    upload(sftp: SFTPWrapper, { source, target }: Instruction, i: number) {
        return new Promise((resolve, reject) => {
            sftp.fastPut(
                source,
                target,
                {},
                (e) => {
                    if (e) {
                        this._failed.push(i)
                        reject(i)
                    } else {
                        this._completed.push(i)
                        resolve(i)
                    }
                }
            )
        })
    }

    async send(sftp: SFTPWrapper) {
        return Promise.all(this.instructions.map((instruction, i) => this.upload(sftp, instruction, i)))
    }
}
