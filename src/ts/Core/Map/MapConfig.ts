export class MapConfig
{
    /** 100 tile w wierszu lub kolumnie chunka */
    public static readonly TILES_IN_ROW: uint = 100;
    public static readonly TILES_IN_CHUNK: uint = MapConfig.TILES_IN_ROW * MapConfig.TILES_IN_ROW;

    /** Świat: 100 x 100 chunków = 10 000 x 10 000 tile */
    public static readonly WORLD_CHUNKS_X: uint = 100;
    public static readonly WORLD_CHUNKS_Y: uint = 100;
    public static readonly WORLD_TILES_X: uint = MapConfig.WORLD_CHUNKS_X * MapConfig.TILES_IN_ROW;
    public static readonly WORLD_TILES_Y: uint = MapConfig.WORLD_CHUNKS_Y * MapConfig.TILES_IN_ROW;

    public static readonly LAYER_MIN: int = -8;
    public static readonly LAYER_MAX: int = 8;
    public static readonly LAYER_COUNT: uint = MapConfig.LAYER_MAX - MapConfig.LAYER_MIN + 1;
    public static readonly GROUND_LAYER: int = 0;

    /**
     * Brak kafla. Wartość logiczna widziana przez cały kod; w tablicach u16 zapisujemy ją
     * jako EMPTY_TILE_STORED, bo Uint16Array nie przechowa liczby ujemnej.
     */
    public static readonly EMPTY_TILE: int = -1;
    public static readonly EMPTY_TILE_STORED: uint = 0xFFFF;
    /**
     * Komorka ze stosem, obiektami albo wlasnymi wlasciwosciami nie miesci sie w gestej tablicy -
     * siedzi w slowniku komorek chunka, a tu zostaje ten znacznik.
     */
    public static readonly COMPLEX_CELL_STORED: uint = 0xFFFE;
    /** tileId 0 to pierwsza tekstura (0.jpg), więc identyfikator kafla = identyfikator tekstury */
    public static readonly FIRST_TILE_ID: uint = 0;
    public static readonly MAX_TILE_ID: uint = 65533;

    public static readonly TILE_STRIDE: bytes = 2;
    /** Rozmiar warstwy zapisanej gęsto */
    public static readonly LAYER_SIZE: bytes = MapConfig.TILES_IN_CHUNK * MapConfig.TILE_STRIDE;

    /** warstwa -8..8 -> slot 0..16 */
    public static toLayerIndex(layer: int): uint
    {
        if (layer < MapConfig.LAYER_MIN || layer > MapConfig.LAYER_MAX) {
            throw new Error(`Layer out of range: ${layer}. Expected ${MapConfig.LAYER_MIN}..${MapConfig.LAYER_MAX}`);
        }

        return layer - MapConfig.LAYER_MIN;
    }

    /** slot 0..16 -> warstwa -8..8 */
    public static toLayer(layerIndex: uint): int
    {
        return layerIndex + MapConfig.LAYER_MIN;
    }

    /** Klucz chunka w bazie i w pamięci */
    public static toChunkIndex(coords: coordsChunk): uint
    {
        if (coords.cx >= MapConfig.WORLD_CHUNKS_X || coords.cy >= MapConfig.WORLD_CHUNKS_Y) {
            throw new Error(`Chunk out of world: ${coords.cx}x${coords.cy}`);
        }

        return coords.cy * MapConfig.WORLD_CHUNKS_X + coords.cx;
    }

    public static toChunkCoords(chunkIndex: uint): coordsChunk
    {
        return {
            cx: chunkIndex % MapConfig.WORLD_CHUNKS_X,
            cy: Math.floor(chunkIndex / MapConfig.WORLD_CHUNKS_X),
        };
    }

    /** Pozycja tile wewnątrz chunka -> indeks w tablicy warstwy */
    public static toTileIndex(localX: uint, localY: uint): uint
    {
        return localY * MapConfig.TILES_IN_ROW + localX;
    }
}
