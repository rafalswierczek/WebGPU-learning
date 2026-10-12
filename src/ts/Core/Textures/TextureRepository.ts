import JSZip from "jszip";
import { Database } from "../Database";
import { TextureLibrary, textureRow } from "./TextureLibrary";
import { TileTextureConfig } from "../Config/TileTextureConfig";
import { brushConfigJson } from "./BrushConfigJson";

/**
 * Tekstury z dysku do bazy i z bazy do gry.
 *
 * Zasada jest ta sama co przy mapie: sieć dotykana JEDEN raz. Przy pierwszym starcie leci
 * jeden fetch po `textures.zip` (jeden plik zamiast setek zapytań), zip jest rozpakowywany
 * i ląduje w IndexedDB wierszami. Każdy kolejny start czyta już tylko bazę.
 *
 * Wiersz to `path` (ścieżka w drzewie), `texture` (surowy png) i `config` (zawartość
 * `config.json` z folderu albo null). Struktury katalogów nie zapisujemy osobno - da się ją
 * odtworzyć w całości z samych ścieżek.
 */
export class TextureRepository
{
    private static readonly CONFIG_FILE: string = 'config.json';

    private readonly database: Database;

    public constructor(database: Database)
    {
        this.database = database;
    }

    public async load(): Promise<textureRow[]>
    {
        const cached: textureRow[] = await this.database.getTextureRows();

        if (cached.length > 0) {
            return cached;
        }

        const rows: textureRow[] = await TextureRepository.fetchZip();

        await this.database.saveTextureRows(rows);

        console.log(`%cTextures downloaded and cached: ${rows.length}`, 'color: green;');

        return rows;
    }

    /** Wyrzuca cache tekstur; następny start pobierze zipa od nowa */
    public async clear(): Promise<void>
    {
        return this.database.clearTextures();
    }

    private static async fetchZip(): Promise<textureRow[]>
    {
        const response: Response = await fetch(TileTextureConfig.ARCHIVE_FILE);

        if (!response.ok) {
            throw new Error(`Cannot load ${TileTextureConfig.ARCHIVE_FILE}: HTTP ${response.status}`);
        }

        const zip: JSZip = await JSZip.loadAsync(await response.arrayBuffer());
        const configs: Map<string, brushConfigJson> = await TextureRepository.readConfigs(zip);
        const rows: textureRow[] = [];

        for (const file of Object.values(zip.files)) {
            if (file.dir || !file.name.toLowerCase().endsWith('.png')) {
                continue;
            }

            const path: string = file.name.slice(0, file.name.length - '.png'.length);
            const separator: int = path.lastIndexOf('/');
            const folder: string = separator === -1 ? '' : path.slice(0, separator);

            rows.push({
                path: path,
                texture: await file.async('blob'),
                config: configs.get(folder) ?? null,
            });
        }

        return rows;
    }

    /**
     * Configi wczytane naprzód, bo ten sam plik dotyczy wszystkich tekstur w folderze -
     * parsowanie go przy każdej z osobna byłoby marnotrawstwem.
     */
    private static async readConfigs(zip: JSZip): Promise<Map<string, brushConfigJson>>
    {
        const configs: Map<string, brushConfigJson> = new Map<string, brushConfigJson>();

        for (const file of Object.values(zip.files)) {
            if (file.dir || !file.name.endsWith(TextureRepository.CONFIG_FILE)) {
                continue;
            }

            const folder: string = file.name.slice(
                0,
                Math.max(0, file.name.length - TextureRepository.CONFIG_FILE.length - 1)
            );

            try {
                configs.set(folder, JSON.parse(await file.async('string')) as brushConfigJson);
            } catch (error) {
                throw new Error(`Malformed ${file.name}: ${(error as Error).message}`);
            }
        }

        return configs;
    }

    /** Obrazy gotowe dla GPU, po identyfikatorze tekstury */
    public static async decode(rows: textureRow[]): Promise<Record<uint, ImageBitmap>>
    {
        const images: Record<uint, ImageBitmap> = {};

        await Promise.all(rows.map(async (row: textureRow): Promise<void> => {
            // bez premultiply, bo pipeline mnozy kolor przez alfe dopiero przy mieszaniu -
            // gotowy premultiply zrobilby to drugi raz i przezroczyste brzegi zrobilyby sie ciemne
            images[TextureLibrary.toTextureId(row.path)] = await TextureRepository.normalize(
                await createImageBitmap(row.texture, { premultiplyAlpha: 'none' })
            );
        }));

        return images;
    }

    /**
     * Tekstura przeskalowana do jednego rozmiaru.
     *
     * Atlas na GPU wymaga jednakowych komórek, a assety mogą przyjść w różnych rozmiarach.
     * Skalujemy bez wygładzania, żeby pixel art nie zrobił się rozmyty.
     */
    private static async normalize(image: ImageBitmap): Promise<ImageBitmap>
    {
        const size: uint = TileTextureConfig.SIZE;

        if (image.width === size && image.height === size) {
            return image;
        }

        const canvas: HTMLCanvasElement = document.createElement('canvas');
        const context: CanvasRenderingContext2D|null = canvas.getContext('2d');

        canvas.width = size;
        canvas.height = size;

        if (context === null) {
            throw new Error('Cannot get 2d context to resize a texture');
        }

        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, size, size);

        return createImageBitmap(canvas);
    }
}
