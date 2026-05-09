export class Extent3DDict implements GPUExtent3DDict
{
    public readonly width: GPUIntegerCoordinate;
    public readonly height?: GPUIntegerCoordinate;
    public readonly depthOrArrayLayers?: GPUIntegerCoordinate;

    public constructor(
        width: GPUIntegerCoordinate,
        height?: GPUIntegerCoordinate, // 1
        depthOrArrayLayers?: GPUIntegerCoordinate, // 1
    ) {
        this.width = width;
        this.height = height;
        this.depthOrArrayLayers = depthOrArrayLayers;
    }
}
