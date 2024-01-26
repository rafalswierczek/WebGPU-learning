export class PipelineLayoutDescriptor implements GPUPipelineLayoutDescriptor
{
    public label: string;
    
    public bindGroupLayouts: Iterable<GPUBindGroupLayout>;
    
    public constructor (
        label: string,
        bindGroupLayouts: Iterable<GPUBindGroupLayout>
    ) {
        this.label = label;
        this.bindGroupLayouts = bindGroupLayouts;
    }
}
