import { ProgrammableStage } from "./ProgrammableStage";

export class VertexState extends ProgrammableStage implements GPUVertexState
{
    public buffers: Iterable<GPUVertexBufferLayout>;

    public constructor (
        module: GPUShaderModule,
        entryPoint: string,
        buffers: Iterable<GPUVertexBufferLayout> = [],
        constants?: Record<string, number>
    ) {
        super(module, entryPoint, constants);

        this.buffers = buffers;
    }
}
