export class StencilFaceState implements GPUStencilFaceState
{
    public readonly compare?: GPUCompareFunction;
    public readonly failOp?: GPUStencilOperation;
    public readonly depthFailOp?: GPUStencilOperation;
    public readonly passOp?: GPUStencilOperation;

    public constructor (
        compare?: GPUCompareFunction, // "always";
        failOp?: GPUStencilOperation, // "keep";
        depthFailOp?: GPUStencilOperation, // "keep";
        passOp?: GPUStencilOperation, // "keep";
    ) {
        this.compare = compare;
        this.failOp = failOp;
        this.depthFailOp = depthFailOp;
        this.passOp = passOp;
    }
}
