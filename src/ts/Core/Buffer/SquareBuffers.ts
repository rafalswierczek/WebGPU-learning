export class SquareBuffers
{
    public vertexBuffer: GPUBuffer;

    public indexBuffer: GPUBuffer;

    public constructor(vertexBuffer: GPUBuffer, indexBuffer: GPUBuffer)
    {
        this.vertexBuffer = vertexBuffer;
        this.indexBuffer = indexBuffer;
    }
}
