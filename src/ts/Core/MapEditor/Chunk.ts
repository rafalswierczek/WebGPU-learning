import { Tile } from "./Tile";

export class Chunk
{
    /** 100 tiles per row or column */
    public static readonly TILES_IN_ROW: uint = 100;
    /**
     * {
     *     layer-8: [tile1,     ..., tile1000],
     *     layer-7: [tile1001,  ..., tile2000],
     *     layer-6: [tile2001,  ..., tile3000],
     *     layer-5: [tile3001,  ..., tile4000],
     *     layer-4: [tile4001,  ..., tile5000],
     *     layer-3: [tile5001,  ..., tile6000],
     *     layer-2: [tile6001,  ..., tile7000],
     *     layer-1: [tile7001,  ..., tile8000],
     *     layer0:  [tile8001,  ..., tile9000],
     *     layer1:  [tile9001,  ..., tile10000],
     *     layer2:  [tile10001, ..., tile11000],
     *     layer3:  [tile11001, ..., tile12000],
     *     layer4:  [tile12001, ..., tile13000],
     *     layer5:  [tile13001, ..., tile14000],
     *     layer6:  [tile14001, ..., tile15000],
     *     layer7:  [tile15001, ..., tile16000],
     *     layer8:  [tile16001, ..., tile17000],
     * }
     */
    public readonly layers: Record<string, Tile[]>;
    public readonly coords: coordsWs;
    public readonly size: bytes;

    public constructor(coords: coordsWs, layers: Record<string, Tile[]>)
    {
        for (const layer of Object.values(layers)) {
            if (layer.length !== Chunk.TILES_IN_ROW * Chunk.TILES_IN_ROW) {
                throw new Error(`Wrong layer tile count: ${layer.length}`);
            }
        }

        this.layers = layers;
        this.coords = coords;
        this.size = Object.values(layers).reduce((sum, layer) => sum + layer.length * Tile.SIZE, 0); // 17 (layers) * 1000 (tile per layer) * 9 (tile size bytes) = 153 000 bytes
    }
}
