export class Square
{
    private x: GPUIntegerCoordinate;

    private y: GPUIntegerCoordinate;

    /**
     * @param x World space x coordinate
     * @param y World space y coordinate
     */
    public constructor (
        x: GPUIntegerCoordinate,
        y: GPUIntegerCoordinate
    ) {
        this.x = x;
        this.y = y;
    }

    public getVertexData(): Float32Array
    {
        const data: Float32Array = new Float32Array(2);

        data.set([this.x, this.y]);

        return data;
    }

    /**
     *  -0.5,0.5     0.5,0.5
     *      0___________3
     *      |\          |
     *      |  \        |
     *      |     \     |
     *      |       \   |
     *      |__________\|
     *      1           2
     *  -0.5,-0.5    0.5,-0.5
     */
    public getIndexData(): Uint32Array
    {
        return new Uint32Array([0,1,2,2,0,3]);
    }
}
