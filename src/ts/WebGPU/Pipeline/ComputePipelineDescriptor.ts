export class ComputePipelineDescriptor implements GPUComputePipelineDescriptor
{
    public label: string;
    
    public compute: GPUProgrammableStage;

    public layout: GPUPipelineLayout|GPUAutoLayoutMode;

    public constructor (
        label: string,
        compute: GPUProgrammableStage,
        layout: GPUPipelineLayout|GPUAutoLayoutMode
    ) {
        this.label = label;
        this.compute = compute;
        this.layout = layout;
    }
}
