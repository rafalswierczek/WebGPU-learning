export class CanvasConfiguration implements GPUCanvasConfiguration {
    public device: GPUDevice;
    public format: GPUTextureFormat;
    public usage?: GPUTextureUsageFlags;
    public colorSpace?: GPUPredefinedColorSpace;
    public compositingAlphaMode?: GPUCanvasCompositingAlphaMode;
    public size?: GPUExtent3D;

    constructor(
        device: GPUDevice,
        format: GPUTextureFormat,
        size?: GPUExtent3D,
        usage?: GPUTextureUsageFlags,
        colorSpace?: GPUPredefinedColorSpace,
        compositingAlphaMode?: GPUCanvasCompositingAlphaMode
    ) {
        this.device = device;
        this.format = format;
        this.size = size;
        this.usage = usage;
        this.colorSpace = colorSpace;
        this.compositingAlphaMode = compositingAlphaMode;
    }
}