export class SamplerBindingLayout implements GPUSamplerBindingLayout
{
    public readonly type?: GPUSamplerBindingType;

    public constructor (
        type?: GPUSamplerBindingType, // "filtering",
    ) {
        this.type = type;
    }
}
