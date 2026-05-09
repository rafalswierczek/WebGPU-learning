export class BindGroupLayoutEntry implements GPUBindGroupLayoutEntry
{
    public readonly binding: GPUIndex32;
    public readonly visibility: GPUShaderStageFlags;
    public readonly buffer?: GPUBufferBindingLayout;
    public readonly sampler?: GPUSamplerBindingLayout;
    public readonly texture?: GPUTextureBindingLayout;
    public readonly storageTexture?: GPUStorageTextureBindingLayout;
    public readonly externalTexture?: GPUExternalTextureBindingLayout;

    public constructor (
        binding: GPUIndex32,
        visibility: GPUShaderStageFlags,
        // pick one of the following (required):
        buffer?: GPUBufferBindingLayout,
        sampler?: GPUSamplerBindingLayout,
        texture?: GPUTextureBindingLayout,
        storageTexture?: GPUStorageTextureBindingLayout,
        externalTexture?: GPUExternalTextureBindingLayout,
    ) {
        this.binding = binding;
        this.visibility = visibility;
        this.buffer = buffer;
        this.sampler = sampler
        this.texture = texture;
        this.storageTexture = storageTexture;
        this.externalTexture = externalTexture;
    }
}
