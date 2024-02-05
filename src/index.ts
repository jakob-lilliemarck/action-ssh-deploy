import { UploadQueue } from './lib';
import { getInput, setFailed } from '@actions/core';
import { Client as SSHClient } from 'ssh2'

const sshClient = new SSHClient();

const instructions = [
    { source: 'files/file1.txt', target: 'files/test1.txt' },
    { source: 'files/file2.txt', target: 'files/test2.txt' }
]

try {
    const host = getInput("host");
    const username = getInput("username")
    const password = getInput("password")
    const privateKey = getInput("privateKey")

    console.log(host)
    console.log(username)
    console.log(password)

    const config = {
        host,
        port: 22,
        username,
        password,
        privateKey
    }

    const queue = await UploadQueue.createUploadQueue(sshClient, config, instructions)
    await queue.uploadAll()
} catch (e) {
    setFailed(e.message);
}