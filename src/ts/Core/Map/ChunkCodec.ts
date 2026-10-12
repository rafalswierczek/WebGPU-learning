import { Cell } from "./Cell";
import { Chunk } from "./Chunk";
import { MapConfig } from "./MapConfig";

/**
 * Format pliku chunka (little-endian, bo dzięki temu dane warstw są binarnie identyczne
 * z Uint16Array w pamięci i dekodowanie warstwy to jedno kopiowanie bloku zamiast pętli po tile).
 *
 * offset  typ      pole          wartość
 * --------------------------------------------------------------
 *  0      u32      magic         0x56544D50 ("VTMP")
 *  4      u16      version       ChunkCodec.VERSION
 *  6      u8       tileStride    2
 *  7      u8       layerCount    17
 *  8      u16      tilesInRow    100
 * 10      u16      reserved      0
 * 12      u32      originTileX   cx * tilesInRow
 * 16      u32      originTileY   cy * tilesInRow
 * 20      u32      layerMask     bit i = slot i obecny
 * 24      u8[17]   layerMode     0=EMPTY, 1=DENSE, 2=SPARSE
 * 41      u8[7]    padding       0
 * --------------------------------------------------------------
 * 48      dane obecnych warstw, rosnąco po indeksie slotu
 *
 * Warstwa DENSE:  20 000 B (u16 na tile)
 * Warstwa SPARSE: u32 count, potem count * u32 spakowane jako (tileIndex << 16) | tileId
 *
 * Pusta warstwa nie zajmuje ani jednego bajtu - jest tylko wyzerowanym bitem w layerMask.
 * Warstwa rzadka nie zapisuje pustych tile - zapisuje wyłącznie te, które istnieją.
 *
 * Gęsta tablica trzyma teksturę komórki z jednym domyślnym kafelkiem. Komórka ze stosem,
 * obiektami albo własnymi właściwościami dostaje znacznik COMPLEX_CELL_STORED, a jej zawartość
 * ląduje w sekcji za warstwami:
 *   u32 recordCount, potem rekordy:
 *   u8 layerIndex | u8 tileCount | u16 cellIndex | u16 objectCount | u16 reserved
 *   tileCount   * u16 tileId
 *   objectCount * u16 objectId
 *
 * Stosy trzymają same identyfikatory - właściwości leżą w rejestrach zapisywanych obok mapy.
 */
export class ChunkCodec
{
    public static readonly MAGIC: uint = 0x56544D50;
    /**
     * Numer formatu. Czytany jest WYLACZNIE ten jeden - starsze zapisy sa odrzucane, a nie
     * konwertowane. Jestesmy w fazie, w ktorej baze i tak kasuje sie przy kazdym tescie,
     * a kod czytajacy piec nieaktualnych ukladow bajtow kosztowalby wiecej niz jest wart.
     */
    public static readonly VERSION: uint = 1;

    public static readonly COMPLEX_COUNT_SIZE: bytes = 4;
    private static readonly RECORD_HEADER_SIZE: bytes = 8;
    private static readonly ID_SIZE: bytes = 2;
    public static readonly HEADER_SIZE: bytes = 48;

    private static readonly MODE_EMPTY: uint = 0;
    private static readonly MODE_DENSE: uint = 1;
    private static readonly MODE_SPARSE: uint = 2;

    private static readonly OFFSET_LAYER_MODE: bytes = 24;
    private static readonly SPARSE_ENTRY_SIZE: bytes = 4;
    private static readonly SPARSE_COUNT_SIZE: bytes = 4;

    public static encode(chunk: Chunk): ArrayBuffer
    {
        const modes: uint[] = [];
        const sizes: bytes[] = [];
        let payloadSize: bytes = 0;

        for (let layerIndex: uint = 0; layerIndex < MapConfig.LAYER_COUNT; layerIndex++) {
            const layer: int = MapConfig.toLayer(layerIndex);
            const tiles: Uint16Array|null = chunk.getLayer(layer);

            if (tiles === null) {
                modes.push(ChunkCodec.MODE_EMPTY);
                sizes.push(0);

                continue;
            }

            const filled: uint = chunk.getFilledTileCount(layer);
            const sparseSize: bytes = ChunkCodec.SPARSE_COUNT_SIZE + filled * ChunkCodec.SPARSE_ENTRY_SIZE;

            if (sparseSize < MapConfig.LAYER_SIZE) {
                modes.push(ChunkCodec.MODE_SPARSE);
                sizes.push(sparseSize);
                payloadSize += sparseSize;
            } else {
                modes.push(ChunkCodec.MODE_DENSE);
                sizes.push(MapConfig.LAYER_SIZE);
                payloadSize += MapConfig.LAYER_SIZE;
            }
        }

        const records: { layerIndex: uint, cellIndex: uint, cell: Cell }[] = ChunkCodec.collectCells(chunk);

        payloadSize += ChunkCodec.COMPLEX_COUNT_SIZE;

        for (const record of records) {
            payloadSize += ChunkCodec.RECORD_HEADER_SIZE
                + (record.cell.getTileStack().length + record.cell.getObjectStack().length) * ChunkCodec.ID_SIZE;
        }

        const buffer: ArrayBuffer = new ArrayBuffer(ChunkCodec.HEADER_SIZE + payloadSize);
        const view: DataView = new DataView(buffer);

        view.setUint32(0, ChunkCodec.MAGIC, true);
        view.setUint16(4, ChunkCodec.VERSION, true);
        view.setUint8(6, MapConfig.TILE_STRIDE);
        view.setUint8(7, MapConfig.LAYER_COUNT);
        view.setUint16(8, MapConfig.TILES_IN_ROW, true);
        view.setUint16(10, 0, true);
        view.setUint32(12, chunk.coords.cx * MapConfig.TILES_IN_ROW, true);
        view.setUint32(16, chunk.coords.cy * MapConfig.TILES_IN_ROW, true);
        view.setUint32(20, chunk.getLayerMask(), true);

        let offset: bytes = ChunkCodec.HEADER_SIZE;

        for (let layerIndex: uint = 0; layerIndex < MapConfig.LAYER_COUNT; layerIndex++) {
            view.setUint8(ChunkCodec.OFFSET_LAYER_MODE + layerIndex, modes[layerIndex]);

            if (modes[layerIndex] === ChunkCodec.MODE_EMPTY) {
                continue;
            }

            const tiles: Uint16Array = chunk.getLayer(MapConfig.toLayer(layerIndex)) as Uint16Array;

            if (modes[layerIndex] === ChunkCodec.MODE_DENSE) {
                new Uint16Array(buffer, offset, MapConfig.TILES_IN_CHUNK).set(tiles);
            } else {
                const count: uint = (sizes[layerIndex] - ChunkCodec.SPARSE_COUNT_SIZE) / ChunkCodec.SPARSE_ENTRY_SIZE;

                ChunkCodec.encodeSparseLayer(buffer, offset, tiles, count);
            }

            offset += sizes[layerIndex];
        }

        ChunkCodec.encodeCells(view, offset, records);

        return buffer;
    }

    public static decode(buffer: ArrayBuffer): Chunk
    {
        const view: DataView = new DataView(buffer);

        ChunkCodec.validateHeader(view, buffer.byteLength);

        const tilesInRow: uint = view.getUint16(8, true);
        const layerMask: uint = view.getUint32(20, true);
        const coords: coordsChunk = {
            cx: view.getUint32(12, true) / tilesInRow,
            cy: view.getUint32(16, true) / tilesInRow,
        };

        const layers: (Uint16Array|null)[] = new Array<Uint16Array|null>(MapConfig.LAYER_COUNT).fill(null);
        let offset: bytes = ChunkCodec.HEADER_SIZE;

        for (let layerIndex: uint = 0; layerIndex < MapConfig.LAYER_COUNT; layerIndex++) {
            const mode: uint = view.getUint8(ChunkCodec.OFFSET_LAYER_MODE + layerIndex);
            const present: boolean = (layerMask & (1 << layerIndex)) !== 0;

            if (present !== (mode !== ChunkCodec.MODE_EMPTY)) {
                throw new Error(`Layer ${MapConfig.toLayer(layerIndex)}: layerMask and layerMode disagree`);
            }

            if (mode === ChunkCodec.MODE_EMPTY) {
                continue;
            }

            if (mode === ChunkCodec.MODE_DENSE) {
                if (offset + MapConfig.LAYER_SIZE > buffer.byteLength) {
                    throw new Error(`Layer ${MapConfig.toLayer(layerIndex)}: dense payload out of bounds`);
                }

                // slice() daje kopię własną - bez niej chunk trzymałby przy życiu cały bufor pliku
                layers[layerIndex] = new Uint16Array(buffer, offset, MapConfig.TILES_IN_CHUNK).slice();
                offset += MapConfig.LAYER_SIZE;

                continue;
            }

            if (mode !== ChunkCodec.MODE_SPARSE) {
                throw new Error(`Layer ${MapConfig.toLayer(layerIndex)}: unsupported layer mode ${mode}`);
            }

            const count: uint = view.getUint32(offset, true);
            const sparseSize: bytes = ChunkCodec.SPARSE_COUNT_SIZE + count * ChunkCodec.SPARSE_ENTRY_SIZE;

            if (offset + sparseSize > buffer.byteLength) {
                throw new Error(`Layer ${MapConfig.toLayer(layerIndex)}: sparse payload out of bounds`);
            }

            layers[layerIndex] = ChunkCodec.decodeSparseLayer(buffer, offset, count);
            offset += sparseSize;
        }

        const chunk: Chunk = new Chunk(coords, layers);

        offset = ChunkCodec.decodeCells(view, offset, chunk);

        if (offset !== buffer.byteLength) {
            throw new Error(`Chunk size mismatch: consumed ${offset} B of ${buffer.byteLength} B`);
        }

        return chunk;
    }

    private static encodeSparseLayer(buffer: ArrayBuffer, offset: bytes, tiles: Uint16Array, count: uint): void
    {
        const view: DataView = new DataView(buffer);

        view.setUint32(offset, count, true);

        const entries: Uint32Array = new Uint32Array(buffer, offset + ChunkCodec.SPARSE_COUNT_SIZE, count);
        let entryIndex: uint = 0;

        for (let tileIndex: uint = 0; tileIndex < tiles.length; tileIndex++) {
            if (tiles[tileIndex] !== MapConfig.EMPTY_TILE_STORED) {
                entries[entryIndex] = ((tileIndex << 16) | tiles[tileIndex]) >>> 0;
                entryIndex++;
            }
        }
    }

    private static decodeSparseLayer(buffer: ArrayBuffer, offset: bytes, count: uint): Uint16Array
    {
        const tiles: Uint16Array = Chunk.createLayer();
        const entries: Uint32Array = new Uint32Array(buffer, offset + ChunkCodec.SPARSE_COUNT_SIZE, count);

        for (let entryIndex: uint = 0; entryIndex < entries.length; entryIndex++) {
            const packed: uint = entries[entryIndex];
            const tileIndex: uint = packed >>> 16;

            if (tileIndex >= MapConfig.TILES_IN_CHUNK) {
                throw new Error(`Sparse entry points outside chunk: ${tileIndex}`);
            }

            tiles[tileIndex] = packed & 0xFFFF;
        }

        return tiles;
    }

    private static collectCells(chunk: Chunk): { layerIndex: uint, cellIndex: uint, cell: Cell }[]
    {
        const records: { layerIndex: uint, cellIndex: uint, cell: Cell }[] = [];

        for (let layerIndex: uint = 0; layerIndex < MapConfig.LAYER_COUNT; layerIndex++) {
            const complex: Map<uint, Cell>|null = chunk.getComplexCells(MapConfig.toLayer(layerIndex));

            if (complex === null) {
                continue;
            }

            for (const [cellIndex, cell] of complex) {
                records.push({ layerIndex: layerIndex, cellIndex: cellIndex, cell: cell });
            }
        }

        return records;
    }

    private static encodeCells(
        view: DataView,
        offset: bytes,
        records: { layerIndex: uint, cellIndex: uint, cell: Cell }[],
    ): void {
        view.setUint32(offset, records.length, true);

        let cursor: bytes = offset + ChunkCodec.COMPLEX_COUNT_SIZE;

        for (const record of records) {
            const tiles: uint[] = record.cell.getTileStack();
            const objects: uint[] = record.cell.getObjectStack();

            view.setUint8(cursor, record.layerIndex);
            view.setUint8(cursor + 1, tiles.length);
            view.setUint16(cursor + 2, record.cellIndex, true);
            view.setUint16(cursor + 4, objects.length, true);
            view.setUint16(cursor + 6, 0, true);

            cursor += ChunkCodec.RECORD_HEADER_SIZE;

            for (const tileId of tiles) {
                view.setUint16(cursor, tileId, true);

                cursor += ChunkCodec.ID_SIZE;
            }

            for (const objectId of objects) {
                view.setUint16(cursor, objectId, true);

                cursor += ChunkCodec.ID_SIZE;
            }
        }
    }

    /** @returns offset za sekcją */
    private static decodeCells(view: DataView, offset: bytes, chunk: Chunk): bytes
    {
        const count: uint = view.getUint32(offset, true);
        let cursor: bytes = offset + ChunkCodec.COMPLEX_COUNT_SIZE;

        for (let i: uint = 0; i < count; i++) {
            const layerIndex: uint = view.getUint8(cursor);
            const tileCount: uint = view.getUint8(cursor + 1);
            const cellIndex: uint = view.getUint16(cursor + 2, true);
            const objectCount: uint = view.getUint16(cursor + 4, true);
            const cell: Cell = new Cell();

            cursor += ChunkCodec.RECORD_HEADER_SIZE;

            for (let t: uint = 0; t < tileCount; t++) {
                cell.pushTile(view.getUint16(cursor, true));

                cursor += ChunkCodec.ID_SIZE;
            }

            for (let o: uint = 0; o < objectCount; o++) {
                cell.pushObject(view.getUint16(cursor, true));

                cursor += ChunkCodec.ID_SIZE;
            }

            chunk.storeCell(
                MapConfig.toLayer(layerIndex),
                cellIndex % MapConfig.TILES_IN_ROW,
                Math.floor(cellIndex / MapConfig.TILES_IN_ROW),
                cell,
            );
        }

        return cursor;
    }

    private static validateHeader(view: DataView, byteLength: bytes): void
    {
        if (byteLength < ChunkCodec.HEADER_SIZE) {
            throw new Error(`Chunk too short: ${byteLength} B`);
        }

        if (view.getUint32(0, true) !== ChunkCodec.MAGIC) {
            throw new Error('Not a chunk file (bad magic)');
        }

        const version: uint = view.getUint16(4, true);

        if (version !== ChunkCodec.VERSION) {
            throw new Error(
                `Unsupported chunk version: ${version}.`
                + ` Expected ${ChunkCodec.VERSION}`
            );
        }

        const tileStride: uint = view.getUint8(6);

        if (tileStride !== MapConfig.TILE_STRIDE) {
            throw new Error(`Tile stride mismatch: ${tileStride} vs ${MapConfig.TILE_STRIDE}`);
        }

        const layerCount: uint = view.getUint8(7);

        if (layerCount !== MapConfig.LAYER_COUNT) {
            throw new Error(`Layer count mismatch: ${layerCount} vs ${MapConfig.LAYER_COUNT}`);
        }

        const tilesInRow: uint = view.getUint16(8, true);

        if (tilesInRow !== MapConfig.TILES_IN_ROW) {
            throw new Error(`Tiles in row mismatch: ${tilesInRow} vs ${MapConfig.TILES_IN_ROW}`);
        }
    }
}
