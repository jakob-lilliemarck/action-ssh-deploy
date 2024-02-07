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

    test(
        'It returns the longest matching path',
        () => {
            const paths = [
                'foo',
                'foo/bar',
                'foo/bar/baz',
                'bar',
                'bar/foo',
                'bar/foo/baz',
                'baz',
                'baz/bar',
                'baz/bar/foo'
            ]
            expect(UploadQueue.getLongestMatch('foo/bar/baz/spam', paths)).toEqual('foo/bar/baz')
        }
    )

    test(
        'It returns all of the paths from the base',
        () => {
            expect(UploadQueue.splitPath('foo/bar/baz')).toEqual([
                'foo',
                'foo/bar',
                'foo/bar/baz'
            ])
        }
    )

    test(
        'It "subtracts" path a from path b',
        () => {
            expect(UploadQueue.subPath('foo', 'foo/bar/baz')).toEqual('foo')
            expect(UploadQueue.subPath('foo', '/foo/bar/baz')).toEqual('foo')
            expect(UploadQueue.subPath('foo/bar/baz', 'foo/bar')).toEqual('baz')
            expect(UploadQueue.subPath('foo/bar/baz', '/foo/bar')).toEqual('foo/bar/baz')
            expect(UploadQueue.subPath('/foo/bar/baz', '/foo/bar')).toEqual('baz')
            expect(UploadQueue.subPath('/foo/bar/baz', 'foo/bar')).toEqual('/foo/bar/baz')
        }
    )

});