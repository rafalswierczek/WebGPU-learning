export class BlendComponent implements GPUBlendComponent
{
    public readonly operation?: GPUBlendOperation;
    public readonly srcFactor?: GPUBlendFactor;
    public readonly dstFactor?: GPUBlendFactor;

    public constructor (
        operation?: GPUBlendOperation, // "add"
        srcFactor?: GPUBlendFactor, // "one"
        dstFactor?: GPUBlendFactor, // "zero"
    ) {
        this.operation = operation;
        this.srcFactor = srcFactor;
        this.dstFactor = dstFactor;
    }
}
