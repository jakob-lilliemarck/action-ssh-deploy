import { describe, expect, test } from '@jest/globals';
import { UploadQueue } from './lib'


describe('lib module', () => {
    test(
        'It parses the files-string',
        () => {
            const files = `
            files/test-1.txt
            source=files/test-2.txt,target=files/test-2.txt
            `
            expect(UploadQueue.parseFiles(files)).toEqual([
                { source: 'files/test-1.txt', target: 'files/test-1.txt' },
                { source: 'files/test-2.txt', target: 'files/test-2.txt' }
            ])
        }
    )

});