import { describe, expect, test } from '@jest/globals';
import { Instruction } from './instruction'
import { Path } from './path'

describe(`Class::${Instruction.name}`, () => {
    test(`${Instruction.name}::fromString`, () => {
        expect(Instruction.fromString(`
            foo/bar.baz
            source=foo/bar.baz,target=baz/bar.foo`
        )).toEqual([
            { _source: new Path('foo/bar.baz'), _target: new Path('foo/bar.baz') },
            { _source: new Path('foo/bar.baz'), _target: new Path('baz/bar.foo') }
        ])
    })
});