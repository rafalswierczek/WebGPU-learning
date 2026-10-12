import { CameraConfig } from "./Config/CameraConfig";
import { KeyboardFocus } from "./Ui/KeyboardFocus";
import { SquareConfig } from "./Config/SquareConfig";
import { ViewConfig } from "./Config/ViewConfig";
import { ZoomConfig } from "./Config/ZoomConfig";

export class Camera
{
    /** Kody klawiszy, a nie znaki: event.key zmienia się pod wpływem shifta i capslocka, event.code nigdy */
    private static readonly HORIZONTAL_CODES: string[] = ['KeyA', 'KeyD'];
    private static readonly VERTICAL_CODES: string[] = ['KeyW', 'KeyS'];
    private static readonly SPRINT_CODE: string = 'ShiftLeft';

    private static instance?: Camera;
    private x: uint;
    private y: uint;
    private speed: uint;
    private zoom: float = ZoomConfig.DEFAULT;

    /**
     * Wciśnięte klawisze w kolejności wciśnięcia. Pierwszy z listy wygrywa, więc przy A+D
     * kierunek trzyma ten wciśnięty wcześniej, a po jego puszczeniu drugi przejmuje sterowanie
     * natychmiast - bez czekania na powtórzenie klawisza z systemu.
     */
    private readonly pressedHorizontal: string[] = [];
    private readonly pressedVertical: string[] = [];
    private sprinting: boolean = false;

    private readonly worldWidth: uint;
    private readonly worldHeight: uint;
    private readonly minZoom: float;
    /** Handlery muszą być związane z instancją, inaczej `this` w listenerze wskazuje na document */
    private readonly keyDownHandlerRef: (event: KeyboardEvent) => void;
    private readonly keyUpHandlerRef: (event: KeyboardEvent) => void;
    private readonly blurHandlerRef: () => void;
    private keyboardFocus: KeyboardFocus|null = null;

    private constructor(worldTilesX: uint, worldTilesY: uint, coords?: coordsWs, speed?: uint)
    {
        this.worldWidth = worldTilesX * SquareConfig.LENGTH;
        this.worldHeight = worldTilesY * SquareConfig.LENGTH;
        this.x = coords ? coords.x : CameraConfig.X;
        this.y = coords ? coords.y : CameraConfig.Y;
        this.speed = speed ? speed : CameraConfig.SPEED;
        // przy zoomie 1.0 widac VISIBLE_TILES_X kafli, wiec przy z widac ich VISIBLE_TILES_X / z
        this.minZoom = ViewConfig.VISIBLE_TILES_X / ZoomConfig.MAX_VISIBLE_TILES_X;
        this.keyDownHandlerRef = this.keyDownHandler.bind(this);
        this.keyUpHandlerRef = this.keyUpHandler.bind(this);
        this.blurHandlerRef = this.releaseAllKeys.bind(this);
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

    /** Ustawia kamerę tak, żeby podany punkt świata wypadł na środku widoku */
    public centerOn(worldX: float, worldY: float): void
    {
        this.setPosition(
            worldX - this.getVisibleWorldWidth() / 2,
            worldY - this.getVisibleWorldHeight() / 2,
        );
    }

    public setKeyboardFocus(keyboardFocus: KeyboardFocus): void
    {
        this.keyboardFocus = keyboardFocus;
    }

    public getX(): uint
    {
        return this.x;
    }

    public getY(): uint
    {
        return this.y;
    }

    public getZoom(): float
    {
        return this.zoom;
    }

    public isSprinting(): boolean
    {
        return this.sprinting;
    }

    /**
     * Ile świata widać w poziomie. Nie zależy od rozdzielczości ani od rozmiaru canvasa -
     * przy zoomie 1.0 to zawsze te same 16 kafli, a canvas tylko decyduje, ile pikseli
     * przypadnie na jeden z nich.
     */
    public getVisibleWorldWidth(): float
    {
        return ViewConfig.REFERENCE_WIDTH / this.zoom;
    }

    public getVisibleWorldHeight(): float
    {
        return ViewConfig.REFERENCE_HEIGHT / this.zoom;
    }

    /** Ile pikseli canvasa przypada na jeden piksel świata; osobno na oś, bo kafel nie musi być kwadratem */
    public getPixelsPerWorldX(canvasWidth: uint): float
    {
        return canvasWidth / this.getVisibleWorldWidth();
    }

    public getPixelsPerWorldY(canvasHeight: uint): float
    {
        return canvasHeight / this.getVisibleWorldHeight();
    }

    public addKeyboardEvents(): void
    {
        document.addEventListener("keydown", this.keyDownHandlerRef);
        document.addEventListener("keyup", this.keyUpHandlerRef);
        // bez tego alt-tab w trakcie ruchu zostawia wciśnięty klawisz i kamera jedzie w nieskończoność
        window.addEventListener("blur", this.blurHandlerRef);
    }

    public removeKeyboardEvents(): void
    {
        document.removeEventListener("keydown", this.keyDownHandlerRef);
        document.removeEventListener("keyup", this.keyUpHandlerRef);
        window.removeEventListener("blur", this.blurHandlerRef);

        this.releaseAllKeys();
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

    /**
     * Zoom mnożony, a nie dodawany: jedno kliknięcie scrolla zmienia przybliżenie o stały procent,
     * więc blisko przesuwa świat o kilka pikseli, a daleko o setki - progresja wychodzi sama z siebie,
     * bez żadnych progów. Zakres jest obcięty z obu stron, więc prędkość też jest ograniczona.
     *
     * Punkt pod kursorem zostaje w miejscu, inaczej zoom "ucieka" i nie da się nim celować.
     */
    public zoomAt(notches: float, anchorCanvasX: uint, anchorCanvasY: uint, canvasWidth: uint, canvasHeight: uint): void
    {
        const previousZoom: float = this.zoom;
        const zoom: float = this.zoom * Math.pow(ZoomConfig.STEP, notches);

        this.zoom = Math.min(ZoomConfig.MAX, Math.max(this.minZoom, zoom));

        if (this.zoom === previousZoom) {
            return;
        }

        // kotwica jako ułamek widoku, a nie w pikselach - piksele znaczą co innego w każdej
        // rozdzielczości, ułamek jest ten sam wszędzie; oś Y canvasa rośnie w dół, świat w górę
        const anchorX: float = anchorCanvasX / canvasWidth;
        const anchorY: float = (canvasHeight - anchorCanvasY) / canvasHeight;

        // świat pod kursorem przed zmianą zoomu ma tam zostać także po niej
        const worldX: float = this.x + anchorX * ViewConfig.REFERENCE_WIDTH / previousZoom;
        const worldY: float = this.y + anchorY * ViewConfig.REFERENCE_HEIGHT / previousZoom;

        this.setPosition(
            worldX - anchorX * this.getVisibleWorldWidth(),
            worldY - anchorY * this.getVisibleWorldHeight(),
        );
    }

    public move(): void
    {
        // gdy użytkownik pisze w polu tekstowym, WSAD należy do niego, nie do kamery
        if (this.keyboardFocus !== null && this.keyboardFocus.isCaptured()) {
            this.releaseAllKeys();

            return;
        }

        const horizontal: string|undefined = this.pressedHorizontal[0];
        const vertical: string|undefined = this.pressedVertical[0];

        if (horizontal === undefined && vertical === undefined) {
            return;
        }

        // przy oddaleniu ten sam ruch w pikselach ekranu to większy ruch w świecie
        const sprint: float = this.sprinting ? CameraConfig.SPRINT_MULTIPLIER : 1;
        const step: float = this.speed * sprint / this.zoom;
        let x: float = this.x;
        let y: float = this.y;

        if (horizontal === 'KeyD') {
            x += step;
        } else if (horizontal === 'KeyA') {
            x -= step;
        }

        if (vertical === 'KeyW') {
            y += step;
        } else if (vertical === 'KeyS') {
            y -= step;
        }

        this.setPosition(x, y);
    }

    /** Pozycja jest zaokrąglana do pełnych pikseli świata, żeby linie siatki zostały ostre. */
    private setPosition(x: float, y: float): void
    {
        const maxX: float = Math.max(0, this.worldWidth - this.getVisibleWorldWidth());
        const maxY: float = Math.max(0, this.worldHeight - this.getVisibleWorldHeight());

        this.x = Math.round(Math.min(maxX, Math.max(0, x)));
        this.y = Math.round(Math.min(maxY, Math.max(0, y)));
    }

    private keyDownHandler(event: KeyboardEvent): void
    {
        if (this.keyboardFocus !== null && this.keyboardFocus.isCaptured()) {
            return;
        }

        if (event.code === Camera.SPRINT_CODE) {
            this.sprinting = true;

            return;
        }

        Camera.press(this.pressedHorizontal, Camera.HORIZONTAL_CODES, event.code);
        Camera.press(this.pressedVertical, Camera.VERTICAL_CODES, event.code);
    }

    private keyUpHandler(event: KeyboardEvent): void
    {
        if (event.code === Camera.SPRINT_CODE) {
            this.sprinting = false;

            return;
        }

        Camera.release(this.pressedHorizontal, event.code);
        Camera.release(this.pressedVertical, event.code);
    }

    private releaseAllKeys(): void
    {
        this.pressedHorizontal.length = 0;
        this.pressedVertical.length = 0;
        this.sprinting = false;
    }

    /** Powtórzenia klawisza z systemu przychodzą jako kolejne keydown - nie mogą dublować wpisu */
    private static press(pressed: string[], codes: string[], code: string): void
    {
        if (codes.indexOf(code) === -1 || pressed.indexOf(code) !== -1) {
            return;
        }

        pressed.push(code);
    }

    private static release(pressed: string[], code: string): void
    {
        const index: int = pressed.indexOf(code);

        if (index !== -1) {
            pressed.splice(index, 1);
        }
    }
}
