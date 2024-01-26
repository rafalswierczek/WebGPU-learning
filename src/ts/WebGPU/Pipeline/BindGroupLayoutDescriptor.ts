export class BindGroupLayoutDescriptor implements GPUBindGroupLayoutDescriptor
{
    public label: string;

    public entries: Iterable<GPUBindGroupLayoutEntry>;
    
    public constructor (
        label: string,
        entries: Iterable<GPUBindGroupLayoutEntry>
    ) {
        this.label = label;
        this.entries = entries;
    }
}
