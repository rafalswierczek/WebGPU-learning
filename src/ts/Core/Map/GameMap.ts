import { Cell } from "./Cell";
import { Chunk } from "./Chunk";
import { MapConfig } from "./MapConfig";

/**
 * Jedyna mapa w projekcie. Ta sama instancja obsługuje grę i edytor - edytor edytuje prawdziwą mapę.
 *
 * Chunki są trzymane rzadko: nieistniejący chunk nie zajmuje pamięci, więc pusta mapa kosztuje zero,
 * a rośnie dopiero w miarę stawiania kafli.
 */
export class GameMap
{
    private readonly chunks: Map<uint, Chunk> = new Map<uint, Chunk>();

    /** Indeksy chunków zmienionych od ostatniego zapisu */
    private readonly dirtyChunks: Set<uint> = new Set<uint>();

    /** Rośnie przy każdej zmianie zawartości - renderer po tym poznaje, że musi przebudować bufory */
    private version: uint = 0;

    public getVersion(): uint
    {
        return this.version;
    }

    public getChunk(coords: coordsChunk): Chunk|null
    {
        return this.chunks.get(MapConfig.toChunkIndex(coords)) ?? null;
    }

    public getChunkByIndex(chunkIndex: uint): Chunk|null
    {
        return this.chunks.get(chunkIndex) ?? null;
    }

    public getChunks(): IterableIterator<Chunk>
    {
        return this.chunks.values();
    }

    public getChunkCount(): uint
    {
        return this.chunks.size;
    }

    /** Wstawia chunk bez oznaczania go jako brudny. Używane przy wczytywaniu z bazy. */
    public putLoadedChunk(chunk: Chunk): void
    {
        this.chunks.set(chunk.getIndex(), chunk);
        this.version++;
    }

    /** Wstawia chunk i oznacza go do zapisu. Używane przez generator i edytor. */
    public putChunk(chunk: Chunk): void
    {
        const chunkIndex: uint = chunk.getIndex();

        this.chunks.set(chunkIndex, chunk);
        this.dirtyChunks.add(chunkIndex);
        this.version++;
    }

    public getTile(layer: int, tileX: uint, tileY: uint): int
    {
        const chunk: Chunk|null = this.chunks.get(GameMap.chunkIndexOfTile(tileX, tileY)) ?? null;

        if (chunk === null) {
            return MapConfig.EMPTY_TILE;
        }

        return chunk.getTile(layer, tileX % MapConfig.TILES_IN_ROW, tileY % MapConfig.TILES_IN_ROW);
    }

    /** Pełna komórka albo null, gdy pusta */
    public getCell(layer: int, tileX: uint, tileY: uint): Cell|null
    {
        const chunk: Chunk|undefined = this.chunks.get(GameMap.chunkIndexOfTile(tileX, tileY));

        if (chunk === undefined) {
            return null;
        }

        return chunk.getCell(layer, tileX % MapConfig.TILES_IN_ROW, tileY % MapConfig.TILES_IN_ROW);
    }

    /** Dokłada tile na wierzch stosu tile tej komórki */
    public pushTile(layer: int, tileX: uint, tileY: uint, tileId: uint): void
    {
        this.editCell(layer, tileX, tileY, (cell: Cell): void => cell.pushTile(tileId));
    }

    /** Dokłada obiekt na wierzch stosu obiektów tej komórki */
    public pushObject(layer: int, tileX: uint, tileY: uint, objectId: uint): void
    {
        this.editCell(layer, tileX, tileY, (cell: Cell): void => cell.pushObject(objectId));
    }

    /** Zdejmuje z wierzchu komórki: najpierw obiekty, potem kafelki */
    public popTop(layer: int, tileX: uint, tileY: uint): boolean
    {
        let removed: boolean = false;

        this.editCell(layer, tileX, tileY, (cell: Cell): void => {
            removed = cell.popTop();
        });

        return removed;
    }

    private editCell(layer: int, tileX: uint, tileY: uint, change: (cell: Cell) => void): void
    {
        GameMap.validateTileCoords(tileX, tileY);

        const chunkIndex: uint = GameMap.chunkIndexOfTile(tileX, tileY);
        let chunk: Chunk|undefined = this.chunks.get(chunkIndex);

        if (chunk === undefined) {
            chunk = new Chunk(MapConfig.toChunkCoords(chunkIndex));
            this.chunks.set(chunkIndex, chunk);
        }

        const localX: uint = tileX % MapConfig.TILES_IN_ROW;
        const localY: uint = tileY % MapConfig.TILES_IN_ROW;
        const cell: Cell = chunk.getOrCreateCell(layer, localX, localY);

        change(cell);

        chunk.storeCell(layer, localX, localY, cell);
        this.dirtyChunks.add(chunkIndex);
        this.version++;
    }

    public setTile(layer: int, tileX: uint, tileY: uint, tileId: int): void
    {
        GameMap.validateTileCoords(tileX, tileY);

        const chunkIndex: uint = GameMap.chunkIndexOfTile(tileX, tileY);
        let chunk: Chunk|undefined = this.chunks.get(chunkIndex);

        if (chunk === undefined) {
            if (tileId === MapConfig.EMPTY_TILE) {
                return; // nie tworzymy chunka po to, żeby wpisać do niego pustkę
            }

            chunk = new Chunk(MapConfig.toChunkCoords(chunkIndex));
            this.chunks.set(chunkIndex, chunk);
        }

        chunk.setTile(layer, tileX % MapConfig.TILES_IN_ROW, tileY % MapConfig.TILES_IN_ROW, tileId);
        this.dirtyChunks.add(chunkIndex);
        this.version++;
    }

    public getDirtyChunks(): Chunk[]
    {
        const dirty: Chunk[] = [];

        for (const chunkIndex of this.dirtyChunks) {
            const chunk: Chunk|undefined = this.chunks.get(chunkIndex);

            if (chunk !== undefined) {
                dirty.push(chunk);
            }
        }

        return dirty;
    }

    public hasDirtyChunks(): boolean
    {
        return this.dirtyChunks.size > 0;
    }

    public markAllDirty(): void
    {
        for (const chunkIndex of this.chunks.keys()) {
            this.dirtyChunks.add(chunkIndex);
        }
    }

    public clearDirty(): void
    {
        this.dirtyChunks.clear();
    }

    public clear(): void
    {
        this.chunks.clear();
        this.dirtyChunks.clear();
        this.version++;
    }

    /**
     * allocatedLayers = liczba faktycznie zaalokowanych tablic warstw we wszystkich chunkach.
     * Chunk ma 17 slotów, ale pusty slot to null, więc ta liczba mówi, ile warstw naprawdę istnieje
     * i ile pamięci zajmuje mapa (każda tablica to TILES_IN_CHUNK * TILE_STRIDE bajtów).
     *
     * unsavedChunks = ile chunków zmieniono od ostatniego zapisu do bazy.
     */
    public getStats(): { chunks: uint, allocatedLayers: uint, unsavedChunks: uint, ramBytes: bytes }
    {
        let allocatedLayers: uint = 0;

        for (const chunk of this.chunks.values()) {
            allocatedLayers += chunk.getFilledLayerCount();
        }

        return {
            chunks: this.chunks.size,
            allocatedLayers: allocatedLayers,
            unsavedChunks: this.dirtyChunks.size,
            ramBytes: allocatedLayers * MapConfig.LAYER_SIZE,
        };
    }

    /** Klucz komórki na czas jednego pociągnięcia pędzla */
    public static cellKey(layer: int, tileX: uint, tileY: uint): string
    {
        return `${layer}:${tileX}:${tileY}`;
    }

    private static chunkIndexOfTile(tileX: uint, tileY: uint): uint
    {
        return MapConfig.toChunkIndex({
            cx: Math.floor(tileX / MapConfig.TILES_IN_ROW),
            cy: Math.floor(tileY / MapConfig.TILES_IN_ROW),
        });
    }

    private static validateTileCoords(tileX: uint, tileY: uint): void
    {
        if (tileX < 0 || tileY < 0 || tileX >= MapConfig.WORLD_TILES_X || tileY >= MapConfig.WORLD_TILES_Y) {
            throw new Error(`Tile out of world: ${tileX}x${tileY}`);
        }
    }
}
