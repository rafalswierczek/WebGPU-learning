export class RenderPassTimestampWrites implements GPURenderPassTimestampWrites
{
    public readonly querySet: GPUQuerySet;
    public readonly beginningOfPassWriteIndex?: GPUSize32;
    public readonly endOfPassWriteIndex?: GPUSize32;
    
    public constructor(
        querySet: GPUQuerySet,
        beginningOfPassWriteIndex?: GPUSize32,
        endOfPassWriteIndex?: GPUSize32,
    ) {
        this.querySet = querySet;
        this.beginningOfPassWriteIndex = beginningOfPassWriteIndex;
        this.endOfPassWriteIndex = endOfPassWriteIndex;
    }
}
