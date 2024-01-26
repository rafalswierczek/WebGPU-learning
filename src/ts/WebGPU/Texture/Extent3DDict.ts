export class Extent3DDict implements GPUExtent3DDict
{
    public width: GPUIntegerCoordinate;
    public height: GPUIntegerCoordinate;
    public depthOrArrayLayers: GPUIntegerCoordinate;

    public constructor(
        width: GPUIntegerCoordinate,
        height: GPUIntegerCoordinate,
        depthOrArrayLayers: GPUIntegerCoordinate = 1
    ) {
        this.width = width;
        this.height = height;
        this.depthOrArrayLayers = depthOrArrayLayers;
    }
}
