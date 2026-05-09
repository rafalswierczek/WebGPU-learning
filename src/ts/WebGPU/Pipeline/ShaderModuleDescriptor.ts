export class ShaderModuleDescriptor implements GPUShaderModuleDescriptor
{
    public readonly label: string;
    public readonly code: string;
    public readonly compilationHints?: GPUShaderModuleCompilationHint[];
    
    public constructor (
        label: string,
        code: string,
        compilationHints?: GPUShaderModuleCompilationHint[], // []
    ) {
        this.label = label;
        this.code = code;
        this.compilationHints = compilationHints;
    }
}
