export class WorldSize {
    private _width: number|null = null;
    private _height: number|null = null;

    public get width(): number|null {
        return this._width;
    }

    public set width(width: number|null) {
        this._width = width;
    }

    public get height(): number|null {
        return this._height;
    }

    public set height(height: number|null) {
        this._height = height;
    }
}
