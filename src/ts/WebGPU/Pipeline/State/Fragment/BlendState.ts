export class BlendState implements GPUBlendState
{
    public readonly color: GPUBlendComponent;
    public readonly alpha: GPUBlendComponent;

    public constructor (
        color: GPUBlendComponent,
        alpha: GPUBlendComponent,
    ) {
        this.color = color;
        this.alpha = alpha;
    }
}
