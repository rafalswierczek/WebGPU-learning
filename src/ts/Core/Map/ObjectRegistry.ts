import { MapObject } from "./MapObject";
import { ObjectType } from "./ObjectType";

/**
 * Rejestr obiektów, indeksowany IDENTYFIKATOREM TEKSTURY - tak samo jak rejestr tile.
 * Stos obiektów komórki trzyma wprost identyfikatory tekstur.
 *
 * Obiekty są zawsze 1x1: agregaty (wiele tekstur w jednym pędzlu) dotyczą wyłącznie kafli.
 *
 * Format binarny (little-endian, tak jak chunki):
 *   u32 magic "VOBR" | u16 version | u16 count
 *   potem count rekordów zmiennej długości:
 *   u16 textureId | u8 flags | u8 type | u16 weight | u16 nameLength | u32 timeLeftSec
 *   | nameLength bajtów UTF-8
 */
export class ObjectRegistry
{
    public static readonly MAGIC: uint = 0x52424F56; // "VOBR"
    public static readonly VERSION: uint = 1;
    public static readonly HEADER_SIZE: bytes = 8;
    public static readonly RECORD_SIZE: bytes = 12;

    private static readonly FLAG_COLLISION: uint = 1;
    private static readonly FLAG_CAN_PICKUP: uint = 2;
    private static readonly FLAG_CAN_MOVE: uint = 4;
    private static readonly FLAG_CAN_STACK: uint = 8;
    private static readonly FLAG_CAN_USE: uint = 16;
    private static readonly FLAG_ACTIVE: uint = 32;

    /** Tablica rzadka: indeks to identyfikator tekstury, dziury to tekstury nieużyte na mapie */
    private objects: (MapObject|null)[] = [];
    private version: uint = 0;

    public get(textureId: int): MapObject|null
    {
        return this.objects[textureId] ?? null;
    }

    /** Wpis dla tej tekstury; jeśli go nie ma, powstaje z właściwości pędzla - patrz TileRegistry.ensure */
    public ensure(textureId: uint, name: string, collision: boolean, type: string): MapObject
    {
        const existing: MapObject|null = this.get(textureId);

        if (existing !== null) {
            return existing;
        }

        const object: MapObject = new MapObject(textureId);

        object.name = name;
        object.collision = collision;
        object.type = type;
        object.canPickup = true;
        object.canMove = true;

        this.objects[textureId] = object;
        this.version++;

        return object;
    }

    /** Wpisy w kolejności rosnących identyfikatorów tekstur, bez dziur */
    public getAll(): MapObject[]
    {
        return this.objects.filter((object: MapObject|null): object is MapObject => object !== null);
    }

    public getCount(): uint
    {
        return this.getAll().length;
    }

    public getVersion(): uint
    {
        return this.version;
    }

    public touch(): void
    {
        this.version++;
    }

    public encode(): ArrayBuffer
    {
        const objects: MapObject[] = this.getAll();
        const names: Uint8Array[] = objects.map(
            (object: MapObject): Uint8Array => new TextEncoder().encode(object.name)
        );
        const size: bytes = ObjectRegistry.HEADER_SIZE + names.reduce(
            (total: bytes, name: Uint8Array): bytes => total + ObjectRegistry.RECORD_SIZE + name.length,
            0,
        );

        const buffer: ArrayBuffer = new ArrayBuffer(size);
        const view: DataView = new DataView(buffer);
        const bytes: Uint8Array = new Uint8Array(buffer);

        view.setUint32(0, ObjectRegistry.MAGIC, true);
        view.setUint16(4, ObjectRegistry.VERSION, true);
        view.setUint16(6, objects.length, true);

        let offset: bytes = ObjectRegistry.HEADER_SIZE;

        for (let i: uint = 0; i < objects.length; i++) {
            const object: MapObject = objects[i];

            view.setUint16(offset, object.textureId, true);
            view.setUint8(offset + 2, ObjectRegistry.packFlags(object));
            view.setUint8(offset + 3, ObjectType.toIndex(object.type));
            view.setUint16(offset + 4, object.weight, true);
            view.setUint16(offset + 6, names[i].length, true);
            view.setUint32(offset + 8, object.timeLeftSec, true);
            bytes.set(names[i], offset + ObjectRegistry.RECORD_SIZE);

            offset += ObjectRegistry.RECORD_SIZE + names[i].length;
        }

        return buffer;
    }

    public decode(buffer: ArrayBuffer): void
    {
        const view: DataView = new DataView(buffer);

        if (buffer.byteLength < ObjectRegistry.HEADER_SIZE || view.getUint32(0, true) !== ObjectRegistry.MAGIC) {
            throw new Error('Not an object registry (bad magic)');
        }

        const version: uint = view.getUint16(4, true);

        if (version !== ObjectRegistry.VERSION) {
            throw new Error(`Unsupported object registry version: ${version}`);
        }

        const count: uint = view.getUint16(6, true);
        const objects: (MapObject|null)[] = [];
        let offset: bytes = ObjectRegistry.HEADER_SIZE;

        for (let i: uint = 0; i < count; i++) {
            const object: MapObject = new MapObject(view.getUint16(offset, true));
            const flags: uint = view.getUint8(offset + 2);
            const nameLength: uint = view.getUint16(offset + 6, true);

            object.collision = (flags & ObjectRegistry.FLAG_COLLISION) !== 0;
            object.canPickup = (flags & ObjectRegistry.FLAG_CAN_PICKUP) !== 0;
            object.canMove = (flags & ObjectRegistry.FLAG_CAN_MOVE) !== 0;
            object.canStack = (flags & ObjectRegistry.FLAG_CAN_STACK) !== 0;
            object.canUse = (flags & ObjectRegistry.FLAG_CAN_USE) !== 0;
            object.active = (flags & ObjectRegistry.FLAG_ACTIVE) !== 0;
            object.type = ObjectType.fromIndex(view.getUint8(offset + 3));
            object.weight = view.getUint16(offset + 4, true);
            object.timeLeftSec = view.getUint32(offset + 8, true);
            object.name = new TextDecoder().decode(
                new Uint8Array(buffer, offset + ObjectRegistry.RECORD_SIZE, nameLength)
            );

            objects[object.textureId] = object;
            offset += ObjectRegistry.RECORD_SIZE + nameLength;
        }

        if (offset !== buffer.byteLength) {
            throw new Error(`Object registry size mismatch: consumed ${offset} B of ${buffer.byteLength} B`);
        }

        this.objects = objects;
        this.version++;
    }

    private static packFlags(object: MapObject): uint
    {
        return (object.collision ? ObjectRegistry.FLAG_COLLISION : 0)
            | (object.canPickup ? ObjectRegistry.FLAG_CAN_PICKUP : 0)
            | (object.canMove ? ObjectRegistry.FLAG_CAN_MOVE : 0)
            | (object.canStack ? ObjectRegistry.FLAG_CAN_STACK : 0)
            | (object.canUse ? ObjectRegistry.FLAG_CAN_USE : 0)
            | (object.active ? ObjectRegistry.FLAG_ACTIVE : 0);
    }
}
