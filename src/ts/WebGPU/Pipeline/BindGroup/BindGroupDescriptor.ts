export class BindGroupDescriptor implements GPUBindGroupDescriptor
{
    public readonly label: string;
    public readonly layout: GPUBindGroupLayout;
    public readonly entries: GPUBindGroupEntry[];
    
    public constructor (
        label: string,
        layout: GPUBindGroupLayout,
        entries: GPUBindGroupEntry[],
    ) {
        this.label = label;
        this.layout = layout;
        this.entries = entries;
    }
}
