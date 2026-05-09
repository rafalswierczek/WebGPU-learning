import { TexelCopyTextureInfo } from "./TexelCopyTextureInfo";

export class CopyExternalImageDestInfo extends TexelCopyTextureInfo
{
    public readonly colorSpace?: PredefinedColorSpace;
    public readonly premultipliedAlpha?: boolean;

    public constructor(
        texture: GPUTexture,
        origin?: GPUOrigin3D, // {}
        mipLevel?: GPUIntegerCoordinate, // 0
        aspect?: GPUTextureAspect, // "all"
        colorSpace?: PredefinedColorSpace, // "srgb"
        premultipliedAlpha?: boolean, // false
    ) {
        super(texture, origin, mipLevel, aspect);
        
        this.colorSpace = colorSpace;
        this.premultipliedAlpha = premultipliedAlpha;
    }
}
