import { BufferDescriptor } from "../../WebGPU/Buffer/BufferDescriptor";

export class MasterBufferDescriptor extends BufferDescriptor
{
    private readonly allowedUsages: Array<GPUBufferUsageFlags> = [
        GPUBufferUsage.INDEX,
        GPUBufferUsage.VERTEX,
        GPUBufferUsage.STORAGE,
        GPUBufferUsage.UNIFORM,
    ];

    public constructor (
        label: string,
        size: GPUSize64,
        usage: GPUBufferUsageFlags,
    ) {
        super(label, size, usage, false);
        
        if (this.allowedUsages.includes(usage) === false) {
            throw new Error('Master buffer was set with wrong usage');
        }
    }
}
