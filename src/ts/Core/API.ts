import { Controller } from "./Controller";

export class API
{
    private controller: Controller;

    public constructor(controller: Controller)
    {
        this.controller = controller;
    }

    public start(): void
    {
        this.controller.start();
    }

    public pause(): void
    {
        this.controller.pause();
    }
    
    public init(): void
    {
        for (let key in this) {
            if (this.hasOwnProperty(key) && typeof this[key] === 'function') {
                (window as any)[key] = this[key];
            }
        }
    }
}
