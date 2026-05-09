import JSZip from "jszip";
import { SquareConfig } from "../Config/SquareConfig";
import { Chunk } from "../MapEditor/Chunk";
import { Tile } from "../MapEditor/Tile";
import { MapGenerator } from "../MapEditor/MapGenerator";
import { Database } from "../Database";

export class MapEditorController
{
    private readonly canvas: HTMLCanvasElement;
    private readonly mapGenerator: MapGenerator;
    private readonly database: Database;
    private clickHandlerRef: any;
    private selectedTileCoords: coordsWs|null = null;

    public constructor(canvas: HTMLCanvasElement, mapGenerator: MapGenerator, database: Database)
    {
        this.canvas = canvas;
        this.mapGenerator = mapGenerator;
        this.database = database;
    }

    public saveExampleMap(): void
    {
        let lastTexId: uint = 1;

        const generateChunk = (coords: coordsWs, lastTexId: uint, chunkNumber: uint): void => {
            let layers: Record<string, Tile[]> = {};

            for (let layer = -8; layer <= 8; layer++) {
                let tiles: Tile[] = [];
                let texId;

                for (texId = lastTexId; texId <= 1000; texId++) {
                    tiles.push(new Tile(texId));
                }

                lastTexId = texId * chunkNumber + 1;

                layers['layer'+layer] = tiles;
            }

            this.mapGenerator.generateChunk(new Chunk(coords, layers))
        };

        const chunkLength: uint = Chunk.TILES_IN_ROW * SquareConfig.LENGTH;

        // row 1:
        generateChunk({'x': 0, 'y': 0}, lastTexId, 1);
        generateChunk({'x': chunkLength, 'y': 0}, lastTexId, 2);
        generateChunk({'x': chunkLength * 2, 'y': 0}, lastTexId, 3);
        // row 2:
        generateChunk({'x': 0, 'y': chunkLength}, lastTexId, 4);
        generateChunk({'x': chunkLength, 'y': chunkLength}, lastTexId, 5);
        generateChunk({'x': chunkLength * 2, 'y': chunkLength}, lastTexId, 6);
        // row 3:
        generateChunk({'x': 0, 'y': chunkLength * 2}, lastTexId, 7);
        generateChunk({'x': chunkLength, 'y': chunkLength * 2}, lastTexId, 8);
        generateChunk({'x': chunkLength * 2, 'y': chunkLength * 2}, lastTexId, 9);

        const mapBin: Record<string, Blob> = this.mapGenerator.getMapBin();

        this.database.saveMap(mapBin);
    }

    public start(cameraCoords: coordsWs): void
    {
        this.addClickListener(cameraCoords);
    }

    public stop(): void
    {
        this.removeClickListener();
    }

    public async download(mapBin: Record<string, Blob>): Promise<void>
    {
        if (Object.keys(mapBin).length === 0) {
            console.error('Cannot download map. Missing map binary');

            return;
        }

        const zip: JSZip = new JSZip();

        for (const [key, blob] of Object.entries(mapBin)) {
            zip.file(`${key}_chunk.vitamap`, blob);
        }

        const mapBlob: Blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

        const url = URL.createObjectURL(mapBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vita_map.zip`;
        a.click();
    
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    private addClickListener(cameraCoords: coordsWs): void
    {
        this.clickHandlerRef = this.clickHandler.bind(this, cameraCoords);

        this.canvas.addEventListener('click', this.clickHandlerRef);
    }

    private removeClickListener(): void
    {
        this.canvas.removeEventListener('click', this.clickHandlerRef);
    }

    private clickHandler(cameraCoords: coordsWs, event: PointerEvent)
    {
        const worldX: uint = cameraCoords.x + event.offsetX;
        const worldY: uint = cameraCoords.y + this.canvas.height - event.offsetY;

        this.selectedTileCoords = {
            x: worldX - (worldX % SquareConfig.LENGTH),
            y: worldY - (worldY % SquareConfig.LENGTH),
        };
    }
}
