export class ShaderModuleCompilationHint implements GPUShaderModuleCompilationHint
{
    public readonly entryPoint: string;
    public readonly layout?: GPUPipelineLayout|GPUAutoLayoutMode;
    
    public constructor (
        entryPoint: string,
        layout?: GPUPipelineLayout|GPUAutoLayoutMode,
    ) {
        this.entryPoint = entryPoint;
        this.layout = layout;
    }
}
