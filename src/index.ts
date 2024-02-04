import { readFileSync } from 'fs';
import { Client } from 'ssh2'
import { UploadQueue } from './lib';

const client = new Client();

// Directories must exist on the host
const instructions = [
    { source: 'files/file1.txt', target: 'files/test1.txt' },
    { source: 'files/file2.txt', target: 'files/test2.txt' }
]

export const execute = () => new Promise((resolve, reject) => {
    client.on('ready', () => {
        client.sftp(async (err, sftp) => {
            if (err) {
                reject(err);
            }
            const queue = new UploadQueue(instructions)
            await queue.send(sftp)
            client.end()
            resolve(0)
        });
    }).connect({
        host: '46.101.214.163',
        port: 22,
        username: 'root',
        privateKey: readFileSync('/home/jakob/.ssh/id_rsa')
    });
})

await execute()