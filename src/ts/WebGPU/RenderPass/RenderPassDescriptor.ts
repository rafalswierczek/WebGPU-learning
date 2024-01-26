export class RenderPassDescriptor implements GPURenderPassDescriptor
{
    public label: string;
    
    public colorAttachments: Iterable<GPURenderPassColorAttachment>;

    public depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
    
    public occlusionQuerySet?: GPUQuerySet;

    public timestampWrites: GPURenderPassTimestampWrites;

    public maxDrawCount: number;
    
    public constructor(
        label: string,
        colorAttachments: Iterable<GPURenderPassColorAttachment>,
        depthStencilAttachment?: GPURenderPassDepthStencilAttachment,
        occlusionQuerySet?: GPUQuerySet,
        timestampWrites: GPURenderPassTimestampWrites = [],
        maxDrawCount: number = 20000000
    ) {
        this.label = label;
        this.colorAttachments = colorAttachments;
        this.depthStencilAttachment = depthStencilAttachment;
        this.occlusionQuerySet = occlusionQuerySet;
        this.timestampWrites = timestampWrites;
        this.maxDrawCount = maxDrawCount;
    }
}
