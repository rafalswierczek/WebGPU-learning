import { ColorConfig } from "../Config/ColorConfig";

export class RenderPassColorAttachment implements GPURenderPassColorAttachment
{
    public view: GPUTextureView;
    
    public loadOp: GPULoadOp;

    public storeOp: GPUStoreOp;

    public resolveTarget: GPUTextureView|undefined;

    public clearValue: GPUColor;

    public constructor(
        view: GPUTextureView,
        resolveTarget: GPUTextureView|undefined = undefined,
        loadOp: GPULoadOp = 'clear', // clear view on each frame
        storeOp: GPUStoreOp = 'store', // keep texture after rendering
        clearValue: GPUColor = ColorConfig.RED,
    ) {
        this.view = view;
        this.resolveTarget = resolveTarget;
        this.loadOp = loadOp;
        this.storeOp = storeOp;
        this.clearValue = clearValue;
    }
}
