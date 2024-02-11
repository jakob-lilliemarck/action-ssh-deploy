import { describe, expect, test } from '@jest/globals';
import { Path } from './path'

describe(`Class::${Path.name}`, () => {
    test(`${Path.name}::path`, () => { })

    test(`${Path.name}::parent`, () => {
        expect(new Path('foo/bar/baz').parent).toEqual(new Path('foo/bar'))
        expect(new Path('foo').parent).toEqual(new Path('./'))
        expect(new Path('/foo').parent).toEqual(new Path('/'))
    })

    test(`${Path.name}::isAbsolute`, () => {
        expect(new Path('foo').isAbsolute).toBe(false)
        expect(new Path('/foo').isAbsolute).toBe(true)
    })

    test(`${Path.name}::explode`, () => {
        expect(new Path('foo/bar/baz').explode())
            .toEqual([
                new Path('foo'),
                new Path('foo/bar'),
                new Path('foo/bar/baz')
            ])
    })
});