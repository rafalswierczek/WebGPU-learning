import { Brush } from "./Brush";
import { BrushConfig, brushConfigJson } from "./BrushConfigJson";

/** Jeden wiersz w bazie: ścieżka w drzewie, obraz i config folderu (albo null, gdy folder go nie ma) */
export type textureRow = {
    readonly path: string;
    readonly texture: Blob;
    readonly config: brushConfigJson|null;
};

/** Wybieralny wiersz listy: albo pojedyncza tekstura, albo cały folder jako jeden pędzel */
export type brushEntry = {
    readonly label: string;
    readonly brush: Brush;
};

/** Folder drzewa tekstur - dokładnie jeden katalog z `assets/Textures` */
export class TextureNode
{
    public readonly name: string;
    public readonly path: string;
    public readonly folders: TextureNode[] = [];
    public readonly brushes: brushEntry[] = [];

    public constructor(name: string, path: string)
    {
        this.name = name;
        this.path = path;
    }
}

/**
 * Drzewo tekstur odtworzone ze ścieżek zapisanych w bazie.
 *
 * Ścieżka wiersza to `Folder/Podfolder/601`, czyli katalogi rozdzielone `/`, a na końcu
 * identyfikator tekstury. Rozbicie tych ścieżek po `/` odtwarza całe drzewo - baza nie musi
 * przechowywać osobno struktury katalogów.
 *
 * Config folderu decyduje o tym, czym jest wiersz listy:
 * - brak configu albo config bez klucza `textures` - KAŻDA tekstura folderu jest osobnym
 *   pędzlem 1x1 i dostaje właściwości ze scalonego configu,
 * - config z kluczem `textures` - CAŁY folder jest jednym pędzlem o wymiarach `brushSize`,
 *   a pliki spoza listy `textures` są ignorowane.
 */
export class TextureLibrary
{
    private readonly root: TextureNode = new TextureNode('Textures', '');
    /** Pędzle agregatów po ścieżce folderu - po tym kasowanie odnajduje resztę posągu */
    private readonly aggregates: Map<string, Brush> = new Map<string, Brush>();
    /** Ścieżka tekstury po identyfikatorze - służy za nazwę w oknie kafla */
    private readonly paths: Map<uint, string> = new Map<uint, string>();
    private readonly textureIds: uint[] = [];

    public getRoot(): TextureNode
    {
        return this.root;
    }

    public getTextureIds(): uint[]
    {
        return this.textureIds;
    }

    public getPath(textureId: uint): string
    {
        return this.paths.get(textureId) ?? 'Unknown';
    }

    /** Pędzel agregatu leżącego w tym folderze; null, gdy folder nie jest agregatem */
    public getAggregate(folderPath: string): Brush|null
    {
        return this.aggregates.get(folderPath) ?? null;
    }

    /** Pierwszy pędzel drzewa - pędzel startowy, żeby edytor nigdy nie stał bez tekstury */
    public getFirstBrush(): Brush|null
    {
        return TextureLibrary.findFirstBrush(this.root);
    }

    public static build(rows: textureRow[]): TextureLibrary
    {
        const library: TextureLibrary = new TextureLibrary();
        const folders: Map<string, textureRow[]> = TextureLibrary.groupByFolder(rows);

        // alfabetycznie, żeby lista nie zmieniała kolejności między uruchomieniami
        for (const folderPath of Array.from(folders.keys()).sort()) {
            library.addFolder(folderPath, folders.get(folderPath) as textureRow[]);
        }

        return library;
    }

    private addFolder(folderPath: string, rows: textureRow[]): void
    {
        const node: TextureNode = this.getOrCreateNode(folderPath);
        const config: BrushConfig = BrushConfig.merge(rows[0].config);

        for (const row of rows) {
            const id: uint = TextureLibrary.toTextureId(row.path);

            this.paths.set(id, row.path);
            this.textureIds.push(id);
        }

        if (config.textures === null) {
            // config bez listy tekstur dotyczy każdego pliku z osobna
            for (const row of rows) {
                const id: uint = TextureLibrary.toTextureId(row.path);

                node.brushes.push({ label: String(id), brush: new Brush([[id]], config, folderPath) });
            }

            return;
        }

        // cały folder to jeden pędzel; wiersz nosi nazwę folderu, bo to on jest obiektem
        const brush: Brush = new Brush(config.toGrid(folderPath), config, folderPath);

        this.aggregates.set(folderPath, brush);
        node.brushes.push({ label: node.name, brush: brush });
    }

    /** Węzeł pod daną ścieżką, tworząc po drodze brakujące poziomy */
    private getOrCreateNode(folderPath: string): TextureNode
    {
        let node: TextureNode = this.root;

        if (folderPath === '') {
            return node;
        }

        let walked: string = '';

        for (const name of folderPath.split('/')) {
            walked = walked === '' ? name : `${walked}/${name}`;

            const existing: TextureNode|undefined = node.folders.find(
                (child: TextureNode): boolean => child.name === name
            );

            if (existing !== undefined) {
                node = existing;

                continue;
            }

            const created: TextureNode = new TextureNode(name, walked);

            node.folders.push(created);
            node = created;
        }

        return node;
    }

    private static groupByFolder(rows: textureRow[]): Map<string, textureRow[]>
    {
        const folders: Map<string, textureRow[]> = new Map<string, textureRow[]>();

        for (const row of rows) {
            const separator: int = row.path.lastIndexOf('/');
            const folderPath: string = separator === -1 ? '' : row.path.slice(0, separator);

            if (!folders.has(folderPath)) {
                folders.set(folderPath, []);
            }

            (folders.get(folderPath) as textureRow[]).push(row);
        }

        return folders;
    }

    /** Identyfikatorem tekstury jest ostatni człon ścieżki, czyli nazwa pliku bez rozszerzenia */
    public static toTextureId(path: string): uint
    {
        const name: string = path.slice(path.lastIndexOf('/') + 1);
        const id: uint = Number.parseInt(name, 10);

        if (!Number.isInteger(id) || id < 0) {
            throw new Error(`Texture path must end with a non-negative number: "${path}"`);
        }

        return id;
    }

    private static findFirstBrush(node: TextureNode): Brush|null
    {
        if (node.brushes.length > 0) {
            return node.brushes[0].brush;
        }

        for (const folder of node.folders) {
            const brush: Brush|null = TextureLibrary.findFirstBrush(folder);

            if (brush !== null) {
                return brush;
            }
        }

        return null;
    }
}
