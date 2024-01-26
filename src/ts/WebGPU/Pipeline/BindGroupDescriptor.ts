export class BindGroupDescriptor implements GPUBindGroupDescriptor
{
    public label: string;

    public layout: GPUBindGroupLayout;

    public entries: Iterable<GPUBindGroupEntry>;
    
    public constructor (
        label: string,
        layout: GPUBindGroupLayout,
        entries: Iterable<GPUBindGroupEntry>
    ) {
        this.label = label;
        this.layout = layout;
        this.entries = entries;
    }
}
