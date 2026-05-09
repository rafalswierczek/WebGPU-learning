export class TextureBindingLayout implements GPUTextureBindingLayout
{
    public readonly sampleType?: GPUTextureSampleType;
    public readonly viewDimension?: GPUTextureViewDimension;
    public readonly multisampled?: boolean;

    public constructor (
        sampleType?: GPUTextureSampleType, // "float"
        viewDimension?: GPUTextureViewDimension, // "2d"
        multisampled?: boolean, // false
    ) {
        this.sampleType = sampleType;
        this.viewDimension = viewDimension;
        this.multisampled = multisampled;
    }
}
