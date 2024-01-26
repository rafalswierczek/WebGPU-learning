export class VertexAttribute implements GPUVertexAttribute
{
    public format: GPUVertexFormat;

    public offset: GPUSize64;

    public shaderLocation: GPUIndex32;

    public constructor (
        format: GPUVertexFormat,
        offset: GPUSize64,
        shaderLocation: GPUIndex32
    ) {
        this.format = format;
        this.offset = offset;
        this.shaderLocation = shaderLocation;
    }
}
