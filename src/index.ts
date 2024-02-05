import { UploadQueue } from './lib';
import { setFailed, getInput } from '@actions/core';
import { Client } from 'ssh2';
// import { readFileSync } from 'fs';

const sshClient = new Client();

const instructions = [
    { source: 'files/file-1.txt', target: 'files/test-1.txt' },
    { source: 'files/file-2.txt', target: 'files/test-2.txt' }
]

const main = async () => {
    try {
        const host = getInput("host");
        const username = getInput("username")
        const passphrase = getInput("password")
        const privateKey = getInput("privateKey")

        const config = {
            host,           // '46.101.214.163',
            port: 22,
            username,       // 'root',
            passphrase,     // 'test',
            privateKey      // readFileSync('/home/jakob/.ssh/gh_id')
        }

        const queue = await UploadQueue.createUploadQueue(sshClient, config, instructions)
        await queue.uploadAll()
        sshClient.end()
    } catch (e) {
        // console.error('err', e)
        setFailed(e.message);
    }
}

main()