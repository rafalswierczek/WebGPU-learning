import { Chunk } from "./Chunk";
import { ChunkCodec } from "./ChunkCodec";
import { Database } from "../Database";
import { GameMap } from "./GameMap";
import { ObjectRegistry } from "./ObjectRegistry";
import { TileRegistry } from "./TileRegistry";

/** Jedyne miejsce łączące mapę z bazą danych. Kodowanie binarne zna ChunkCodec, IndexedDB zna Database. */
export class MapRepository
{
    private readonly database: Database;

    /** Numer wersji mapy pokazywany w menu edytora; rosnie przy kazdym zapisie z menu */
    private mapVersion: uint = 0;

    private readonly tiles: TileRegistry;
    private readonly objects: ObjectRegistry;

    public constructor(database: Database, tiles: TileRegistry, objects: ObjectRegistry)
    {
        this.database = database;
        this.tiles = tiles;
        this.objects = objects;
    }

    public getMapVersion(): uint
    {
        return this.mapVersion;
    }

    /** Zapis z menu edytora: najpierw podbicie wersji, potem zapis zmienionych chunkow */
    public async saveWithNewVersion(map: GameMap): Promise<uint>
    {
        this.mapVersion++;

        await this.database.saveMapVersion(this.mapVersion);

        return this.saveDirty(map);
    }

    /**
     * Wczytuje całą mapę do przekazanej instancji. Mutuje ją zamiast zwracać nową,
     * żeby referencje trzymane przez renderer i edytor pozostały aktualne.
     */
    public async loadInto(map: GameMap): Promise<uint>
    {
        const buffers: Map<uint, ArrayBuffer> = await this.database.getAllChunks();
        this.mapVersion = await this.database.getMapVersion() ?? 0;

        await this.loadRegistries();

        map.clear();

        for (const [chunkIndex, buffer] of buffers) {
            const chunk: Chunk = ChunkCodec.decode(buffer);

            if (chunk.getIndex() !== chunkIndex) {
                throw new Error(`Chunk key ${chunkIndex} does not match its header (${chunk.getIndex()})`);
            }

            map.putLoadedChunk(chunk);
        }

        map.clearDirty();

        return buffers.size;
    }

    /** Zapisuje tylko chunki zmienione od ostatniego zapisu. */
    public async saveDirty(map: GameMap): Promise<uint>
    {
        return this.save(map, map.getDirtyChunks());
    }

    /** Zapisuje całą mapę - używane po wygenerowaniu nowej zawartości. */
    public async saveAll(map: GameMap): Promise<uint>
    {
        return this.save(map, Array.from(map.getChunks()));
    }

    public async clear(): Promise<void>
    {
        await this.database.clearMap();
    }

    /**
     * Oba rejestry wjezdzaja do RAM w calosci, jednym czytaniem na start. Od tej chwili
     * rozwiazanie identyfikatora to indeksowanie tablicy - baza nie jest juz dotykana,
     * a byloby to nie do przyjecia przy milionach odczytow na klatke.
     */
    private async loadRegistries(): Promise<void>
    {
        // rownolegle, bo to dwa niezalezne odczyty i nie ma po co czekac na nie po kolei
        const [tiles, objects]: (ArrayBuffer|null)[] = await Promise.all([
            this.database.getRegistry('tiles'),
            this.database.getRegistry('objects'),
        ]);

        if (tiles !== null) {
            this.tiles.decode(tiles);
        }

        if (objects !== null) {
            this.objects.decode(objects);
        }
    }

    private async save(map: GameMap, chunks: Chunk[]): Promise<uint>
    {
        const buffers: Map<uint, ArrayBuffer> = new Map<uint, ArrayBuffer>();
        const emptyChunks: uint[] = [];

        for (const chunk of chunks) {
            chunk.compact();

            if (chunk.isEmpty()) {
                emptyChunks.push(chunk.getIndex()); // pusty chunk nie zajmuje miejsca w bazie
                continue;
            }

            buffers.set(chunk.getIndex(), ChunkCodec.encode(chunk));
        }

        if (buffers.size > 0) {
            await this.database.saveChunks(buffers);
        }

        if (emptyChunks.length > 0) {
            await this.database.deleteChunks(emptyChunks);
        }

        // rejestry są częścią mapy - bez nich komórki straciłyby tekstury i właściwości
        await this.database.saveRegistry('tiles', this.tiles.encode());
        await this.database.saveRegistry('objects', this.objects.encode());

        map.clearDirty();

        return buffers.size;
    }
}
