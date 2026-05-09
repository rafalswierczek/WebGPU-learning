export class RenderPassDescriptor implements GPURenderPassDescriptor
{
    public readonly label: string;
    public readonly colorAttachments: (GPURenderPassColorAttachment|null)[];
    public readonly depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
    public readonly occlusionQuerySet?: GPUQuerySet;
    public readonly timestampWrites?: GPURenderPassTimestampWrites;
    public readonly maxDrawCount?: GPUSize64;
    
    public constructor(
        label: string,
        colorAttachments: (GPURenderPassColorAttachment|null)[],
        depthStencilAttachment?: GPURenderPassDepthStencilAttachment,
        occlusionQuerySet?: GPUQuerySet,
        timestampWrites?: GPURenderPassTimestampWrites,
        maxDrawCount?: GPUSize64, // 50000000
    ) {
        this.label = label;
        this.colorAttachments = colorAttachments;
        this.depthStencilAttachment = depthStencilAttachment;
        this.occlusionQuerySet = occlusionQuerySet;
        this.timestampWrites = timestampWrites;
        this.maxDrawCount = maxDrawCount;
    }
}
