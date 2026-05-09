import { Vec2 } from "./WebGPU/uCoordsWs";

export class Square
{
    private readonly origin: Vec2;
    private readonly size: uint;

    public constructor (
        origin: Vec2,
        size: uint,
    ) {

        this.origin = origin;
        this.size = size;
    }

    public getVertexData(): Float32Array
    {
        return new Float32Array([
            this.origin.x, this.origin.y,
            this.origin.x + this.size, this.origin.y,
            this.origin.x + this.size, this.origin.y + this.size,
            this.origin.x, this.origin.y + this.size,
        ]);
    }

    /**
     * 3d              2c
     *   ______________
     *   |           ∕|
     *   |        ∕   |
     *   |     ∕      |
     *   |  ∕         |
     *   |∕___________|
     *  0a             1b
     */
    public getIndexData(): Uint32Array
    {
        return new Uint32Array([
            0, 1, 2,
            0, 2, 3,
        ]);
    }
}
