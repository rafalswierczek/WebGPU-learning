export class VertexBufferLayout implements GPUVertexBufferLayout
{
    public readonly arrayStride: GPUSize64;
    public readonly attributes: GPUVertexAttribute[];
    public readonly stepMode?: GPUVertexStepMode;

    public constructor (
        arrayStride: GPUSize64,
        attributes: GPUVertexAttribute[],
        stepMode?: GPUVertexStepMode, // "vertex"
    ) {
        this.arrayStride = arrayStride;
        this.attributes = attributes;
        this.stepMode = stepMode;
    }
}
