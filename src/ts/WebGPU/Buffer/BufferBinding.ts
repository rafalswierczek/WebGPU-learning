export class BufferBinding implements GPUBufferBinding
{
    public readonly buffer: GPUBuffer;
    public readonly offset?: GPUSize64;
    public readonly size?: GPUSize64;

    public constructor (
        buffer: GPUBuffer,
        offset?: GPUSize64, // 0
        size?: GPUSize64, // If not provided, specifies the range starting at offset and ending at the end of buffer.
    ) {
        this.buffer = buffer;
        this.offset = offset;
        this.size = size;
    }
}
