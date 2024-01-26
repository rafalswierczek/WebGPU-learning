export class Camera
{
    private static instance?: Camera;

    private isMovingTop: boolean = false;

    private isMovingBottom: boolean = false;

    private isMovingLeft: boolean = false;

    private isMovingRight: boolean = false;

    private speed: number;

    public x: number;

    public y: number;

    private constructor()
    {
        this.speed = 1;
        this.x = 1000;
        this.y = 1000;
    }

    public static getInstance(): Camera
    {
        if (!this.instance) {
            this.instance = new Camera();
        }

        return this.instance;
    }

    public addKeyboardEvents(): void
    {
        document.addEventListener("keydown", this.keyDownHandler, false);
        document.addEventListener("keyup", this.keyUpHandler, false);
    }

    public removeKeyboardEvents(): void
    {
        document.removeEventListener("keydown", this.keyDownHandler, false);
        document.removeEventListener("keyup", this.keyUpHandler, false);
    }

    public updateSpeed(speed: number)
    {
        this.speed = speed
    }

    public updatePositionX(x: number)
    {
        this.x = x;
    }

    public updatePositionY(y: number)
    {
        this.y = y;
    }

    public move(): void
    {
        if (this.isMovingTop) {
            this.y += this.speed;
        }
        
        if (this.isMovingBottom) {
            this.y -= this.speed;
        }

        if (this.isMovingLeft) {
            this.x -= this.speed;
        }

        if (this.isMovingRight) {
            this.x += this.speed;
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
