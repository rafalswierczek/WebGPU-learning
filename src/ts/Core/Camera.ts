import { CameraConfig } from "./Config/CameraConfig";
import { SquareConfig } from "./Config/SquareConfig";

export class Camera
{
    private static instance?: Camera;
    private x: uint;
    private y: uint;
    private speed: uint;
    private isMovingTop: boolean = false;
    private isMovingBottom: boolean = false;
    private isMovingLeft: boolean = false;
    private isMovingRight: boolean = false;
    private readonly xMax: uint;
    private readonly yMax: uint;

    private constructor(worldTilesX: uint, worldTilesY: uint, coords?: coordsWs, speed?: uint)
    {
        this.xMax = worldTilesX * SquareConfig.LENGTH - CameraConfig.WIDTH;
        this.yMax = worldTilesY * SquareConfig.LENGTH - CameraConfig.HEIGHT;
        this.x = coords ? coords.x : CameraConfig.X;
        this.y = coords ? coords.y : CameraConfig.Y;
        this.speed = speed ? speed : CameraConfig.SPEED;
    }

    public static getInstance(worldTilesX?: uint, worldTilesY?: uint, coords?: coordsWs, speed?: uint): Camera
{
        if (!this.instance) {
            if (worldTilesX === undefined || worldTilesY === undefined) {
                throw new Error('Missing params');
            }

            this.instance = new Camera(worldTilesX, worldTilesY, coords, speed);
        }

        return this.instance;
    }

    public getX(): uint
    {
        return this.x;
    }

    public getY(): uint
    {
        return this.y;
    }

    public addKeyboardEvents(): void
    {
        document.addEventListener("keydown", this.keyDownHandler);
        document.addEventListener("keyup", this.keyUpHandler);
    }

    public removeKeyboardEvents(): void
    {
        document.removeEventListener("keydown", this.keyDownHandler);
        document.removeEventListener("keyup", this.keyUpHandler);
    }

    public setSpeed(speed: uint)
    {
        this.speed = speed
    }

    public setPositionX(x: uint)
    {
        this.x = x;
    }

    public setPositionY(y: uint)
    {
        this.y = y;
    }

    public move(): void
    {
        if (this.isMovingTop) {
            this.y = Math.min(this.y + this.speed, this.yMax);
        }
        
        if (this.isMovingBottom) {
            this.y = Math.max(this.y - this.speed, 0);
        }

        if (this.isMovingLeft) {
            this.x = Math.max(this.x - this.speed, 0);
        }

        if (this.isMovingRight) {
            this.x = Math.min(this.x + this.speed, this.xMax);
        }
    }

    private keyDownHandler(event: KeyboardEvent)
    {
        if (event.key === 'w' && this.isMovingBottom === false) {
            this.isMovingTop = true;
        } else if (event.key === 's' && this.isMovingTop === false) {
            this.isMovingBottom = true;
        } else if (event.key === 'a' && this.isMovingRight === false) {
            this.isMovingLeft = true;
        } else if (event.key === 'd' && this.isMovingLeft === false) {
            this.isMovingRight = true;
        }
    }

    private keyUpHandler(event: KeyboardEvent)
    {
        if (event.key === 'w') {
            this.isMovingTop = false;
        } else if (event.key === 's') {
            this.isMovingBottom = false;
        } else if (event.key === 'a') {
            this.isMovingLeft = false;
        } else if (event.key === 'd') {
            this.isMovingRight = false;
        }
    }
}
