import { Controller } from "./Controller/Controller";
import { MapEditorController } from "./Controller/MapEditorController";

/** Attach all private functions to window. Example usage in console: start() */
export class API
{
    private readonly controller: Controller;
    private readonly mapEditorController: MapEditorController;

    public constructor(controller: Controller, mapEditorController: MapEditorController)
    {
        this.controller = controller;
        this.mapEditorController = mapEditorController;
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

    private saveExampleMap(): void
    {
        this.mapEditorController.saveExampleMap();
    }
}
