export class Path {
    private _path: string
    private _parent: Path | undefined
    private _isAbsolute: boolean

    static absRoot = '/'
    static relRoot = './'
    static base = new Set([Path.absRoot, Path.relRoot])

    constructor(path: string) {
        const isAbsolute = /^\//.test(path)
        this._path = path
        this._isAbsolute = isAbsolute
        this._parent = Path.base.has(this._path) ? undefined : this.getParent(isAbsolute)
    }

    get path() {
        return this._path
    }

    get parent(): Path {
        return this._parent
    }

    get isAbsolute(): boolean {
        return this._isAbsolute
    }

    private getParent(isAbsolute) {
        const m = this.path.match(/^[\w\/]+(?=\/)/)
        const parent = m ? m[0] : isAbsolute ? Path.absRoot : Path.relRoot
        return new Path(parent)
    }

    explode(): Array<Path> {
        const [first, ...rest] = this.path.split('/')
        const { paths } = rest.reduce(({ paths, previous }, current) => {
            const repr = `${previous}/${current}`
            if (repr) {
                return { paths: [...paths, new Path(repr)], previous: repr }
            } else {
                return { paths, previous }
            }
        }, { paths: [new Path(first)], previous: first })
        return paths.filter(({ path }) => path)
    }
}