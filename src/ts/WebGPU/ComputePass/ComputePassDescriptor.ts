export class ComputePassDescriptor implements GPUComputePassDescriptor
{
    public readonly label: string;
    public readonly timestampWrites?: GPURenderPassTimestampWrites;
    
    public constructor(
        label: string,
        timestampWrites?: GPURenderPassTimestampWrites,
    ) {
        this.label = label;
        this.timestampWrites = timestampWrites;
    }
}
