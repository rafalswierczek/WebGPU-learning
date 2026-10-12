import { Canvas } from "./Canvas/Canvas";
import { KeyboardFocus } from "./Ui/KeyboardFocus";
import { Settings } from "./Settings/Settings";

/**
 * Pełny ekran jako usługa aplikacji, a nie funkcja edytora - klawisz F działa na każdym ekranie,
 * także w menu głównym.
 *
 * Gra ma proporcję 4:3, a monitor zwykle 16:9. W pełny ekran wchodzi KONTENER canvasa, a nie
 * sam canvas - przeglądarka narzuca elementowi pełnoekranowemu `width/height: 100% !important`
 * i `object-fit: contain`, więc canvas zawsze dostawałby pudełko o proporcji monitora, a rysowany
 * obraz byłby w nim wpisywany z czarnymi pasami. Pudełko przestawało pokrywać się z obrazem
 * i pozycja myszy rozjeżdżała się na tej osi, na której pasy powstały.
 *
 * Kontener wypełnia ekran i centruje canvas, a canvas dostaje jawny rozmiar: WYBRANĄ
 * rozdzielczość, zmniejszoną tylko wtedy, gdy nie mieści się na ekranie. Pełny ekran zdejmuje
 * ramkę przeglądarki, a nie podmienia rozdzielczość - inaczej każda z listy wyglądałaby tak samo.
 * Pudełko canvasa pokrywa się wtedy z obrazem co do piksela, a przeliczanie pozycji myszy
 * nie ma czego gubić.
 */
export class FullScreen
{
    private static readonly TOGGLE_CODE: string = 'KeyF';

    private readonly canvas: Canvas;
    private readonly keyboardFocus: KeyboardFocus;
    private readonly settings: Settings;

    private onResize: (width: uint, height: uint) => void = (): void => {};

    private readonly keyDownHandlerRef: (event: KeyboardEvent) => void;
    private readonly changeHandlerRef: () => void;
    private readonly gestureHandlerRef: () => void;

    private wantedOnFirstGesture: boolean = false;

    public constructor(
        canvas: Canvas,
        keyboardFocus: KeyboardFocus,
        settings: Settings,
    ) {
        this.canvas = canvas;
        this.keyboardFocus = keyboardFocus;
        this.settings = settings;
        this.keyDownHandlerRef = this.keyDownHandler.bind(this);
        this.changeHandlerRef = this.changeHandler.bind(this);
        this.gestureHandlerRef = this.gestureHandler.bind(this);
    }

    /** Ustawiane po zbudowaniu reszty aplikacji, bo kamera i UI powstaja pozniej niz ta usluga */
    public setResizeHandler(onResize: (width: uint, height: uint) => void): void
    {
        this.onResize = onResize;
    }

    public attach(): void
    {
        document.addEventListener('keydown', this.keyDownHandlerRef);
        document.addEventListener('fullscreenchange', this.changeHandlerRef);
    }

    /**
     * Przeglądarka wpuszcza w pełny ekran wyłącznie w odpowiedzi na gest użytkownika i nie da się
     * tego obejść - to zabezpieczenie platformy, nie ustawienie. Próbujemy więc przy każdym geście,
     * dopóki się nie uda.
     */
    public requestOnFirstGesture(): void
    {
        this.wantedOnFirstGesture = true;

        window.addEventListener('pointerdown', this.gestureHandlerRef);
        window.addEventListener('keydown', this.gestureHandlerRef);
    }

    public isActive(): boolean
    {
        return document.fullscreenElement !== null;
    }

    public toggle(): void
    {
        this.wantedOnFirstGesture = false;

        if (this.isActive()) {
            document.exitFullscreen().catch((error: Error): void => console.error(error));

            return;
        }

        this.canvas.getContainerElement().requestFullscreen()
            .catch((error: Error): void => console.error(error));
    }

    private gestureHandler(): void
    {
        if (!this.wantedOnFirstGesture) {
            this.stopWaitingForGesture();

            return;
        }

        if (this.isActive()) {
            this.stopWaitingForGesture();

            return;
        }

        this.canvas.getContainerElement().requestFullscreen()
            .then((): void => this.stopWaitingForGesture())
            .catch((error: Error): void => console.warn('Cannot enter full screen yet:', error));
    }

    private stopWaitingForGesture(): void
    {
        this.wantedOnFirstGesture = false;

        window.removeEventListener('pointerdown', this.gestureHandlerRef);
        window.removeEventListener('keydown', this.gestureHandlerRef);
    }

    /**
     * Jedyne miejsce ustawiające rozmiar canvasa. Woła je zmiana rozdzielczości i wejście
     * w pełny ekran, więc oba przypadki nie mogą się rozjechać.
     */
    public applyResolution(): void
    {
        const resolution: { width: uint, height: uint } = this.settings.getResolution();
        const box: { width: uint, height: uint } = this.isActive()
            ? FullScreen.fitToScreen(resolution)
            : resolution;

        // pudelko dopasowane do ekranu, ale rysujemy zawsze w WYBRANEJ rozdzielczosci
        this.resize(box.width, box.height, resolution.width, resolution.height);
    }

    private changeHandler(): void
    {
        const container: HTMLDivElement = this.canvas.getContainerElement();

        if (!this.isActive()) {
            container.style.cssText = '';
            this.applyResolution();

            return;
        }

        // kontener wypełnia ekran i centruje canvas; czarne pasy to po prostu jego tło
        container.style.cssText = 'display: flex; align-items: center; justify-content: center;'
            + ' width: 100%; height: 100%; background: #000;';

        this.applyResolution();
        this.lockEscape();
    }

    /** Wybrana rozdzielczość, pomniejszona do ekranu dopiero wtedy, gdy się na nim nie mieści */
    private static fitToScreen(resolution: { width: uint, height: uint }): { width: uint, height: uint }
    {
        const scale: float = Math.min(
            1,
            window.innerWidth / resolution.width,
            window.innerHeight / resolution.height,
        );

        return {
            width: Math.round(resolution.width * scale),
            height: Math.round(resolution.height * scale),
        };
    }

    /** @param cssWidth wymiary w pikselach CSS; reszta aplikacji pracuje na pikselach backingu */
    private resize(cssWidth: uint, cssHeight: uint, renderWidth: uint, renderHeight: uint): void
    {
        if (cssWidth === 0 || cssHeight === 0) {
            return;
        }

        this.canvas.resizeTo(cssWidth, cssHeight, renderWidth, renderHeight);
        this.onResize(this.canvas.getWidth(), this.canvas.getHeight());
    }

    /**
     * Escape domyślnie wychodzi z pełnego ekranu i przeglądarka nie pozwala tego zablokować
     * zwykłym preventDefault. Jedyne wyjście to Keyboard Lock API - działa w Chromium,
     * w Firefoksie i Safari nie, i tam Escape nadal będzie zamykał pełny ekran.
     */
    private lockEscape(): void
    {
        // navigator.keyboard bywa null, a nie undefined - sprawdzenie musi to objąć,
        // inaczej typeof na null-u wywala się przy samym wejściu w pełny ekran
        const keyboard = (navigator as any).keyboard;

        if (!keyboard || typeof keyboard.lock !== 'function') {
            console.warn('Keyboard Lock API unavailable: Escape will exit full screen in this browser');

            return;
        }

        keyboard.lock(['Escape']).catch((error: Error): void => console.warn('Cannot lock Escape:', error));
    }

    private keyDownHandler(event: KeyboardEvent): void
    {
        // gdy uzytkownik pisze w polu tekstowym, F jest litera, a nie skrotem
        if (this.keyboardFocus.isCaptured() || event.ctrlKey || event.altKey) {
            return;
        }

        if (event.code === FullScreen.TOGGLE_CODE) {
            event.preventDefault();

            this.toggle();
        }
    }
}
