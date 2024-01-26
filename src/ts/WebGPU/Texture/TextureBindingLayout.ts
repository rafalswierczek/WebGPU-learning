export class TextureBindingLayout implements GPUTextureBindingLayout
{
    public sampleType: GPUTextureSampleType;

    public viewDimension: GPUTextureViewDimension;

    public multisampled: boolean;

    public constructor (
        sampleType: GPUTextureSampleType = "float",
        viewDimension: GPUTextureViewDimension = "2d",
        multisampled: boolean = false
    ) {
        this.sampleType = sampleType;
        this.viewDimension = viewDimension;
        this.multisampled = multisampled;
    }
}
