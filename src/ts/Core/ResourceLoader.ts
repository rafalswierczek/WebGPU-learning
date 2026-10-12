import { Database } from "./Database";
import { TextureLibrary, textureRow } from "./Textures/TextureLibrary";
import { TextureRepository } from "./Textures/TextureRepository";

/**
 * Zasoby wczytane raz, na starcie aplikacji.
 *
 * Sieć jest dotykana wyłącznie przy pierwszym uruchomieniu: leci jeden fetch po `textures.zip`,
 * a jego zawartość ląduje w IndexedDB. Każdy kolejny start czyta już tylko bazę - dokładnie
 * tak samo jak mapa.
 *
 * Na wyjściu są dwie rzeczy: biblioteka (drzewo folderów i pędzli, czyli to, co widać
 * w oknie Tile) i gotowe obrazy dla GPU.
 */
export class ResourceLoader
{
    private readonly library: TextureLibrary;
    private readonly tileTextures: Record<uint, ImageBitmap>;

    private constructor(library: TextureLibrary, tileTextures: Record<uint, ImageBitmap>)
    {
        this.library = library;
        this.tileTextures = tileTextures;
    }

    public static async init(database: Database): Promise<ResourceLoader>
    {
        const rows: textureRow[] = await new TextureRepository(database).load();

        if (rows.length === 0) {
            throw new Error('No textures found - assets/Textures is empty or textures.zip is missing');
        }

        return new ResourceLoader(
            TextureLibrary.build(rows),
            await TextureRepository.decode(rows),
        );
    }

    public getLibrary(): TextureLibrary
    {
        return this.library;
    }

    public getTileTextures(): Record<uint, ImageBitmap>
    {
        return this.tileTextures;
    }
}
