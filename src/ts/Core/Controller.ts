import { Renderer } from "./Renderer";

export class Controller
{
    private renderer: Renderer;

    private initialized: boolean = false;

    public constructor(renderer: Renderer)
    {
        this.renderer = renderer;
    }

    /**
     * Run automatically
     */
    public init(): void
    {
        if (true === this.initialized) {
            console.log('%cCannot initialize controller more than once.', 'color: yellow;');

            return;
        }

        this.renderer.displayCanvas();

        this.initialized = true;
    }

    public start(): void
    {
        if (true === this.renderer.hasStarted()) {
            console.log('%cCannot start. Game already started.', 'color: yellow;');

            return;
        }

        console.log('%cGame started!', 'color: green; font-weight: bold;');

        this.renderer.start();
    }

    public pause(): void
    {
        if (false === this.renderer.hasStarted()) {
            console.log("%cCannot pause. Game hasn't started yet.", 'color: yellow;');

            return;
        }

        console.log('%cGame stopped!', 'color: yellow; font-weight: bold;');

        this.renderer.stop();
    }
}
