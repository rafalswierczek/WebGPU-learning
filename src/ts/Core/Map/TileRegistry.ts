import { Tile } from "./Tile";
import { TileType } from "./TileType";

/**
 * Rejestr tile, indeksowany IDENTYFIKATOREM TEKSTURY.
 *
 * Stosy komórek trzymają wprost identyfikatory tekstur - i tak nie da się inaczej, bo tekstura
 * leży na dysku w dokładnie jednym folderze, a właściwości bierze z config.json tego folderu.
 * Osobna numeracja wpisów byłaby więc drugim identyfikatorem tego samego, tylko trudniejszym
 * do odczytania (w oknie kafla widać było numer wpisu zamiast numeru tekstury).
 *
 * Format binarny (little-endian, tak jak chunki):
 *   u32 magic "VTLR" | u16 version | u16 count
 *   potem count rekordów zmiennej długości:
 *   u16 textureId | u8 flags | u8 type | f32 speedFactor | u16 nameLength | nameLength bajtów UTF-8
 */
export class TileRegistry
{
    public static readonly MAGIC: uint = 0x524C5456; // "VTLR"
    public static readonly VERSION: uint = 1;
    public static readonly HEADER_SIZE: bytes = 8;
    public static readonly RECORD_SIZE: bytes = 10;

    private static readonly FLAG_COLLISION: uint = 1;
    private static readonly FLAG_AGGREGATE: uint = 2;

    /** Tablica rzadka: indeks to identyfikator tekstury, dziury to tekstury nieużyte na mapie */
    private tiles: (Tile|null)[] = [];
    /** Rośnie przy każdej zmianie - renderer po tym poznaje, że musi się odświeżyć */
    private version: uint = 0;

    public get(textureId: int): Tile|null
    {
        return this.tiles[textureId] ?? null;
    }

    /**
     * Wpis dla tej tekstury; jeśli go nie ma, powstaje z właściwości podanych przez pędzel.
     *
     * Istniejący wpis zostaje NIETKNIĘTY, bo mógł zostać ręcznie zmieniony w oknie kafla -
     * config.json tylko zasiewa wartości początkowe, a nie nadpisuje pracy w edytorze.
     */
    public ensure(
        textureId: uint,
        name: string,
        isAggregate: boolean,
        collision: boolean,
        type: string,
        speedFactor: float,
    ): Tile {
        const existing: Tile|null = this.get(textureId);

        if (existing !== null) {
            return existing;
        }

        const tile: Tile = new Tile(textureId);

        tile.name = name;
        tile.isAggregate = isAggregate;
        tile.collision = collision;
        tile.type = type;
        tile.setSpeedFactor(speedFactor);

        this.tiles[textureId] = tile;
        this.version++;

        return tile;
    }

    /** Wpisy w kolejności rosnących identyfikatorów tekstur, bez dziur */
    public getAll(): Tile[]
    {
        return this.tiles.filter((tile: Tile|null): tile is Tile => tile !== null);
    }

    public getCount(): uint
    {
        return this.getAll().length;
    }

    public getVersion(): uint
    {
        return this.version;
    }

    /** Wołane po edycji tile; sam obiekt Tile nie ma jak o tym powiedzieć rejestrowi */
    public touch(): void
    {
        this.version++;
    }

    public encode(): ArrayBuffer
    {
        const tiles: Tile[] = this.getAll();
        const names: Uint8Array[] = tiles.map(
            (tile: Tile): Uint8Array => new TextEncoder().encode(tile.name)
        );
        const size: bytes = TileRegistry.HEADER_SIZE + names.reduce(
            (total: bytes, name: Uint8Array): bytes => total + TileRegistry.RECORD_SIZE + name.length,
            0,
        );

        const buffer: ArrayBuffer = new ArrayBuffer(size);
        const view: DataView = new DataView(buffer);
        const bytes: Uint8Array = new Uint8Array(buffer);

        view.setUint32(0, TileRegistry.MAGIC, true);
        view.setUint16(4, TileRegistry.VERSION, true);
        view.setUint16(6, tiles.length, true);

        let offset: bytes = TileRegistry.HEADER_SIZE;

        for (let i: uint = 0; i < tiles.length; i++) {
            const tile: Tile = tiles[i];

            view.setUint16(offset, tile.textureId, true);
            view.setUint8(offset + 2, TileRegistry.packFlags(tile));
            view.setUint8(offset + 3, TileType.toIndex(tile.type));
            view.setFloat32(offset + 4, tile.speedFactor, true);
            view.setUint16(offset + 8, names[i].length, true);
            bytes.set(names[i], offset + TileRegistry.RECORD_SIZE);

            offset += TileRegistry.RECORD_SIZE + names[i].length;
        }

        return buffer;
    }

    public decode(buffer: ArrayBuffer): void
    {
        const view: DataView = new DataView(buffer);

        if (buffer.byteLength < TileRegistry.HEADER_SIZE || view.getUint32(0, true) !== TileRegistry.MAGIC) {
            throw new Error('Not a tile registry (bad magic)');
        }

        const version: uint = view.getUint16(4, true);

        if (version !== TileRegistry.VERSION) {
            throw new Error(`Unsupported tile registry version: ${version}`);
        }

        const count: uint = view.getUint16(6, true);
        const tiles: (Tile|null)[] = [];
        let offset: bytes = TileRegistry.HEADER_SIZE;

        for (let i: uint = 0; i < count; i++) {
            const flags: uint = view.getUint8(offset + 2);
            const nameLength: uint = view.getUint16(offset + 8, true);
            const tile: Tile = new Tile(view.getUint16(offset, true));

            tile.collision = (flags & TileRegistry.FLAG_COLLISION) !== 0;
            tile.isAggregate = (flags & TileRegistry.FLAG_AGGREGATE) !== 0;
            tile.type = TileType.fromIndex(view.getUint8(offset + 3));
            tile.speedFactor = view.getFloat32(offset + 4, true);
            tile.name = new TextDecoder().decode(
                new Uint8Array(buffer, offset + TileRegistry.RECORD_SIZE, nameLength)
            );

            tiles[tile.textureId] = tile;
            offset += TileRegistry.RECORD_SIZE + nameLength;
        }

        if (offset !== buffer.byteLength) {
            throw new Error(`Tile registry size mismatch: consumed ${offset} B of ${buffer.byteLength} B`);
        }

        this.tiles = tiles;
        this.version++;
    }

    private static packFlags(tile: Tile): uint
    {
        return (tile.collision ? TileRegistry.FLAG_COLLISION : 0)
            | (tile.isAggregate ? TileRegistry.FLAG_AGGREGATE : 0);
    }
}
