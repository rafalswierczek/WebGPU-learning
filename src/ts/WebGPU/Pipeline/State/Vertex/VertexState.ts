import { ProgrammableStage } from "../Compute/ProgrammableStage";

export class VertexState extends ProgrammableStage implements GPUVertexState
{
    public readonly buffers?: (GPUVertexBufferLayout|null)[];

    public constructor (
        module: GPUShaderModule,
        entryPoint: string,
        buffers?: (GPUVertexBufferLayout|null)[], // []
        constants?: Record<string, number>, // {}
    ) {
        super(module, entryPoint, constants);

        this.buffers = buffers;
    }
}
