import { AppState } from "../AppState";
import { Camera } from "../Camera";
import { MapEditorController } from "./MapEditorController";

/**
 * Wejście edytora mapy i jego pauza.
 *
 * Pauza NIE zatrzymuje pętli renderowania - inaczej nie dałoby się narysować komunikatu
 * o pauzie. Odcinane jest wejście: klawisze kamery i obsługa myszy edytora.
 */
export class Controller
{
    private static readonly PAUSE_CODE: string = 'Pause';

    private readonly mapEditorController: MapEditorController;
    private readonly camera: Camera;
    private readonly appState: AppState;
    private readonly keyDownHandlerRef: (event: KeyboardEvent) => void;

    private attached: boolean = false;

    public constructor(mapEditorController: MapEditorController, camera: Camera, appState: AppState)
    {
        this.mapEditorController = mapEditorController;
        this.camera = camera;
        this.appState = appState;
        this.keyDownHandlerRef = this.keyDownHandler.bind(this);
    }

    /** Wejście na ekran edytora */
    public attach(): void
    {
        if (this.attached) {
            return;
        }

        // ten listener zostaje aktywny takze w pauzie - inaczej nie dalo by sie jej wylaczyc
        document.addEventListener('keydown', this.keyDownHandlerRef);
        this.attached = true;

        this.start();
    }

    /** Zejście z ekranu edytora */
    public detach(): void
    {
        if (!this.attached) {
            return;
        }

        document.removeEventListener('keydown', this.keyDownHandlerRef);
        this.attached = false;

        this.stopInput();
        this.appState.setPaused(false);
    }

    public start(): void
    {
        if (!this.attached) {
            console.log('%cCannot start. Map editor is not active.', 'color: yellow;');

            return;
        }

        if (!this.appState.isPaused() && this.mapEditorController.isListening()) {
            console.log('%cCannot start. Already running.', 'color: yellow;');

            return;
        }

        this.appState.setPaused(false);
        this.camera.addKeyboardEvents();
        this.mapEditorController.start();

        console.log('%cGame started!', 'color: green; font-weight: bold;');
    }

    public pause(): void
    {
        if (!this.attached || this.appState.isPaused()) {
            console.log("%cCannot pause. Map editor isn't running.", 'color: yellow;');

            return;
        }

        this.appState.setPaused(true);
        this.stopInput();

        console.log('%cGame paused!', 'color: yellow; font-weight: bold;');
    }

    public toggle(): void
    {
        if (this.appState.isPaused()) {
            this.start();

            return;
        }

        this.pause();
    }

    private stopInput(): void
    {
        this.camera.removeKeyboardEvents();
        this.mapEditorController.stop();
    }

    private keyDownHandler(event: KeyboardEvent): void
    {
        if (event.code === Controller.PAUSE_CODE) {
            event.preventDefault();

            this.toggle();
        }
    }
}
