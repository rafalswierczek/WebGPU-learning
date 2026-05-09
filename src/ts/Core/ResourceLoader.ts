import { CopyExternalImageDestInfo } from "../WebGPU/Texture/CopyExternalImageDestInfo";
import { CopyExternalImageSourceInfo } from "../WebGPU/Texture/CopyExternalImageSourceInfo";
import { Extent3DDict } from "../WebGPU/Texture/Extent3DDict";
import { Origin3DDict } from "../WebGPU/Texture/Origin3DDict";
import { TextureDescriptor } from "../WebGPU/Texture/TextureDescriptor";
import { TextureViewDescriptor } from "../WebGPU/Texture/TextureViewDescriptor";
import { SpritesheetConfig } from "./Config/SpritesheetConfig";
import { Database } from "./Database";

export class ResourceLoader
{
    private device: GPUDevice;
    private database: Database
    private spritesheets: Record<uint, ImageBitmap>|null = null;

    public constructor(device: GPUDevice, database: Database)
    {
        this.device = device;
        this.database = database; 
    }

    public async getSpritesheets(): Promise<Record<uint, ImageBitmap>>
    {
        if (this.spritesheets !== null) {
            return this.spritesheets;
        }
        
        const spritesheets: Record<uint, ImageBitmap> = await this.database.getSpritesheets();

        if (!empty(spritesheets)) {
            this.spritesheets = spritesheets;

            return spritesheets;
        }

        const loadSheet = async (id: uint) => {
            const blob = await fetch(`spritesheets/spritesheet_${id}.png`).then(r => r.blob());
            const bitmap = await createImageBitmap(blob);

            return { [id]: bitmap };
        };

        const spritesheetsCount = 3;
        const promises: Promise<Record<uint, ImageBitmap>>[] = [];

        for (let i = 0; i < spritesheetsCount; i++) {
            promises.push(loadSheet(i));
        }

        const parts = await Promise.all(promises);
        const result: Record<uint, ImageBitmap> = Object.assign({}, ...parts);

        this.spritesheets = result;
        this.database.saveSpritesheets(result);

        return result;
    }

    public async getMapBin()
    {
    }
}
