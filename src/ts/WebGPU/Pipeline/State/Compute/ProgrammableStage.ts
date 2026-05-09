export class ProgrammableStage implements GPUProgrammableStage
{
    public readonly module: GPUShaderModule;
    public readonly entryPoint: string;
    public readonly constants?: Record<string, number>;

    public constructor (
        module: GPUShaderModule,
        entryPoint: string,
        constants?: Record<string, number>, // {}
    ) {
        this.module = module;
        this.entryPoint = entryPoint;
        this.constants = constants;
    }
}
