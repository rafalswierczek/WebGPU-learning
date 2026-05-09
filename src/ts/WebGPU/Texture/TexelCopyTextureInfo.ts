export class TexelCopyTextureInfo implements GPUTexelCopyTextureInfo
{
    public readonly texture: GPUTexture;
    public readonly origin?: GPUOrigin3D;
    public readonly mipLevel?: GPUIntegerCoordinate;
    public readonly aspect?: GPUTextureAspect;

    public constructor(
        texture: GPUTexture,
        origin?: GPUOrigin3D, // {}
        mipLevel?: GPUIntegerCoordinate, // 0
        aspect?: GPUTextureAspect, // "all"
    ) {
        this.texture = texture;
        this.origin = origin;
        this.mipLevel = mipLevel;
        this.aspect = aspect;
    }
}
