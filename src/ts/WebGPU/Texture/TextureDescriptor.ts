export class TextureDescriptor implements GPUTextureDescriptor
{
    public label: string;

    public size: GPUExtent3DStrict;

    public format: GPUTextureFormat;

    public usage: GPUTextureUsageFlags;

    public sampleCount: GPUSize32;

    public mipLevelCount: GPUIntegerCoordinate;

    public dimension: GPUTextureDimension;

    public viewFormats: Iterable<GPUTextureFormat>;

    public constructor (
        label: string,
        size: GPUExtent3DStrict,
        format: GPUTextureFormat,
        usage: GPUTextureUsageFlags,
        sampleCount: GPUSize32 = 1,
        mipLevelCount: GPUIntegerCoordinate = 1,
        dimension: GPUTextureDimension = "2d",
        viewFormats: Iterable<GPUTextureFormat> = []
    ) {
        this.label = label;
        this.size = size;
        this.format = format;
        this.usage = usage;
        this.sampleCount = sampleCount;
        this.mipLevelCount = mipLevelCount;
        this.dimension = dimension;
        this.viewFormats = viewFormats;
    }
}
