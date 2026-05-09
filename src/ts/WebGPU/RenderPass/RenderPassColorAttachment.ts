export class RenderPassColorAttachment implements GPURenderPassColorAttachment
{
    public readonly view: GPUTexture|GPUTextureView;
    public readonly loadOp: GPULoadOp;
    public readonly storeOp: GPUStoreOp;
    public readonly clearValue: GPUColor;
    public readonly depthSlice?: GPUIntegerCoordinate;
    public readonly resolveTarget?: GPUTexture|GPUTextureView;

    public constructor(
        view: GPUTexture|GPUTextureView,
        loadOp: GPULoadOp = 'clear', // clear view on each frame
        storeOp: GPUStoreOp = 'store', // keep texture after rendering
        clearValue: GPUColor = { r: 1, g: 0, b: 0, a: 1 },
        depthSlice?: GPUIntegerCoordinate,
        resolveTarget?: GPUTexture|GPUTextureView,
        
    ) {
        this.view = view;
        this.loadOp = loadOp;
        this.storeOp = storeOp;
        this.clearValue = clearValue;
        this.depthSlice = depthSlice;
        this.resolveTarget = resolveTarget;
    }
}
