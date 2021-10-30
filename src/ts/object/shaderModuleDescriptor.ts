export class ShaderModuleDescriptor implements GPUShaderModuleDescriptorWGSL {
    public code: string;
    public sourceMap?: object;

    constructor(code: string, sourceMap?: object) {
        this.code = code;
        this.sourceMap = sourceMap;
    }
}