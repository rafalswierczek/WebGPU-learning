import { UiConfig } from "../Config/UiConfig";

/**
 * Atlas znaków ASCII rysowany raz przez Canvas2D i wgrywany na GPU jako tekstura.
 *
 * To jest standardowa technika na tekst w silniku: zamiast rysować litery co klatkę,
 * raz robimy siatkę glifów, a potem rysujemy instancjonowane quady, które z niej samplują.
 *
 * Font jest PROPORCJONALNY (Verdana Bold), więc każdy glif ma własną szerokość. Komórki atlasu
 * mają jednakowy rozmiar (najszerszy glif), ale UV obejmuje tylko rzeczywistą szerokość znaku,
 * a rysowanie przesuwa kursor o tę szerokość - inaczej wąskie litery byłyby rozciągnięte,
 * a tekst wyglądałby jak rozstrzelony.
 *
 * Komórki mają margines (GUTTER). Bez niego tusz glifu, który wychodzi poza swoje pole -
 * ogonek "y", przecinek, akcent - lądował w sąsiedniej komórce i pojawiał się jako
 * pojedyncze piksele przy zupełnie innej literze. Marginesu nigdy nie samplujemy.
 *
 * Ostatnia komórka atlasu jest wypełniona na biało - służy jako tło paneli i ramek,
 * dzięki czemu tło i tekst idą jednym pipeline'em i jednym draw callem.
 */
export class FontAtlas
{
    public static readonly FIRST_CHAR: uint = 32;  // spacja
    public static readonly LAST_CHAR: uint = 126;  // ~
    public static readonly COLUMNS: uint = 16;
    /** Margines wokół każdej komórki, w pikselach atlasu */
    public static readonly GUTTER: uint = 2;

    public readonly canvas: HTMLCanvasElement;
    /** Najszersza komórka atlasu; pojedynczy glif bywa węższy - patrz getAdvance() */
    public readonly cellWidth: uint;
    public readonly cellHeight: uint;
    public readonly columns: uint;
    public readonly rows: uint;
    public readonly cellCount: uint;
    /** Indeks komórki wypełnionej na biało */
    public readonly solidIndex: uint;

    /** Szerokość każdego glifu w pikselach - indeks jak w getCellIndex() */
    private readonly advances: uint[];

    /** Odstęp między początkami komórek = najszerszy glif + dwa marginesy */
    private readonly strideX: uint;
    private readonly strideY: uint;

    private constructor(
        canvas: HTMLCanvasElement,
        cellWidth: uint,
        cellHeight: uint,
        strideX: uint,
        strideY: uint,
        columns: uint,
        rows: uint,
        cellCount: uint,
        solidIndex: uint,
        advances: uint[],
    ) {
        this.canvas = canvas;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.strideX = strideX;
        this.strideY = strideY;
        this.columns = columns;
        this.rows = rows;
        this.cellCount = cellCount;
        this.solidIndex = solidIndex;
        this.advances = advances;
    }

    /**
     * Czcionka z pliku musi być wczytana ZANIM Canvas2D coś nią narysuje - inaczej atlas
     * powstałby domyślnym krojem i nikt by o tym nie wiedział aż do obejrzenia ekranu.
     */
    public static async create(fontSize: uint = UiConfig.FONT_SIZE): Promise<FontAtlas>
    {
        await FontAtlas.loadFont();

        const glyphCount: uint = FontAtlas.LAST_CHAR - FontAtlas.FIRST_CHAR + 1;
        const solidIndex: uint = glyphCount;
        const cellCount: uint = glyphCount + 1;
        const columns: uint = FontAtlas.COLUMNS;
        const rows: uint = Math.ceil(cellCount / columns);

        const font: string = `${fontSize}px "${UiConfig.FONT_FAMILY}", sans-serif`;
        const measureCanvas: HTMLCanvasElement = document.createElement('canvas');
        const measureContext: CanvasRenderingContext2D = FontAtlas.getContext(measureCanvas);

        measureContext.font = font;

        const advances: uint[] = [];

        for (let glyphIndex: uint = 0; glyphIndex < glyphCount; glyphIndex++) {
            const character: string = String.fromCharCode(FontAtlas.FIRST_CHAR + glyphIndex);

            advances.push(Math.max(1, Math.ceil(measureContext.measureText(character).width)));
        }

        const cellWidth: uint = Math.max(...advances);
        const cellHeight: uint = Math.ceil(fontSize * 1.35);
        const strideX: uint = cellWidth + FontAtlas.GUTTER * 2;
        const strideY: uint = cellHeight + FontAtlas.GUTTER * 2;

        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width = columns * strideX;
        canvas.height = rows * strideY;

        const context: CanvasRenderingContext2D = FontAtlas.getContext(canvas);

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.font = font;
        context.textBaseline = 'middle';
        context.fillStyle = '#ffffff';

        for (let glyphIndex: uint = 0; glyphIndex < glyphCount; glyphIndex++) {
            const character: string = String.fromCharCode(FontAtlas.FIRST_CHAR + glyphIndex);

            // srodek komorki, a nie jej gorna krawedz - inaczej tekst wyglada na przyklejony do gory
            context.fillText(
                character,
                (glyphIndex % columns) * strideX + FontAtlas.GUTTER,
                Math.floor(glyphIndex / columns) * strideY + FontAtlas.GUTTER + cellHeight / 2,
            );
        }

        context.fillRect(
            (solidIndex % columns) * strideX + FontAtlas.GUTTER,
            Math.floor(solidIndex / columns) * strideY + FontAtlas.GUTTER,
            cellWidth,
            cellHeight,
        );

        return new FontAtlas(
            canvas,
            cellWidth,
            cellHeight,
            strideX,
            strideY,
            columns,
            rows,
            cellCount,
            solidIndex,
            advances,
        );
    }

    public getCellIndex(character: string): uint
    {
        const code: uint = character.charCodeAt(0);

        if (code < FontAtlas.FIRST_CHAR || code > FontAtlas.LAST_CHAR) {
            return 0; // spacja
        }

        return code - FontAtlas.FIRST_CHAR;
    }

    /** Szerokość znaku w pikselach atlasu - tyle zajmuje na ekranie przy skali 1 */
    public getAdvance(character: string): uint
    {
        return this.advances[this.getCellIndex(character)];
    }

    /** [u0, v0, u1, v1] samego glifu: pełna wysokość komórki, ale tylko własna szerokość znaku */
    public getCellUv(cellIndex: uint): [float, float, float, float]
    {
        const x: uint = (cellIndex % this.columns) * this.strideX + FontAtlas.GUTTER;
        const y: uint = Math.floor(cellIndex / this.columns) * this.strideY + FontAtlas.GUTTER;
        const width: uint = cellIndex === this.solidIndex ? this.cellWidth : this.advances[cellIndex];

        return [
            x / this.canvas.width,
            y / this.canvas.height,
            (x + width) / this.canvas.width,
            (y + this.cellHeight) / this.canvas.height,
        ];
    }

    /**
     * Punkt w środku białej komórki. Panel skalujemy do dowolnego rozmiaru, więc samplujemy
     * jeden punkt zamiast całej komórki - inaczej filtrowanie podbierałoby sąsiednie glify.
     */
    public getSolidUv(): [float, float, float, float]
    {
        const centerX: float = ((this.solidIndex % this.columns) * this.strideX + FontAtlas.GUTTER + this.cellWidth / 2)
            / this.canvas.width;
        const centerY: float = (Math.floor(this.solidIndex / this.columns) * this.strideY + FontAtlas.GUTTER + this.cellHeight / 2)
            / this.canvas.height;

        return [centerX, centerY, centerX, centerY];
    }

    /**
     * @throws {Error} gdy pliku nie ma - brak czcionki jest błędem konfiguracji, a nie czymś,
     *                 co ma po cichu podmienić krój na systemowy
     */
    private static async loadFont(): Promise<void>
    {
        // spacja w nazwie pliku musi byc zakodowana, inaczej url() sie urywa
        const source: string = `url("${encodeURI(UiConfig.FONT_FILE)}")`;
        const face: FontFace = new FontFace(UiConfig.FONT_FAMILY, source);

        try {
            document.fonts.add(await face.load());
        } catch (error) {
            throw new Error(`Cannot load font ${UiConfig.FONT_FILE}: ${(error as Error).message}`);
        }
    }

    private static getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D
    {
        const context: CanvasRenderingContext2D|null = canvas.getContext('2d');

        if (context === null) {
            throw new Error('Cannot get 2d context for the font atlas');
        }

        return context;
    }
}
