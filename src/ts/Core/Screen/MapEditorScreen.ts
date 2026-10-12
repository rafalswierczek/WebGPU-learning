import { Controller } from "../Controller/Controller";
import { DebugOverlay } from "../Debug/DebugOverlay";
import { MapEditorHandler } from "../MapEditor/MapEditorHandler";
import { Screen } from "./Screen";

/**
 * Edytor mapy jako ekran. Renderowanie robi MapEditorHandler, a wejście Controller -
 * ta klasa tylko spina jedno z drugim, żeby ScreenManager miał z czym rozmawiać.
 */
export class MapEditorScreen implements Screen
{
    private readonly handler: MapEditorHandler;
    private readonly controller: Controller;
    private readonly debugOverlay: DebugOverlay;

    public constructor(handler: MapEditorHandler, controller: Controller, debugOverlay: DebugOverlay)
    {
        this.handler = handler;
        this.controller = controller;
        this.debugOverlay = debugOverlay;
    }

    public activate(): void
    {
        this.controller.attach();
        // okno debugowe rysuje sie tylko w edytorze, wiec i CTRL+Q dziala tylko tutaj
        this.debugOverlay.attach();
    }

    public deactivate(): void
    {
        this.controller.detach();
        this.debugOverlay.detach();
    }

    public handle(commandEncoder: GPUCommandEncoder): void
    {
        this.handler.handle(commandEncoder);
    }
}
