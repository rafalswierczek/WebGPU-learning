export class BindGroupLayoutDescriptor implements GPUBindGroupLayoutDescriptor
{
    public readonly label: string;
    public readonly entries: GPUBindGroupLayoutEntry[];
    
    public constructor (
        label: string,
        entries: GPUBindGroupLayoutEntry[],
    ) {
        this.label = label;
        this.entries = entries;
    }
}
