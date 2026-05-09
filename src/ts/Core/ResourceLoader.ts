import JSZip, { JSZipObject } from "jszip";
import { Database } from "./Database";

export class ResourceLoader
{
    private database: Database
    private spritesheets: Record<uint, ImageBitmap>|null = null;
    private mapBin: Record<string, Blob>|null = null;

    public constructor(database: Database)
    {
        this.database = database; 
    }

    public async getSpritesheets(): Promise<Record<uint, ImageBitmap>>
    {
        if (this.spritesheets !== null) {
            return this.spritesheets;
        }
        
        const spritesheetsDb: Record<uint, ImageBitmap> = await this.database.getSpritesheets();

        if (!empty(spritesheetsDb)) {
            this.spritesheets = spritesheetsDb;

            return spritesheetsDb;
        }

        const loadSpritesheet = async (id: uint): Promise<ImageBitmap> => {
            const response: Response = await fetch(`spritesheets/spritesheet_${id}.png`);
            const blob: Blob = await response.blob();
            
            return await createImageBitmap(blob);
        };

        const spritesheetsCount: uint = 3;
        const spritesheets: Record<uint, ImageBitmap> = {};
        const promises: Promise<void>[] = [];

        for (let i: uint = 0; i < spritesheetsCount; i++) {
            promises.push((async (): Promise<void> => {
                const bitmap: ImageBitmap = await loadSpritesheet(i);
                spritesheets[i] = bitmap;
            })());
        }

        await Promise.all(promises);

        this.spritesheets = spritesheets;
        this.database.saveSpritesheets(spritesheets).catch((err: Error): void => {
            console.error('Failed to save spritesheets to DB:', err);
        });

        return spritesheets;
    }

    public async getMapBin(): Promise<Record<string, Blob>>
    {
        if (this.mapBin !== null) {
            return this.mapBin;
        }
        
        const mapBinDb: Record<string, Blob> = await this.database.getMapBin();

        if (!empty(mapBinDb)) {
            this.mapBin = mapBinDb;

            return mapBinDb;
        }

        const blob: Blob = await fetch(`maps/vita_map.zip`).then(r => r.blob());
        const zip: JSZip = await JSZip.loadAsync(blob);
        const mapBin: Record<string, Blob> = {};
        const files: JSZipObject[] = Object.values(zip.files).filter(f => !f.dir);

        await Promise.all(
            files.map(async (file: JSZipObject): Promise<void> => {
                const blob: Blob = await file.async('blob');
                const chunkName: string = file.name.slice(0, -'_chunk.vitamap'.length);

                mapBin[chunkName] = blob;
            })
        );

        this.mapBin = mapBin;
        this.database.saveMap(mapBin).catch((err: Error): void => {
            console.error('Failed to save map to DB:', err);
        });

        return mapBin;
    }
}
