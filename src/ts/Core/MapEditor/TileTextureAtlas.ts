import { CopyExternalImageDestInfo } from "../../WebGPU/Texture/CopyExternalImageDestInfo";
import { CopyExternalImageSourceInfo } from "../../WebGPU/Texture/CopyExternalImageSourceInfo";
import { Extent3DDict } from "../../WebGPU/Texture/Extent3DDict";
import { Origin3DDict } from "../../WebGPU/Texture/Origin3DDict";
import { ResourceLoader } from "../ResourceLoader";
import { SamplerDescriptor } from "../../WebGPU/Sampler/SamplerDescriptor";
import { TextureDescriptor } from "../../WebGPU/Texture/TextureDescriptor";
import { TextureViewDescriptor } from "../../WebGPU/Texture/TextureViewDescriptor";
import { TileTextureConfig } from "../Config/TileTextureConfig";

/**
 * Wszystkie tekstury w jednej teksturze 2D, ułożone w siatkę komórek.
 *
 * Wcześniej była to tablica warstw indeksowana identyfikatorem tekstury, ale `maxTextureArrayLayers`
 * to na typowym sprzęcie 256, a assetów jest już 463 z identyfikatorami do 610 - tablica
 * przestała się mieścić i nie ma jak jej powiększyć. Atlas ma limit `maxTextureDimension2D`
 * (zwykle 8192), czyli przy komórce 32 px mieści 65 536 tekstur.
 *
 * Identyfikator tekstury NIE jest już pozycją w atlasie: identyfikatory są rzadkie (3..610 przy
 * 463 plikach), więc każda tekstura dostaje kolejny SLOT, a mapowanie id -> slot siedzi tutaj.
 * Renderer wpisuje do instancji slot, a shader przelicza go na współrzędne komórki.
 */
export class TileTextureAtlas
{
    private readonly view: GPUTextureView;
    private readonly sampler: GPUSampler;
    private readonly columns: uint;
    private readonly rows: uint;
    /** Slot pod indeksem identyfikatora tekstury; -1 znaczy „nie ma takiej tekstury" */
    private readonly slots: Int32Array;

    private constructor(
        view: GPUTextureView,
        sampler: GPUSampler,
        columns: uint,
        rows: uint,
        slots: Int32Array,
    ) {
        this.view = view;
        this.sampler = sampler;
        this.columns = columns;
        this.rows = rows;
        this.slots = slots;
    }

    public getView(): GPUTextureView
    {
        return this.view;
    }

    public getSampler(): GPUSampler
    {
        return this.sampler;
    }

    public getColumns(): uint
    {
        return this.columns;
    }

    public getRows(): uint
    {
        return this.rows;
    }

    /** @returns slot w atlasie albo -1, gdy tekstury o tym identyfikatorze nie ma */
    public getSlot(textureId: uint): int
    {
        return this.slots[textureId] ?? -1;
    }

    public static create(device: GPUDevice, resourceLoader: ResourceLoader): TileTextureAtlas
    {
        const images: Record<uint, ImageBitmap> = resourceLoader.getTileTextures();
        // rosnąco po identyfikatorze, żeby ten sam zestaw plików zawsze dał ten sam atlas
        const ids: uint[] = resourceLoader.getLibrary().getTextureIds().slice().sort(
            (a: uint, b: uint): int => a - b
        );

        const size: uint = TileTextureConfig.SIZE;
        // siatka możliwie kwadratowa - najmniej marnowanych komórek i najmniejszy bok
        const columns: uint = Math.ceil(Math.sqrt(ids.length));
        const rows: uint = Math.ceil(ids.length / columns);
        const width: uint = columns * size;
        const height: uint = rows * size;

        if (Math.max(width, height) > device.limits.maxTextureDimension2D) {
            throw new Error(
                `Texture atlas ${width}x${height} exceeds maxTextureDimension2D`
                + ` (${device.limits.maxTextureDimension2D}) - textures need a smaller SIZE`
            );
        }

        const texture: GPUTexture = device.createTexture(new TextureDescriptor(
            'texture_tile_atlas',
            new Extent3DDict(width, height),
            'rgba8unorm',
            // copyExternalImageToTexture wymaga na docelowej teksturze RENDER_ATTACHMENT
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        ));

        const slots: Int32Array = new Int32Array(ids[ids.length - 1] + 1).fill(-1);

        for (let slot: uint = 0; slot < ids.length; slot++) {
            const image: ImageBitmap|undefined = images[ids[slot]];

            if (image === undefined) {
                throw new Error(`Missing tile texture ${ids[slot]}`);
            }

            slots[ids[slot]] = slot;

            device.queue.copyExternalImageToTexture(
                new CopyExternalImageSourceInfo(image),
                new CopyExternalImageDestInfo(
                    texture,
                    new Origin3DDict((slot % columns) * size, Math.floor(slot / columns) * size),
                ),
                new Extent3DDict(size, size),
            );
        }

        console.log(`%cTexture atlas: ${ids.length} textures in ${width}x${height}`, 'color: green;');

        return new TileTextureAtlas(
            texture.createView(new TextureViewDescriptor('texture_view_tile_atlas')),
            // domyslne filtrowanie to "nearest": pixel art zostaje ostry, a sasiednie komorki
            // atlasu nie moga sie zlac, bo nearest nigdy nie miesza dwoch tekseli
            device.createSampler(new SamplerDescriptor('sampler_tile_atlas')),
            columns,
            rows,
            slots,
        );
    }
}
