import { Controller } from "./Controller";

/** Attach all private functions to window. Usage in console: start() */
export class API
{
    private controller: Controller;

    public constructor(controller: Controller)
    {
        this.controller = controller;
    }

    public init(): void
    {
        Object.getOwnPropertyNames(API.prototype)
            .filter(name => (name !== 'constructor' && typeof (this as any)[name] === 'function'))
            .forEach(elem => {
                window[elem as any] = (this as any)[elem].bind(this);
            })
        ;
    }

    // window:

    private start(): void
    {
        this.controller.start();
    }

    private pause(): void
    {
        this.controller.pause();
    }
}
