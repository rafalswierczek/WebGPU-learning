export class QuerySetDescriptor implements GPUQuerySetDescriptor
{
    public readonly label: string;
    public readonly type: GPUQueryType;
    public readonly count: GPUSize32;
    
    public constructor(
        label: string,
        type: GPUQueryType,
        count: GPUSize32,
    ) {
        this.label = label;
        this.type = type;
        this.count = count;
    }
}
