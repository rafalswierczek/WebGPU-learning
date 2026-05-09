export class Tile
{
    public static readonly SIZE: bytes = 9; // textureId 4bytes, collision 1byte, speedFactor 4byes 
    public readonly textureId: uint;
    public readonly collision: boolean;
    public readonly speedFactor: float;

    public constructor(
        textureId: uint,
        collision: boolean = false,
        speedFactor: float = 1.0,
    ) {
        this.textureId = textureId;
        this.collision = collision;
        this.speedFactor = speedFactor;
    }
}
