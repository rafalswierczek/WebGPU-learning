import { GameConfig } from "../Config/GameConfig";
import { InvalidCanvasContextException } from "../Exception/InvalidCanvasContextException";

export class Canvas
{
    private readonly canvas: HTMLCanvasElement;
    /**
     * Canvas siedzi w kontenerze, bo to KONTENER wchodzi w pełny ekran.
     *
     * Przeglądarka narzuca elementowi pełnoekranowemu `width/height: 100% !important`
     * i `object-fit: contain`, których nie da się nadpisać nawet własnym `!important`
     * (deklaracje ważne z arkusza przeglądarki wygrywają z autorskimi). Gdyby pełny ekran
     * brał canvas, jego pudełko zawsze miałoby proporcję monitora, a rysowany obraz byłby
     * w nim wpisywany z czarnymi pasami - i pozycja myszy rozjeżdżałaby się na tej osi,
     * na której pasy powstały. Kontenerowi te reguły nie szkodzą, bo nie jest obrazem.
     */
    private readonly container: HTMLDivElement;
    private readonly context: GPUCanvasContext;

    /** @throws {InvalidCanvasContextException} */
    constructor(width: uint, height: uint, cssStyle: string)
    {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = cssStyle;
        this.container = document.createElement('div');
        this.container.appendChild(this.canvas);
        this.context = this.getContextFromCanvas(this.canvas);

        this.resize(width, height);

        this.setCursorVisible(true);
    }

    public getCanvasElement(): HTMLCanvasElement
    {
        return this.canvas;
    }

    /** Element wstawiany do strony i wchodzący w pełny ekran */
    public getContainerElement(): HTMLDivElement
    {
        return this.container;
    }

    /**
     * Kursor gry jest plikiem CUR, więc ma własną przezroczystość i punkt trafienia.
     * Ukryty jest tylko nad mapą w edytorze - tam pozycję pokazuje ramka pędzla.
     */
    public setCursorVisible(visible: boolean): void
    {
        this.canvas.style.cursor = visible ? `url('${GameConfig.CURSOR_URL}'), auto` : 'none';
    }

    /**
     * Zmiana rozdzielczości. Podane wymiary są w pikselach CSS, czyli w tym, co widać na ekranie.
     *
     * Backing dostaje je pomnożone przez devicePixelRatio, więc na ekranach o gęstym pikselu
     * rysujemy w pełnej rozdzielczości sprzętowej zamiast dawać przeglądarce do rozciągnięcia
     * obraz o mniejszej liczbie pikseli.
     *
     * Rozmiar CSS jest ustawiany jawnie, dzięki czemu pudełko elementu zawsze pokrywa się
     * z rysowanym obrazem - bez tego przeliczanie pozycji myszy rozjeżdżało się w pełnym ekranie.
     */
    public resize(cssWidth: uint, cssHeight: uint): void
    {
        this.resizeTo(cssWidth, cssHeight, cssWidth, cssHeight);
    }

    /**
     * Rozmiar na ekranie i rozdzielczosc rysowania osobno.
     *
     * W pelnym ekranie pudelko canvasa musi zmiescic sie na monitorze, ale RYSOWAC nadal chcemy
     * w wybranej rozdzielczosci - inaczej kazda rozdzielczosc powyzej ekranu dawalaby ten sam
     * obraz, bo wszystkie docinaja sie do tego samego prostokata.
     *
     * @param cssWidth   rozmiar pudelka na stronie
     * @param renderWidth rozdzielczosc rysowania przed pomnozeniem przez devicePixelRatio
     */
    public resizeTo(cssWidth: uint, cssHeight: uint, renderWidth: uint, renderHeight: uint): void
    {
        const ratio: float = this.getPixelRatio();

        this.canvas.width = Math.round(renderWidth * ratio);
        this.canvas.height = Math.round(renderHeight * ratio);
        this.canvas.style.width = `${cssWidth}px`;
        this.canvas.style.height = `${cssHeight}px`;
    }

    public getPixelRatio(): float
    {
        return window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    }

    /**
     * Zdarzenie myszy jest w pikselach CSS elementu, a canvas ma własną rozdzielczość backingu -
     * przy skalowaniu przez CSS (np. w pełnym ekranie) te dwie wartości się rozjeżdżają.
     *
     * @returns null, gdy element nie ma jeszcze rozmiaru na stronie
     */
    public getEventCoords(event: MouseEvent): coordsCanvas|null
    {
        const bounds: DOMRect = this.canvas.getBoundingClientRect();
        // clientWidth pomija ramke elementu, ktora getBoundingClientRect wlicza - bez tego
        // przelicznik jest lekko zawyzony i blad rosnie wraz z odlegloscia od krawedzi
        const displayedWidth: uint = this.canvas.clientWidth;
        const displayedHeight: uint = this.canvas.clientHeight;

        if (displayedWidth === 0 || displayedHeight === 0) {
            return null;
        }

        return {
            canvasX: Math.floor((event.clientX - bounds.left - this.canvas.clientLeft) * (this.canvas.width / displayedWidth)),
            canvasY: Math.floor((event.clientY - bounds.top - this.canvas.clientTop) * (this.canvas.height / displayedHeight)),
        };
    }

    public getWidth(): uint
    {
        return this.canvas.width;
    }

    public getHeight(): uint
    {
        return this.canvas.height;
    }

    public getContext(): GPUCanvasContext
    {
        return this.context;
    }

    /** @throws {InvalidCanvasContextException} */
    private getContextFromCanvas(canvas: HTMLCanvasElement): GPUCanvasContext
    {
        // Rzutowanie jest tu celowe: przeciążenie getContext('webgpu') pochodzi z @webgpu/types,
        // a ts-loader w trybie watch potrafi je pogubić po dodaniu nowych plików do projektu.
        // Wynik i tak sprawdzamy poniżej, więc rzutowanie niczego nie ukrywa.
        const context = canvas.getContext('webgpu') as GPUCanvasContext|null;

        if (!context) {
            throw new InvalidCanvasContextException();
        }

        return context;
    }
}
