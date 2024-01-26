import { ProgrammableStage } from "./ProgrammableStage";

export class FragmentState extends ProgrammableStage implements GPUFragmentState
{
    public targets: Iterable<GPUColorTargetState|null>;

    public constructor (
        module: GPUShaderModule,
        entryPoint: string,
        targets: Iterable<GPUColorTargetState|null>,
        constants?: Record<string, number>
    ) {
        super(module, entryPoint, constants);

        this.targets = targets;
    }
}
