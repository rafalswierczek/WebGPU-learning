export class ColorTargetState implements GPUColorTargetState
{
    public readonly format: GPUTextureFormat;
    public readonly blend?: GPUBlendState;
    public readonly writeMask?: GPUColorWriteFlags;

    public constructor (
        format: GPUTextureFormat,
        blend?: GPUBlendState,
        writeMask?: GPUColorWriteFlags, // GPUColorWrite.ALL (0xF)
    ) {
        this.format = format;
        this.blend = blend;
        this.writeMask = writeMask;
    }
}
