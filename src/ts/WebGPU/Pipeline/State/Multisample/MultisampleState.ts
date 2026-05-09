export class MultisampleState implements GPUMultisampleState
{
    public readonly count?:  GPUSize32;
    public readonly mask?: GPUSampleMask;
    public readonly alphaToCoverageEnabled?: boolean;

    public constructor (
        count?:  GPUSize32, // 1
        mask?: GPUSampleMask, // 0xFFFFFFFF
        alphaToCoverageEnabled?: boolean, // false
    ) {
        this.count = count;
        this.mask = mask;
        this.alphaToCoverageEnabled = alphaToCoverageEnabled;
    }
}
