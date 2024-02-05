import { UploadQueue } from './lib';
import { setFailed, getInput } from '@actions/core';
import { Client } from 'ssh2';

const sshClient = new Client();

const main = async () => {
    try {
        const host = getInput("host");
        const username = getInput("username")
        const passphrase = getInput("password")
        const privateKey = getInput("privateKey")
        const files = getInput("files")

        const config = {
            host,
            port: 22,
            username,
            passphrase,
            privateKey
        }

        const queue = await UploadQueue.createUploadQueue(
            sshClient,
            config,
            files
        )

        await queue.uploadAll()

        sshClient.end()
    } catch (e) {
        setFailed(e.message);
    }
}

main()