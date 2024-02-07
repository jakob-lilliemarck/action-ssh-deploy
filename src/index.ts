import { UploadQueue } from './lib';
import { setFailed, getInput } from '@actions/core';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import type { UploadConfig } from './lib';

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

const getMockedConfig = (): UploadConfig => ({
    host: '46.101.214.163',
    username: 'root',
    privateKey: readFileSync('/home/jakob/.ssh/gh_id'),
    passphrase: 'test',
    files: `
        files/nested1/nested2/test-4.txt
        files/nested1/test-3.txt
        files/test-1.txt
        files/test-2.txt
    `
})

const main = async () => {
    try {
        const config = getMockedConfig() // getUploadConfig()
        const queue = await UploadQueue.createUploadQueue(ssh, config)
        // TODO - absolute paths!
        await queue.uploadAll([
            { source: 'files', target: 'bar' },
            { source: 'files/test-1.txt', target: 'foo/bar/baz/test-1.txt' },
            { source: 'files/test-1.txt', target: '/foo/baz/bar/test-1.txt' }
        ])
        console.log(`Client :: closing connection`)
        ssh.end()
    } catch (e) {
        //setFailed(e.message);
    }
}

main()