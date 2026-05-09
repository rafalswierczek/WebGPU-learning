export class BufferDescriptor implements GPUBufferDescriptor
{
    public readonly label: string;
    public readonly size: GPUSize64;
    public readonly usage: GPUBufferUsageFlags;
    public readonly mappedAtCreation: boolean;

    public constructor (
        label: string,
        size: GPUSize64,
        usage: GPUBufferUsageFlags,
        mappedAtCreation: boolean,
    ) {
        this.label = label;
        this.size = size;
        this.usage = usage;
        this.mappedAtCreation = mappedAtCreation;
    }
}
