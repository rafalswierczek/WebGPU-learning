export class ProgrammableStage implements GPUProgrammableStage
{
    public module: GPUShaderModule;
    
    public entryPoint: string;

    public constants?: Record<string, number>;

    public constructor (
        module: GPUShaderModule,
        entryPoint: string,
        constants?: Record<string, number>
    ) {
        this.module = module;
        this.entryPoint = entryPoint;
        this.constants = constants;
    }
}
