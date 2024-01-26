export class BufferDescriptor implements GPUBufferDescriptor
{
    public label: string;

    public size: GPUSize64;

    public usage: GPUBufferUsageFlags;
    
    public mappedAtCreation: boolean;

    public constructor (
        label: string,
        size: GPUSize64,
        usage: GPUBufferUsageFlags,
        mappedAtCreation: boolean = true
    ) {
        this.label = label;
        this.size = size;
        this.usage = usage;
        this.mappedAtCreation = mappedAtCreation;
    }
}
