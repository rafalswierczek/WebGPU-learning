export class PrimitiveState implements GPUPrimitiveState
{
    public readonly topology?: GPUPrimitiveTopology;
    public readonly stripIndexFormat?: GPUIndexFormat;
    public readonly frontFace?: GPUFrontFace;
    public readonly cullMode?: GPUCullMode;
    public readonly unclippedDepth?: boolean;

    public constructor (
        topology?: GPUPrimitiveTopology, // "triangle-list",
        stripIndexFormat? : GPUIndexFormat, // only used for topologies: "line-strip" or "triangle-strip"
        frontFace?: GPUFrontFace, // "ccw",
        cullMode?: GPUCullMode, // "none",
        unclippedDepth?: boolean, // false, false = depth clipping is enabled, true = depth clipping is disabled
    ) {
        this.topology = topology;
        this.stripIndexFormat = stripIndexFormat;
        this.frontFace = frontFace;
        this.cullMode = cullMode;
        this.unclippedDepth = unclippedDepth;
    }
}
