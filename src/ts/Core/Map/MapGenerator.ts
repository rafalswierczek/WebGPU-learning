import { Chunk } from "./Chunk";
import { GameMap } from "./GameMap";
import { MapConfig } from "./MapConfig";
import { Tile } from "./Tile";
import { TileRegistry } from "./TileRegistry";
import { TileType } from "./TileType";

/**
 * Tworzy zawartość testową. Nie zna się na binarce ani na bazie danych.
 *
 * Wszystkie 17 warstw jest tym samym rodzajem świata - terenem. Różni je tylko pokrycie:
 * warstwa 0 to poziom gruntu i jest wypełniona w całości, a im dalej od niej, tym mniej świata.
 * Warstwa 8 to czubki gór (parę skrawków terenu), warstwa -8 to podziemia (same tunele).
 *
 * Pokrycie maleje o połowę na każdy poziom, więc mapa testowa przechodzi przez oba tryby zapisu:
 * warstwy blisko 0 zapiszą się gęsto, dalsze rzadko.
 */
export class MapGenerator
{
    /** Pokrycie warstwy 0 */
    private static readonly BASE_COVERAGE: float = 1.0;
    /** Bok bloku terenu w kaflach - dzięki temu teren tworzy zwarte kawałki, a nie szum */
    private static readonly BLOB_SIZE: uint = 4;

    private readonly tiles: TileRegistry;
    /** Identyfikatory tekstur do losowania - generator nie zna biblioteki, dostaje gotową listę */
    private readonly textureIds: uint[];

    public constructor(tiles: TileRegistry, textureIds: uint[])
    {
        this.tiles = tiles;
        this.textureIds = textureIds;
    }


    public generateTestMap(map: GameMap, chunksX: uint = 3, chunksY: uint = 3): void
    {
        for (let cy: uint = 0; cy < chunksY; cy++) {
            for (let cx: uint = 0; cx < chunksX; cx++) {
                map.putChunk(this.generateChunk({ cx: cx, cy: cy }));
            }
        }
    }

    public generateChunk(coords: coordsChunk): Chunk
    {
        const chunk: Chunk = new Chunk(coords);

        for (let layer: int = MapConfig.LAYER_MIN; layer <= MapConfig.LAYER_MAX; layer++) {
            this.generateLayer(chunk, layer);
        }

        return chunk;
    }

    private generateLayer(chunk: Chunk, layer: int): void
    {
        const coverage: float = MapGenerator.getCoverage(layer);
        const threshold: uint = Math.round(coverage * 0xFFFF);

        for (let y: uint = 0; y < MapConfig.TILES_IN_ROW; y++) {
            for (let x: uint = 0; x < MapConfig.TILES_IN_ROW; x++) {
                if (!MapGenerator.isLand(chunk.coords, x, y, layer, threshold)) {
                    continue;
                }

                // mapa testowa losuje z tekstur, ktore naprawde sa na dysku
                const textureId: uint = this.textureIds[MapGenerator.hash(x, y, layer) % this.textureIds.length];

                this.tiles.ensure(textureId, '', false, false, TileType.DEFAULT, Tile.DEFAULT_SPEED_FACTOR);
                chunk.setTile(layer, x, y, textureId);
            }
        }
    }

    /** 100% na poziomie gruntu, o połowę mniej na każdy poziom w górę i w dół */
    private static getCoverage(layer: int): float
    {
        return MapGenerator.BASE_COVERAGE / Math.pow(2, Math.abs(layer));
    }

    /**
     * Decyzja podejmowana dla całego bloku BLOB_SIZE x BLOB_SIZE, żeby teren był zwarty.
     * Hash zamiast Math.random, bo ta sama mapa testowa ma wychodzić za każdym razem tak samo.
     */
    private static isLand(coords: coordsChunk, x: uint, y: uint, layer: int, threshold: uint): boolean
    {
        if (threshold >= 0xFFFF) {
            return true;
        }

        const blobX: uint = coords.cx * MapConfig.TILES_IN_ROW + Math.floor(x / MapGenerator.BLOB_SIZE);
        const blobY: uint = coords.cy * MapConfig.TILES_IN_ROW + Math.floor(y / MapGenerator.BLOB_SIZE);

        return MapGenerator.hash(blobX, blobY, layer) < threshold;
    }

    /** Prosty deterministyczny hash 0..65535 */
    private static hash(x: uint, y: uint, layer: int): uint
    {
        let value: uint = (x * 73856093) ^ (y * 19349663) ^ ((layer + 64) * 83492791);

        value = Math.imul(value ^ (value >>> 13), 1274126177);

        return (value ^ (value >>> 16)) & 0xFFFF;
    }
}
