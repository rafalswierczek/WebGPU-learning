export class DepthStencilState implements GPUDepthStencilState
{
    public readonly format: GPUTextureFormat;
    public readonly depthWriteEnabled?: boolean;
    public readonly depthCompare?: GPUCompareFunction;
    public readonly stencilFront?: GPUStencilFaceState;
    public readonly stencilBack?: GPUStencilFaceState;
    public readonly stencilReadMask?: GPUStencilValue;
    public readonly stencilWriteMask?: GPUStencilValue;
    public readonly depthBias?: GPUDepthBias;
    public readonly depthBiasSlopeScale?: number;
    public readonly depthBiasClamp?: number;

    public constructor (
        format: GPUTextureFormat,
        depthWriteEnabled?: boolean, // required only for "depth" format
        depthCompare?: GPUCompareFunction, // required only for "depth" format
        stencilFront?: GPUStencilFaceState, // {}
        stencilBack?: GPUStencilFaceState, // {}
        stencilReadMask?: GPUStencilValue, // 0xFFFFFFFF
        stencilWriteMask?: GPUStencilValue, // 0xFFFFFFFF
        depthBias?: GPUDepthBias, // 0
        depthBiasSlopeScale?: number, // 0
        depthBiasClamp?: number, // 0
    ) {
        this.format = format;
        this.depthWriteEnabled = depthWriteEnabled;
        this.depthCompare = depthCompare;
        this.stencilFront = stencilFront;
        this.stencilBack = stencilBack;
        this.stencilReadMask = stencilReadMask;
        this.stencilWriteMask = stencilWriteMask;
        this.depthBias = depthBias;
        this.depthBiasSlopeScale = depthBiasSlopeScale;
        this.depthBiasClamp = depthBiasClamp;
    }
}
