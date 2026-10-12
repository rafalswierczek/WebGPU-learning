import { Chunk } from "../Core/Map/Chunk";
import { ChunkCodec } from "../Core/Map/ChunkCodec";
import { MapConfig } from "../Core/Map/MapConfig";

/**
 * Testy round-trip formatu binarnego. Uruchamiane z konsoli: runTests()
 *
 * Format binarny to jedyne miejsce w projekcie, gdzie błąd o jeden bajt w offsecie objawia się
 * trzy tygodnie później jako "mapa wygląda dziwnie", więc sprawdzamy go od razu.
 */
export class ChunkCodecTest
{
    private passed: uint = 0;
    private failed: uint = 0;

    public run(): boolean
    {
        this.passed = 0;
        this.failed = 0;

        this.emptyChunkTakesHeaderOnly();
        this.tileIdZeroIsARealTile();
        this.denseGroundSurvivesRoundTrip();
        this.sparseLayerSurvivesRoundTrip();
        this.sparseLayerIsSmallerThanDense();
        this.allLayersSurviveRoundTrip();
        this.compactDropsZeroedLayer();
        this.badMagicIsRejected();
        this.badVersionIsRejected();
        this.worldCoordsSurviveRoundTrip();

        const ok: boolean = this.failed === 0;

        console.log(
            `%cChunkCodec: ${this.passed} passed, ${this.failed} failed`,
            `color: ${ok ? 'green' : 'red'}; font-weight: bold;`
        );

        return ok;
    }

    private emptyChunkTakesHeaderOnly(): void
    {
        const buffer: ArrayBuffer = ChunkCodec.encode(new Chunk({ cx: 0, cy: 0 }));

        const emptySize: bytes = ChunkCodec.HEADER_SIZE + ChunkCodec.COMPLEX_COUNT_SIZE;

        this.assert('empty chunk is header plus empty cell section', buffer.byteLength === emptySize, `${buffer.byteLength} B`);
        this.assert('empty chunk decodes to no layers', ChunkCodec.decode(buffer).getFilledLayerCount() === 0);
    }

    /** Regresja: 0 to pierwsza tekstura, a pustke oznacza -1 */
    private tileIdZeroIsARealTile(): void
    {
        const chunk: Chunk = new Chunk({ cx: 0, cy: 0 });

        chunk.setTile(MapConfig.GROUND_LAYER, 4, 4, 0);

        this.assert('freshly allocated layer is empty, not full of tile 0',
            chunk.getTile(MapConfig.GROUND_LAYER, 5, 5) === MapConfig.EMPTY_TILE);
        this.assert('tile 0 is stored as a real tile', chunk.getTile(MapConfig.GROUND_LAYER, 4, 4) === 0);
        this.assert('one tile counted', chunk.getFilledTileCount(MapConfig.GROUND_LAYER) === 1);

        const decoded: Chunk = ChunkCodec.decode(ChunkCodec.encode(chunk));

        this.assert('tile 0 survives round trip', decoded.getTile(MapConfig.GROUND_LAYER, 4, 4) === 0);
        this.assert('empty stays empty after round trip',
            decoded.getTile(MapConfig.GROUND_LAYER, 5, 5) === MapConfig.EMPTY_TILE);
    }

    private denseGroundSurvivesRoundTrip(): void
    {
        const chunk: Chunk = new Chunk({ cx: 2, cy: 1 });

        for (let y: uint = 0; y < MapConfig.TILES_IN_ROW; y++) {
            for (let x: uint = 0; x < MapConfig.TILES_IN_ROW; x++) {
                chunk.setTile(MapConfig.GROUND_LAYER, x, y, 1 + ((x * 7 + y * 13) % 500));
            }
        }

        const decoded: Chunk = ChunkCodec.decode(ChunkCodec.encode(chunk));

        this.assert('dense ground round trip', this.sameChunk(chunk, decoded));
        this.assert('dense ground keeps coords', decoded.coords.cx === 2 && decoded.coords.cy === 1);
    }

    private sparseLayerSurvivesRoundTrip(): void
    {
        const chunk: Chunk = new Chunk({ cx: 0, cy: 0 });

        for (let i: uint = 0; i < 40; i++) {
            chunk.setTile(3, i * 2, i, 6000 + i);
        }

        const decoded: Chunk = ChunkCodec.decode(ChunkCodec.encode(chunk));

        this.assert('sparse layer round trip', this.sameChunk(chunk, decoded));
        this.assert('sparse layer keeps a sample tile', decoded.getTile(3, 10, 5) === 6005, `${decoded.getTile(3, 10, 5)}`);
        this.assert('sparse layer keeps holes empty', decoded.getTile(3, 11, 5) === MapConfig.EMPTY_TILE);
    }

    private sparseLayerIsSmallerThanDense(): void
    {
        const chunk: Chunk = new Chunk({ cx: 0, cy: 0 });

        for (let i: uint = 0; i < 40; i++) {
            chunk.setTile(1, i, i, 5000);
        }

        const size: bytes = ChunkCodec.encode(chunk).byteLength;
        const expected: bytes = ChunkCodec.HEADER_SIZE + 4 + 40 * 4 + ChunkCodec.COMPLEX_COUNT_SIZE;

        this.assert('40 tiles are stored sparsely', size === expected, `${size} B, expected ${expected} B`);
    }

    private allLayersSurviveRoundTrip(): void
    {
        const chunk: Chunk = new Chunk({ cx: 5, cy: 7 });

        for (let layer: int = MapConfig.LAYER_MIN; layer <= MapConfig.LAYER_MAX; layer++) {
            for (let y: uint = 0; y < MapConfig.TILES_IN_ROW; y++) {
                for (let x: uint = 0; x < MapConfig.TILES_IN_ROW; x++) {
                    chunk.setTile(layer, x, y, 1 + ((x + y + layer + 8) % 1000));
                }
            }
        }

        const decoded: Chunk = ChunkCodec.decode(ChunkCodec.encode(chunk));

        this.assert('all 17 layers round trip', this.sameChunk(chunk, decoded));
        this.assert('all 17 layers are filled', decoded.getFilledLayerCount() === MapConfig.LAYER_COUNT);
    }

    private compactDropsZeroedLayer(): void
    {
        const chunk: Chunk = new Chunk({ cx: 0, cy: 0 });

        chunk.setTile(4, 10, 10, 123);
        this.assert('layer exists after setTile', chunk.hasLayer(4));

        chunk.setTile(4, 10, 10, MapConfig.EMPTY_TILE);
        chunk.compact();

        this.assert('compact drops zeroed layer', chunk.hasLayer(4) === false);
        this.assert(
            'compacted chunk encodes to header plus empty cell section',
            ChunkCodec.encode(chunk).byteLength === ChunkCodec.HEADER_SIZE + ChunkCodec.COMPLEX_COUNT_SIZE,
        );
    }

    private badMagicIsRejected(): void
    {
        const buffer: ArrayBuffer = ChunkCodec.encode(new Chunk({ cx: 0, cy: 0 }));

        new DataView(buffer).setUint32(0, 0xDEADBEEF, true);

        this.assertThrows('bad magic is rejected', () => ChunkCodec.decode(buffer));
    }

    private badVersionIsRejected(): void
    {
        const buffer: ArrayBuffer = ChunkCodec.encode(new Chunk({ cx: 0, cy: 0 }));

        new DataView(buffer).setUint16(4, 99, true);

        this.assertThrows('bad version is rejected', () => ChunkCodec.decode(buffer));
    }

    private worldCoordsSurviveRoundTrip(): void
    {
        const coords: coordsChunk = { cx: MapConfig.WORLD_CHUNKS_X - 1, cy: MapConfig.WORLD_CHUNKS_Y - 1 };
        const chunk: Chunk = new Chunk(coords);

        chunk.setTile(MapConfig.GROUND_LAYER, 0, 0, 1);

        const decoded: Chunk = ChunkCodec.decode(ChunkCodec.encode(chunk));

        this.assert(
            'far chunk coords survive (u32, not u16)',
            decoded.coords.cx === coords.cx && decoded.coords.cy === coords.cy,
            `${decoded.coords.cx}x${decoded.coords.cy}`
        );
    }

    private sameChunk(expected: Chunk, actual: Chunk): boolean
    {
        if (expected.getLayerMask() !== actual.getLayerMask()) {
            return false;
        }

        for (let layer: int = MapConfig.LAYER_MIN; layer <= MapConfig.LAYER_MAX; layer++) {
            const expectedTiles: Uint16Array|null = expected.getLayer(layer);
            const actualTiles: Uint16Array|null = actual.getLayer(layer);

            if (expectedTiles === null || actualTiles === null) {
                continue;
            }

            for (let i: uint = 0; i < expectedTiles.length; i++) {
                if (expectedTiles[i] !== actualTiles[i]) {
                    return false;
                }
            }
        }

        return true;
    }

    private assert(name: string, condition: boolean, detail: string = ''): void
    {
        if (condition) {
            this.passed++;

            return;
        }

        this.failed++;
        console.error(`FAIL: ${name}${detail === '' ? '' : ` (${detail})`}`);
    }

    private assertThrows(name: string, callback: () => void): void
    {
        try {
            callback();
        } catch (exception) {
            this.passed++;

            return;
        }

        this.failed++;
        console.error(`FAIL: ${name} (no exception thrown)`);
    }
}
