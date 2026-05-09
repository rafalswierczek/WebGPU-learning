export class CanvasConfiguration implements GPUCanvasConfiguration
{
    public readonly device: GPUDevice;
    public readonly format: GPUTextureFormat;
    public readonly usage?: GPUTextureUsageFlags;
    public readonly viewFormats?: GPUTextureFormat[];
    public readonly colorSpace?: PredefinedColorSpace;
    public readonly toneMapping?: GPUCanvasToneMapping;
    public readonly alphaMode?: GPUCanvasAlphaMode;

    constructor(
        device: GPUDevice,
        format: GPUTextureFormat,
        usage?: GPUTextureUsageFlags, // 0x10, GPUTextureUsage.RENDER_ATTACHMENT
        viewFormats?: GPUTextureFormat[], // []
        colorSpace?: PredefinedColorSpace, // "srgb"
        toneMapping?: GPUCanvasToneMapping, // {}
        alphaMode?: GPUCanvasAlphaMode, // "opaque"
    ) {
        this.device = device;
        this.format = format;
        this.usage = usage;
        this.viewFormats = viewFormats;
        this.colorSpace = colorSpace;
        this.toneMapping = toneMapping;
        this.alphaMode = alphaMode;
    }
}
