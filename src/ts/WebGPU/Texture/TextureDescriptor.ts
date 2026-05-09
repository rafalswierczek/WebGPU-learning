export class TextureDescriptor implements GPUTextureDescriptor
{
    public readonly label: string;
    public readonly size: GPUExtent3D;
    public readonly format: GPUTextureFormat;
    public readonly usage: GPUTextureUsageFlags;
    public readonly sampleCount?: GPUSize32;
    public readonly mipLevelCount?: GPUIntegerCoordinate;
    public readonly dimension?: GPUTextureDimension;
    public readonly viewFormats?: GPUTextureFormat[];
    public readonly textureBindingViewDimension?: GPUTextureViewDimension;

    public constructor (
        label: string,
        size: GPUExtent3D,
        format: GPUTextureFormat,
        usage: GPUTextureUsageFlags,
        sampleCount?: GPUSize32, // 1
        mipLevelCount?: GPUIntegerCoordinate, // 1
        dimension?: GPUTextureDimension, // "2d"
        viewFormats?: GPUTextureFormat[], // []
        textureBindingViewDimension?: GPUTextureViewDimension,
    ) {
        this.label = label;
        this.size = size;
        this.format = format;
        this.usage = usage;
        this.sampleCount = sampleCount;
        this.mipLevelCount = mipLevelCount;
        this.dimension = dimension;
        this.viewFormats = viewFormats;
        this.textureBindingViewDimension = textureBindingViewDimension;
    }
}
