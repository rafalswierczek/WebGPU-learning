export class BufferBindingLayout implements GPUBufferBindingLayout
{
    public readonly type?: GPUBufferBindingType;
    public readonly hasDynamicOffset?: boolean;
    public readonly minBindingSize?: GPUSize64;

    public constructor (
        type?: GPUBufferBindingType, // "uniform"
        hasDynamicOffset?: boolean, // false
        minBindingSize?: GPUSize64, // 0
    ) {
        this.type = type;
        this.hasDynamicOffset = hasDynamicOffset;
        this.minBindingSize = minBindingSize;
    }
}
