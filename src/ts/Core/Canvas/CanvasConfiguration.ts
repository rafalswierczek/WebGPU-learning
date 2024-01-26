export class CanvasConfiguration implements GPUCanvasConfiguration
{
    public device: GPUDevice;

    public format: GPUTextureFormat;

    public usage?: GPUTextureUsageFlags;

    public viewFormats?: Iterable<GPUTextureFormat>;

    public colorSpace?: PredefinedColorSpace;
    
    public alphaMode?: GPUCanvasAlphaMode;

    constructor(
        device: GPUDevice,
        format: GPUTextureFormat,
        usage?: GPUTextureUsageFlags,
        viewFormats?: Iterable<GPUTextureFormat>,
        colorSpace?: PredefinedColorSpace,
        alphaMode?: GPUCanvasAlphaMode
    ) {
        this.device = device;
        this.format = format;
        this.usage = usage;
        this.viewFormats = viewFormats;
        this.colorSpace = colorSpace;
        this.alphaMode = alphaMode;
    }
}
