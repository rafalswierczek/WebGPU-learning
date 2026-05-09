export class Origin3DDict implements GPUOrigin3DDict
{
    public readonly x?: GPUIntegerCoordinate;
    public readonly y?: GPUIntegerCoordinate;
    public readonly z?: GPUIntegerCoordinate;

    public constructor(
        x?: GPUIntegerCoordinate, // 0
        y?: GPUIntegerCoordinate, // 0
        z?: GPUIntegerCoordinate, // 0
    ) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
