export class TextureViewDescriptor implements GPUTextureViewDescriptor
{
    public label: string;

    public format: GPUTextureFormat;

    public dimension: GPUTextureViewDimension;

    public aspect: GPUTextureAspect;

    public baseMipLevel: GPUIntegerCoordinate;

    public mipLevelCount: GPUIntegerCoordinate;

    public baseArrayLayer: GPUIntegerCoordinate;

    public arrayLayerCount: GPUIntegerCoordinate;

    public constructor (
        label: string,
        format: GPUTextureFormat,
        dimension: GPUTextureViewDimension = "2d",
        aspect: GPUTextureAspect = "all",
        baseMipLevel: GPUIntegerCoordinate = 0,
        mipLevelCount: GPUIntegerCoordinate = 0,
        baseArrayLayer: GPUIntegerCoordinate = 0,
        arrayLayerCount: GPUIntegerCoordinate = 0
    ) {
        this.label = label;
        this.format = format;
        this.dimension = dimension;
        this.aspect = aspect;
        this.baseMipLevel = baseMipLevel;
        this.mipLevelCount = mipLevelCount;
        this.baseArrayLayer = baseArrayLayer;
        this.arrayLayerCount = arrayLayerCount;
    }
}
