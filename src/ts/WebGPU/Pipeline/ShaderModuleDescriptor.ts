export class ShaderModuleDescriptor implements GPUShaderModuleDescriptor
{
    public label: string;

    public code: string;

    public sourceMap?: object;

    public hints?: Record<string, GPUShaderModuleCompilationHint>;
    
    public constructor (
        label: string,
        code: string,
        sourceMap?: object,
        hints?: Record<string, GPUShaderModuleCompilationHint>
    ) {
        this.label = label;
        this.code = code;
        this.sourceMap = sourceMap;
        this.hints = hints;
    }
}
