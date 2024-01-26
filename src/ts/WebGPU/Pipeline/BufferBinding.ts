export class BufferBinding implements GPUBufferBinding
{
    public buffer: GPUBuffer;

    public offset?: GPUSize64;

    public size?: GPUSize64;

    public constructor (
        buffer: GPUBuffer,
        offset?: GPUSize64,
        size?: GPUSize64
    ) {
        this.buffer = buffer;
        this.offset = offset;
        this.size = size;
    }
}
