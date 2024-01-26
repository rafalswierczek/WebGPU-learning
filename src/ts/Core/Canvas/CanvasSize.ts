import { CanvasConfig } from "../../WebGPU/Config/CanvasConfig";

export class CanvasSize implements GPUExtent3DDict
{
    public width: GPUIntegerCoordinate;

    public height?: GPUIntegerCoordinate;
    
    public depthOrArrayLayers?: GPUIntegerCoordinate

    constructor(
        width: GPUIntegerCoordinate,
        height?: GPUIntegerCoordinate,
        depthOrArrayLayers?: GPUIntegerCoordinate
    ) {
        this.width = width;
        this.height = height;
        this.depthOrArrayLayers = depthOrArrayLayers;
    }

    public getWidth(): GPUIntegerCoordinate
    {
        return this.width;
    }

    public getHeight(): GPUIntegerCoordinate
    {
        return this.height || CanvasConfig.HEIGHT;
    }
}
