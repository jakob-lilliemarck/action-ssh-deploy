import { Path } from "./path"

export class Instruction {
    private _source: Path
    private _target: Path

    static EXPLICIT = /^(:?source=)(?<source>(?<=source=)[\w\/\-\.]+)(:?,\s?target=)(?<target>(?<=target=)[\w\/\-\.]+)$/
    static IMPLICIT = /^[\w\/\-\.]+$/
    static UNION_PATTERN = RegExp([
        Instruction.EXPLICIT,
        Instruction.IMPLICIT
    ].map((re) => re.source).join("|"))

    constructor({ source, target }: { source: string | Path, target: string | Path }) {
        if (!(source && target)) {
            throw new Error(`Invalid instruction: ${JSON.stringify({ source, target }, null, 2)}`)
        }
        this._source = Instruction.ensurePath(source)
        this._target = Instruction.ensurePath(target)
    }

    get source() {
        return this._source
    }

    get target() {
        return this._target
    }

    private static ensurePath(repr: string | Path) {
        return repr instanceof Path ? repr : new Path(repr)
    }

    explodeTargetParent(): Array<Instruction> {
        return this.target.parent.explode().map((target) => new Instruction({
            source: this.source,
            target,
        }))
    }

    static fromString(repr: string): Array<Instruction> {
        return repr.split(/\n/)
            .map((s) => s.trim())
            .filter((s) => s)
            .map((s, i) => {
                const m = s.trim().match(Instruction.UNION_PATTERN)
                const { source, target } = m.groups
                if (m && source && target) {
                    return new Instruction({ source, target })
                } else if (m && !source && !target) {
                    return new Instruction({ source: m[0], target: m[0] })
                } else {
                    throw new Error(`Could not match line ${i}: ${s}`)
                }
            })
    }
}