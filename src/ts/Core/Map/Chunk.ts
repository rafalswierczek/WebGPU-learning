import { Cell } from "./Cell";
import { MapConfig } from "./MapConfig";

export class Chunk
{
    public readonly coords: coordsChunk;

    /**
     * 17 slotów warstw (-8..8 -> 0..16).
     * null = warstwa nie istnieje w tym chunku: nie zajmuje pamięci i nie trafia do pliku.
     */
    private readonly layers: (Uint16Array|null)[];

    /**
     * Komórki, które nie mieszczą się w gęstej tablicy: mają stos, obiekty albo własne właściwości.
     * Jeden słownik na warstwę, klucz to indeks komórki w chunku. Komórka z jednym domyślnym
     * kafelkiem nigdy tu nie trafia, więc typowa mapa nadal kosztuje 2 bajty na komórkę.
     */
    private readonly complexCells: (Map<uint, Cell>|null)[];

    public constructor(coords: coordsChunk, layers?: (Uint16Array|null)[])
    {
        this.coords = coords;
        this.layers = layers ?? new Array<Uint16Array|null>(MapConfig.LAYER_COUNT).fill(null);
        this.complexCells = new Array<Map<uint, Cell>|null>(MapConfig.LAYER_COUNT).fill(null);

        if (this.layers.length !== MapConfig.LAYER_COUNT) {
            throw new Error(`Expected ${MapConfig.LAYER_COUNT} layer slots, got ${this.layers.length}`);
        }

        for (let layerIndex: uint = 0; layerIndex < this.layers.length; layerIndex++) {
            const tiles: Uint16Array|null = this.layers[layerIndex];

            if (tiles !== null && tiles.length !== MapConfig.TILES_IN_CHUNK) {
                throw new Error(
                    `Layer ${MapConfig.toLayer(layerIndex)} has ${tiles.length} tiles, expected ${MapConfig.TILES_IN_CHUNK}`
                );
            }
        }
    }

    public getIndex(): uint
    {
        return MapConfig.toChunkIndex(this.coords);
    }

    public hasLayer(layer: int): boolean
    {
        return this.layers[MapConfig.toLayerIndex(layer)] !== null;
    }

    public getLayer(layer: int): Uint16Array|null
    {
        return this.layers[MapConfig.toLayerIndex(layer)];
    }

    /** Identyfikator tile na wierzchu stosu tile albo EMPTY_TILE */
    public getTile(layer: int, localX: uint, localY: uint): int
    {
        const cells: Uint16Array|null = this.layers[MapConfig.toLayerIndex(layer)];

        if (cells === null) {
            return MapConfig.EMPTY_TILE;
        }

        const stored: uint = cells[MapConfig.toTileIndex(localX, localY)];

        if (stored === MapConfig.EMPTY_TILE_STORED) {
            return MapConfig.EMPTY_TILE;
        }

        if (stored !== MapConfig.COMPLEX_CELL_STORED) {
            return stored;
        }

        return this.getCell(layer, localX, localY)?.getTopTileId() ?? MapConfig.EMPTY_TILE;
    }

    /** Pełna komórka albo null, gdy pusta. Komórka prosta jest materializowana na żądanie. */
    public getCell(layer: int, localX: uint, localY: uint): Cell|null
    {
        const layerIndex: uint = MapConfig.toLayerIndex(layer);
        const cells: Uint16Array|null = this.layers[layerIndex];

        if (cells === null) {
            return null;
        }

        const cellIndex: uint = MapConfig.toTileIndex(localX, localY);
        const stored: uint = cells[cellIndex];

        if (stored === MapConfig.EMPTY_TILE_STORED) {
            return null;
        }

        if (stored === MapConfig.COMPLEX_CELL_STORED) {
            return this.complexCells[layerIndex]?.get(cellIndex) ?? null;
        }

        const cell: Cell = new Cell();

        cell.pushTile(stored);

        return cell;
    }

    /**
     * Komórka gotowa do edycji. Zwróconą komórkę trzeba po zmianach oddać przez storeCell() -
     * komórka prosta jest materializowana kopią, więc bez zapisu zmiana by przepadła.
     */
    public getOrCreateCell(layer: int, localX: uint, localY: uint): Cell
    {
        return this.getCell(layer, localX, localY) ?? new Cell();
    }

    /** Zapisuje komórkę w najtańszej postaci: gęsto, gdy prosta, słownikiem w przeciwnym razie */
    public storeCell(layer: int, localX: uint, localY: uint, cell: Cell): void
    {
        const layerIndex: uint = MapConfig.toLayerIndex(layer);
        const cellIndex: uint = MapConfig.toTileIndex(localX, localY);

        if (this.layers[layerIndex] === null) {
            this.layers[layerIndex] = Chunk.createLayer();
        }

        const cells: Uint16Array = this.layers[layerIndex] as Uint16Array;
        const complex: Map<uint, Cell>|null = this.complexCells[layerIndex];

        if (complex !== null) {
            complex.delete(cellIndex);
        }

        if (cell.isEmpty()) {
            cells[cellIndex] = MapConfig.EMPTY_TILE_STORED;

            return;
        }

        // dwa najwyzsze kody sa zarezerwowane na znaczniki, wiec taki identyfikator idzie do slownika
        if (cell.isSimple() && cell.getTileStack()[0] <= MapConfig.MAX_TILE_ID) {
            cells[cellIndex] = cell.getTileStack()[0];

            return;
        }

        if (this.complexCells[layerIndex] === null) {
            this.complexCells[layerIndex] = new Map<uint, Cell>();
        }

        (this.complexCells[layerIndex] as Map<uint, Cell>).set(cellIndex, cell);
        cells[cellIndex] = MapConfig.COMPLEX_CELL_STORED;
    }

    public getComplexCells(layer: int): Map<uint, Cell>|null
    {
        return this.complexCells[MapConfig.toLayerIndex(layer)];
    }

    /** Alokuje warstwę dopiero wtedy, gdy faktycznie coś w niej stawiasz. */
    public setTile(layer: int, localX: uint, localY: uint, tileId: int): void
    {
        if (tileId !== MapConfig.EMPTY_TILE && (tileId < MapConfig.FIRST_TILE_ID || tileId > MapConfig.MAX_TILE_ID)) {
            throw new Error(`Tile id ${tileId} out of range ${MapConfig.FIRST_TILE_ID}..${MapConfig.MAX_TILE_ID}`);
        }

        const layerIndex: uint = MapConfig.toLayerIndex(layer);
        let tiles: Uint16Array|null = this.layers[layerIndex];

        if (tiles === null) {
            if (tileId === MapConfig.EMPTY_TILE) {
                return; // nie alokujemy 20 KB po to, żeby wpisać tam pustkę
            }

            tiles = Chunk.createLayer();
            this.layers[layerIndex] = tiles;
        }

        tiles[MapConfig.toTileIndex(localX, localY)] =
            tileId === MapConfig.EMPTY_TILE ? MapConfig.EMPTY_TILE_STORED : tileId;
    }

    /** Świeża warstwa jest pusta, a nie wypełniona kaflem o identyfikatorze 0 */
    public static createLayer(): Uint16Array
    {
        return new Uint16Array(MapConfig.TILES_IN_CHUNK).fill(MapConfig.EMPTY_TILE_STORED);
    }

    /** Zwalnia warstwy, które w całości wyzerowano. Wołane przed zapisem. */
    public compact(): void
    {
        for (let layerIndex: uint = 0; layerIndex < this.layers.length; layerIndex++) {
            const tiles: Uint16Array|null = this.layers[layerIndex];

            if (tiles !== null && tiles.every((stored: uint): boolean => stored === MapConfig.EMPTY_TILE_STORED)) {
                this.layers[layerIndex] = null;
                this.complexCells[layerIndex] = null;
            }
        }
    }

    /** Bit i = slot i jest niepusty. Trafia wprost do nagłówka pliku. */
    public getLayerMask(): uint
    {
        let mask: uint = 0;

        for (let layerIndex: uint = 0; layerIndex < this.layers.length; layerIndex++) {
            if (this.layers[layerIndex] !== null) {
                mask |= (1 << layerIndex);
            }
        }

        return mask;
    }

    public getFilledLayerCount(): uint
    {
        let count: uint = 0;

        for (const tiles of this.layers) {
            if (tiles !== null) {
                count++;
            }
        }

        return count;
    }

    /** Liczba niepustych tile w warstwie. Decyduje o wyborze zapisu gęstego albo rzadkiego. */
    public getFilledTileCount(layer: int): uint
    {
        const tiles: Uint16Array|null = this.layers[MapConfig.toLayerIndex(layer)];

        if (tiles === null) {
            return 0;
        }

        let count: uint = 0;

        for (let i: uint = 0; i < tiles.length; i++) {
            if (tiles[i] !== MapConfig.EMPTY_TILE_STORED) {
                count++;
            }
        }

        return count;
    }

    public isEmpty(): boolean
    {
        return this.getFilledLayerCount() === 0;
    }
}
