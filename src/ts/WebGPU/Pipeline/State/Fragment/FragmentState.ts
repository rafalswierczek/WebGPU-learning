import { ProgrammableStage } from "../Compute/ProgrammableStage";

export class FragmentState extends ProgrammableStage implements GPUFragmentState
{
    public readonly targets: (GPUColorTargetState|null)[];

    public constructor (
        module: GPUShaderModule,
        entryPoint: string,
        targets: (GPUColorTargetState|null)[],
        constants?: Record<string, number>,
    ) {
        super(module, entryPoint, constants);

        this.targets = targets;
    }
}
