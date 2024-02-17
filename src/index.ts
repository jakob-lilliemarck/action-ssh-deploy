import { Queue } from './queue'
import type { UploadConfig } from './queue'
import { setFailed, getInput } from '@actions/core';
import { Client } from 'ssh2';

const ssh = new Client();

const getRequired = (key: string): string => {
    const input = getInput(key)
    if (!input) throw new Error(`Missing required input: "${key}"`)
    return input
}

const getUploadConfig = (): UploadConfig => {
    const host = getRequired("host");
    const username = getRequired("username")
    const privateKey = getRequired("privateKey")
    const files = getRequired("files")
    const passphrase = getInput("passphrase")

    return {
        host,
        username,
        privateKey,
        files,
        passphrase
    }
}

const main = async () => {
    try {
        const config = getUploadConfig()
        const queue = await Queue.createUploadQueue(ssh, config)
        await queue.uploadAll()
        console.log(`Client::closing connection`)
    } catch (e) {
        setFailed(e.message);
    }
}

main()