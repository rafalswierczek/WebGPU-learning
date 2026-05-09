export class TextureViewDescriptor implements GPUTextureViewDescriptor
{
    public readonly label: string;
    public readonly format?: GPUTextureFormat;
    public readonly dimension?: GPUTextureViewDimension;
    public readonly usage?: GPUTextureUsageFlags;
    public readonly aspect?: GPUTextureAspect;
    public readonly baseMipLevel?: GPUIntegerCoordinate;
    public readonly mipLevelCount?: GPUIntegerCoordinate;
    public readonly baseArrayLayer?: GPUIntegerCoordinate;
    public readonly arrayLayerCount?: GPUIntegerCoordinate;

    public constructor (
        label: string,
        format?: GPUTextureFormat,
        dimension?: GPUTextureViewDimension,
        usage?: GPUTextureUsageFlags, // 0
        aspect?: GPUTextureAspect, // "all"
        baseMipLevel?: GPUIntegerCoordinate, // 0
        mipLevelCount?: GPUIntegerCoordinate,
        baseArrayLayer?: GPUIntegerCoordinate, // 0
        arrayLayerCount?: GPUIntegerCoordinate,
    ) {
        this.label = label;
        this.format = format;
        this.dimension = dimension;
        this.usage = usage;
        this.aspect = aspect;
        this.baseMipLevel = baseMipLevel;
        this.mipLevelCount = mipLevelCount;
        this.baseArrayLayer = baseArrayLayer;
        this.arrayLayerCount = arrayLayerCount;
    }
}
