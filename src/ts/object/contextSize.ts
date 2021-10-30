export class ContextSize implements GPUExtent3DDict {
    public width: GPUIntegerCoordinate;
    public height: GPUIntegerCoordinate;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
}