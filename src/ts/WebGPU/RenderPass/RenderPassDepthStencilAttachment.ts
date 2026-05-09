export class RenderPassDepthStencilAttachment implements GPURenderPassDepthStencilAttachment
{
    public readonly view: GPUTexture|GPUTextureView;
    public readonly depthClearValue?: number;
    public readonly depthLoadOp?: GPULoadOp;
    public readonly depthStoreOp?: GPUStoreOp;
    public readonly depthReadOnly?: boolean;
    public readonly stencilClearValue?: GPUStencilValue;
    public readonly stencilLoadOp?: GPULoadOp;
    public readonly stencilStoreOp?: GPUStoreOp;
    public readonly stencilReadOnly?: boolean;
    
    public constructor(
        view: GPUTexture|GPUTextureView,
        depthClearValue?: number,
        depthLoadOp?: GPULoadOp,
        depthStoreOp?: GPUStoreOp,
        depthReadOnly?: boolean, // false,
        stencilClearValue?: GPUStencilValue, // 0,
        stencilLoadOp?: GPULoadOp,
        stencilStoreOp?: GPUStoreOp,
        stencilReadOnly?: boolean, // false
    ) {
        this.view = view;
        this.depthClearValue = depthClearValue;
        this.depthLoadOp = depthLoadOp;
        this.depthStoreOp = depthStoreOp;
        this.depthReadOnly = depthReadOnly;
        this.stencilClearValue = stencilClearValue;
        this.stencilLoadOp = stencilLoadOp;
        this.stencilStoreOp = stencilStoreOp;
        this.stencilReadOnly = stencilReadOnly;
    }
}
