import { CanvasConfig } from "./CanvasConfig";

export class TextureConfig
{
    static readonly WIDTH: GPUIntegerCoordinate = CanvasConfig.WIDTH;
    static readonly HEIGHT: GPUIntegerCoordinate = CanvasConfig.HEIGHT;
    static readonly USAGE: GPUTextureUsageFlags = CanvasConfig.USAGE;
    static readonly FORMAT: GPUTextureFormat = CanvasConfig.TEXTURE_FORMAT;
    static readonly SAMPLE_COUNT = 4;
}
