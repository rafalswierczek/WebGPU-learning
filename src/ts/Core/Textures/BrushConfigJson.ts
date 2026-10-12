/**
 * Config pędzla tak, jak leży w pliku `config.json` obok tekstur.
 *
 * Każdy klucz jest opcjonalny: plik nadpisuje tylko to, co w nim jest, a reszta zostaje domyślna.
 * Dzięki temu config z samym `speedFactor` nie musi powtarzać trzech pozostałych pól.
 */
export type brushConfigJson = {
    /** [wiersze, kolumny] - indeks 0 to wiersze */
    readonly brushSize?: [uint, uint];
    /**
     * `true`/`false` dla wszystkich tekstur pędzla albo lista identyfikatorów tekstur,
     * które kolidują - pozostałe wtedy nie kolidują.
     */
    readonly collision?: boolean|uint[];
    readonly type?: string;
    readonly speedFactor?: float;
    /**
     * Pojedynczy identyfikator przy pędzlu 1x1 albo tablica tablic w układzie [wiersz][kolumna],
     * zgodna z `brushSize`.
     *
     * Brak tego klucza znaczy „config dotyczy każdej tekstury w folderze z osobna".
     * Obecność znaczy „ten folder to JEDEN pędzel", a pliki spoza listy są ignorowane.
     */
    readonly textures?: uint|uint[][];
};

/** Config po scaleniu z domyślnym - każde pole ma już wartość */
export class BrushConfig
{
    public static readonly DEFAULT_BRUSH_SIZE: [uint, uint] = [1, 1];
    public static readonly DEFAULT_COLLISION: boolean = false;
    public static readonly DEFAULT_TYPE: string = 'default';
    public static readonly DEFAULT_SPEED_FACTOR: float = 1.0;

    public readonly brushSize: [uint, uint];
    public readonly collision: boolean|uint[];
    public readonly type: string;
    public readonly speedFactor: float;
    public readonly textures: uint|uint[][]|null;

    private constructor(
        brushSize: [uint, uint],
        collision: boolean|uint[],
        type: string,
        speedFactor: float,
        textures: uint|uint[][]|null,
    ) {
        this.brushSize = brushSize;
        this.collision = collision;
        this.type = type;
        this.speedFactor = speedFactor;
        this.textures = textures;
    }

    /** Domyślny config: pojedynczy kafel bez kolizji, zwykły typ, normalna prędkość */
    public static getDefault(): BrushConfig
    {
        return new BrushConfig(
            BrushConfig.DEFAULT_BRUSH_SIZE,
            BrushConfig.DEFAULT_COLLISION,
            BrushConfig.DEFAULT_TYPE,
            BrushConfig.DEFAULT_SPEED_FACTOR,
            null,
        );
    }

    /** Domyślny config nadpisany tym, co faktycznie jest w pliku - klucz po kluczu */
    public static merge(json: brushConfigJson|null): BrushConfig
    {
        const base: BrushConfig = BrushConfig.getDefault();

        if (json === null) {
            return base;
        }

        return new BrushConfig(
            json.brushSize ?? base.brushSize,
            json.collision ?? base.collision,
            json.type ?? base.type,
            json.speedFactor ?? base.speedFactor,
            json.textures ?? null,
        );
    }

    public getRows(): uint
    {
        return this.brushSize[0];
    }

    public getColumns(): uint
    {
        return this.brushSize[1];
    }

    /** Czy dana tekstura koliduje - lista wskazuje kolidujące, boolean rozstrzyga za wszystkie */
    public collidesAt(textureId: uint): boolean
    {
        if (typeof this.collision === 'boolean') {
            return this.collision;
        }

        return this.collision.indexOf(textureId) !== -1;
    }

    /**
     * Tekstury ułożone w siatkę [wiersz][kolumna] o wymiarach z `brushSize`.
     *
     * @throws {Error} gdy kształt `textures` nie zgadza się z `brushSize` - lepiej wywalić się
     *                 na starcie z nazwą folderu niż malować kafle w losowych miejscach
     */
    public toGrid(folderPath: string): uint[][]
    {
        const rows: uint = this.getRows();
        const columns: uint = this.getColumns();

        if (this.textures === null) {
            throw new Error(`Config in "${folderPath}" has no textures`);
        }

        if (typeof this.textures === 'number') {
            if (rows !== 1 || columns !== 1) {
                throw new Error(`Config in "${folderPath}" has a single texture but brushSize ${rows}x${columns}`);
            }

            return [[this.textures]];
        }

        if (this.textures.length !== rows) {
            throw new Error(
                `Config in "${folderPath}" has ${this.textures.length} texture rows, brushSize says ${rows}`
            );
        }

        for (const row of this.textures) {
            if (row.length !== columns) {
                throw new Error(
                    `Config in "${folderPath}" has a row of ${row.length} textures, brushSize says ${columns}`
                );
            }
        }

        return this.textures;
    }
}
