export class SamplerBindingLayout implements GPUSamplerBindingLayout
{
    public type: GPUSamplerBindingType;

    public constructor (type: GPUSamplerBindingType = "filtering")
    {
        this.type = type;
    }
}
