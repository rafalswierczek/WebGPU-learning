import { BrushConfig } from "./BrushConfigJson";

/**
 * Pędzel edytora: prostokąt tekstur razem z właściwościami, jakie mają dostać malowane kafle.
 *
 * Pędzel 1x1 to zwykły kafel i tylko jemu wolno zmieniać rozmiar (NUMPAD +/-) - reszta to
 * logiczne obiekty złożone z wielu tekstur (posąg, dach, drzewo) i rozciąganie ich nie miałoby
 * sensu: wyszedłby posąg z czterema tułowiami.
 */
export class Brush
{
    private readonly textures: uint[][];
    private readonly config: BrushConfig;
    /** Folder tekstur, z którego pędzel powstał - zarazem tożsamość agregatu */
    private readonly path: string;
    /** Ile kafli obok siebie maluje pędzel 1x1; dla pędzli złożonych zawsze 1 */
    private readonly size: uint;

    public constructor(textures: uint[][], config: BrushConfig, path: string, size: uint = 1)
    {
        this.textures = textures;
        this.config = config;
        this.path = path;
        this.size = config.getRows() === 1 && config.getColumns() === 1 ? Math.max(1, size) : 1;
    }

    /** Ten sam pędzel w innym rozmiarze; pędzel złożony ignoruje zmianę */
    public resized(size: uint): Brush
    {
        return new Brush(this.textures, this.config, this.path, size);
    }

    public getPath(): string
    {
        return this.path;
    }

    /** Ścieżka konkretnej tekstury w drzewie, czyli nazwa kafla */
    public getTextureName(textureId: uint): string
    {
        return this.path === '' ? String(textureId) : `${this.path}/${textureId}`;
    }

    /**
     * Czy pędzel jest agregatem, czyli obiektem złożonym opisanym kluczem "textures".
     *
     * Kafle agregatu kasuje się w całości, więc muszą o tym wiedzieć - stąd znacznik wędruje
     * z pędzla do wpisu w rejestrze.
     */
    public isAggregate(): boolean
    {
        return this.config.textures !== null;
    }

    /** Pozycja tekstury we wzorze albo null, gdy pędzel jej nie zawiera */
    public findTexture(textureId: uint): { row: uint, column: uint }|null
    {
        for (let row: uint = 0; row < this.textures.length; row++) {
            const column: int = this.textures[row].indexOf(textureId);

            if (column !== -1) {
                return { row: row, column: column };
            }
        }

        return null;
    }

    public isResizable(): boolean
    {
        return this.config.getRows() === 1 && this.config.getColumns() === 1;
    }

    public getSize(): uint
    {
        return this.size;
    }

    /** Wysokość odcisku pędzla w kaflach */
    public getRows(): uint
    {
        return this.isResizable() ? this.size : this.config.getRows();
    }

    /** Szerokość odcisku pędzla w kaflach */
    public getColumns(): uint
    {
        return this.isResizable() ? this.size : this.config.getColumns();
    }

    /**
     * Tekstura pod danym miejscem odcisku. WIERSZ 0 TO GÓRA wzoru - tak jak w config.json,
     * gdzie pierwszy wiersz "textures" jest górą obrazka.
     *
     * Pędzel 1x1 powiększony do NxN maluje wszędzie tę samą teksturę, pędzel złożony - swój wzór.
     */
    public getTextureAt(row: uint, column: uint): uint
    {
        if (this.isResizable()) {
            return this.textures[0][0];
        }

        return this.textures[row][column];
    }

    /** Tekstura pokazywana jako miniatura wiersza na liście */
    public getPreviewTextureId(): uint
    {
        return this.textures[0][0];
    }

    public collidesAt(textureId: uint): boolean
    {
        return this.config.collidesAt(textureId);
    }

    public getType(): string
    {
        return this.config.type;
    }

    public getSpeedFactor(): float
    {
        return this.config.speedFactor;
    }

    /**
     * Czy odcisk w nowym miejscu nachodziłby na odcisk w starym.
     *
     * Przeciąganie pędzlem złożonym stawia kolejny odcisk dopiero wtedy, gdy pędzel odjedzie
     * o cały swój bok - inaczej ciągnięcie posągu w górę o jeden kafel dałoby posąg
     * z wydłużonym tułowiem. Prostokąty nie nachodzą na siebie, gdy rozjadą się na dowolnej osi.
     */
    public overlaps(originX: uint, originY: uint, otherX: uint, otherY: uint): boolean
    {
        return Math.abs(originX - otherX) < this.getColumns()
            && Math.abs(originY - otherY) < this.getRows();
    }
}
