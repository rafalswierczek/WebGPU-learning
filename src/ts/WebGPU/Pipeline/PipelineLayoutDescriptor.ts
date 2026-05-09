export class PipelineLayoutDescriptor implements GPUPipelineLayoutDescriptor
{
    public readonly label: string;
    public readonly bindGroupLayouts: (GPUBindGroupLayout|null)[];
    
    public constructor (
        label: string,
        bindGroupLayouts: (GPUBindGroupLayout|null)[],
    ) {
        this.label = label;
        this.bindGroupLayouts = bindGroupLayouts;
    }
}
