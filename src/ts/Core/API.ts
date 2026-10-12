import { Controller } from "./Controller/Controller";
import { MapEditorController } from "./Controller/MapEditorController";
import { DebugOverlay } from "./Debug/DebugOverlay";
import { ScreenManager } from "./Screen/ScreenManager";
import { ScreenName } from "./Screen/Screen";

/** Attach all private functions to window. Example usage in console: start() */
export class API
{
    private readonly controller: Controller;
    private readonly mapEditorController: MapEditorController;
    private readonly debugOverlay: DebugOverlay;
    private readonly screens: ScreenManager;

    public constructor(
        controller: Controller,
        mapEditorController: MapEditorController,
        debugOverlay: DebugOverlay,
        screens: ScreenManager,
    ) {
        this.controller = controller;
        this.mapEditorController = mapEditorController;
        this.debugOverlay = debugOverlay;
        this.screens = screens;
    }

    public init(): void
    {
        Object.getOwnPropertyNames(API.prototype)
            .filter(name => (name !== 'constructor' && name !== 'init' && typeof (this as any)[name] === 'function'))
            .forEach(elem => {
                window[elem as any] = (this as any)[elem].bind(this);
            })
        ;

        console.log(
            '%cAPI: start() pause() mapEditor() mainMenu() | generateTestMap() loadMap() saveMap() mapInfo() downloadMap() | runTests()'
            + ' | WSAD = kamera, LPM/CTRL+PPM = maluj/kasuj, PPM = menu, UP/DOWN = warstwa,'
            + ' NUMPAD +/- = rozmiar pedzla, O = kafelek/obiekt, PAUSE = pauza, F = pelny ekran, CTRL+Q = debug',
            'color: #6cf;'
        );
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

    private async generateTestMap(chunksX: uint = 3, chunksY: uint = 3): Promise<void>
    {
        await this.mapEditorController.generateTestMap(chunksX, chunksY);
    }

    private async loadMap(): Promise<uint>
    {
        return this.mapEditorController.load();
    }

    private async saveMap(): Promise<uint>
    {
        return this.mapEditorController.save();
    }

    private mapInfo(): object
    {
        return this.mapEditorController.getInfo();
    }

    private async downloadMap(): Promise<void>
    {
        await this.mapEditorController.download();
    }

    private mapEditor(): void
    {
        this.screens.goTo(ScreenName.MAP_EDITOR);
    }

    private mainMenu(): void
    {
        this.screens.goTo(ScreenName.MAIN_MENU);
    }

    private toggleDebug(): void
    {
        this.debugOverlay.toggle();
    }
}
