import JSZip from "jszip";
import { Chunk } from "./Chunk";
import { Tile } from "./Tile";

export class MapGenerator
{
    private static readonly VERSION: uint = 1;
    private static readonly HEADER_SIZE: bytes = 5;
    /** mapBin["500x1000"] key is chunk.coords as string */
    private mapBin: Record<string, Blob> = {};

    public generateChunk(chunk: Chunk): void
    {
        const buffer = this.generateBinary(chunk);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });

        this.mapBin[`${chunk.coords.x}x${chunk.coords.y}`] = blob;
    }

    public getChunk(chunkCoords: coordsWs): Blob|null
    {
        return this.mapBin[`${chunkCoords.x}x${chunkCoords.y}`] ?? null;
    }

    public getMapBin(): Record<string, Blob>
    {
        return this.mapBin;
    }

    private generateBinary(chunk: Chunk): ArrayBuffer
    {
        const totalSize = chunk.size + MapGenerator.HEADER_SIZE;
        const data = new DataView(new ArrayBuffer(totalSize));

        this.setHeader(data, chunk.coords);
        this.setTiles(data, chunk.layers);

        const layerCount = Object.keys(chunk.layers).length;
        const chunkSize: bytes = MapGenerator.HEADER_SIZE + layerCount * Chunk.TILES_IN_ROW * Chunk.TILES_IN_ROW * Tile.SIZE;

        if (chunkSize !== data.byteLength) {
            throw new Error(`Wrong chunk size in bytes: ${data.byteLength}. Should be: ${chunkSize}`);
        }

        return data.buffer;
    }

    private setHeader(data: DataView, chunkCoors: coordsWs): void
    {
        data.setUint8(0, MapGenerator.VERSION);
        data.setUint16(1, chunkCoors.x);
        data.setUint16(3, chunkCoors.y);
    }

    private setTiles(data: DataView, chunkLayers: Record<string, Tile[]>): void
    {
        let index = 0;
        let tileOffset = 0;

        for (const tiles of Object.values(chunkLayers)) {
            for (const tile of tiles.values()) {
                tileOffset = MapGenerator.HEADER_SIZE + index * Tile.SIZE;
                index++;

                data.setUint32(tileOffset, tile.textureId, false);
                data.setUint8(tileOffset + 4, +tile.collision);
                data.setFloat32(tileOffset + 5, tile.speedFactor, false);
            }
        }
    }
}
