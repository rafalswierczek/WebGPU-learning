import JSZip from "jszip";
import { SquareConfig } from "../Config/SquareConfig";

export class MapController
{
    private canvas: HTMLCanvasElement;
    private clickHandlerRef: any;
    private selectedTileCoords: coordsWs|null = null;

    public constructor(canvas: HTMLCanvasElement)
    {
        this.canvas = canvas;
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
