export class BindGroupLayoutEntry implements GPUBindGroupLayoutEntry
{
    public binding: GPUIndex32;
    
    public visibility: GPUShaderStageFlags;

    public buffer?: GPUBufferBindingLayout;

    public sampler?: GPUSamplerBindingLayout;

    public texture?: GPUTextureBindingLayout;

    public storageTexture?: GPUStorageTextureBindingLayout;

    public externalTexture?: GPUExternalTextureBindingLayout;

    public constructor (
        binding: GPUIndex32,
        visibility: GPUShaderStageFlags,
        buffer?: GPUBufferBindingLayout,
        sampler?: GPUSamplerBindingLayout,
        texture?: GPUTextureBindingLayout,
        storageTexture?: GPUStorageTextureBindingLayout,
        externalTexture?: GPUExternalTextureBindingLayout
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
