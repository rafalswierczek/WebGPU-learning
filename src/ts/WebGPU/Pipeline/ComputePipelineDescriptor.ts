export class ComputePipelineDescriptor implements GPUComputePipelineDescriptor
{
    public readonly label: string;
    public readonly compute: GPUProgrammableStage;
    public readonly layout: GPUPipelineLayout|GPUAutoLayoutMode;

    public constructor (
        label: string,
        layout: GPUPipelineLayout|GPUAutoLayoutMode,
        compute: GPUProgrammableStage,
    ) {
        this.label = label;
        this.layout = layout;
        this.compute = compute;
    }
}
