export class VertexAttribute implements GPUVertexAttribute
{
    public readonly format: GPUVertexFormat;
    public readonly offset: GPUSize64;
    public readonly shaderLocation: GPUIndex32;

    public constructor (
        format: GPUVertexFormat,
        offset: GPUSize64,
        shaderLocation: GPUIndex32,
    ) {
        this.format = format;
        this.offset = offset;
        this.shaderLocation = shaderLocation;
    }
}
