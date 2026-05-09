export class Origin2DDict implements GPUOrigin2DDict
{
    public readonly x?: GPUIntegerCoordinate;
    public readonly y?: GPUIntegerCoordinate;

    public constructor(
        x?: GPUIntegerCoordinate, // 0
        y?: GPUIntegerCoordinate, // 0
    ) {
        this.x = x;
        this.y = y;
    }
}
