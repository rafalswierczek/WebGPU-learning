export class VertexBufferLayout implements GPUVertexBufferLayout
{
    public arrayStride: GPUSize64;

    public attributes: Iterable<GPUVertexAttribute>;

    public stepMode?: GPUVertexStepMode;

    public constructor (
        arrayStride: GPUSize64,
        attributes: Iterable<GPUVertexAttribute>,
        stepMode?: GPUVertexStepMode
    ) {
        this.arrayStride = arrayStride;
        this.attributes = attributes;
        this.stepMode = stepMode;
    }
}
