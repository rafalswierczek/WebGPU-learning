import { Cell } from "../Core/Map/Cell";
import { Chunk } from "../Core/Map/Chunk";
import { ChunkCodec } from "../Core/Map/ChunkCodec";
import { MapConfig } from "../Core/Map/MapConfig";
import { MapObject } from "../Core/Map/MapObject";
import { ObjectRegistry } from "../Core/Map/ObjectRegistry";
import { ObjectType } from "../Core/Map/ObjectType";
import { Tile } from "../Core/Map/Tile";
import { TileRegistry } from "../Core/Map/TileRegistry";
import { TileType } from "../Core/Map/TileType";

/**
 * Komórka jest źródłem prawdy o mapie, więc testujemy jej dwa stosy identyfikatorów,
 * reguły wyliczania właściwości z rejestrów i przejście przez oba formaty binarne.
 */
export class CellTest
{
    private passed: uint = 0;
    private failed: uint = 0;

    private tiles: TileRegistry = new TileRegistry();
    private objects: ObjectRegistry = new ObjectRegistry();

    public run(): boolean
    {
        this.objectStackSitsAboveTileStack();
        this.collisionNeedsOnlyOneElement();
        this.speedFactorComesFromTheTopTile();
        this.typePrefersObjects();
        this.popTakesObjectsFirst();
        this.simpleCellStaysCheap();
        this.stacksSurviveRoundTrip();
        this.registriesSurviveRoundTrip();
        this.objectNameSurvivesRoundTrip();
        this.stackingRuleLooksAtTheWholeStack();

        const ok: boolean = this.failed === 0;

        console.log(
            `%cCell: ${this.passed} passed, ${this.failed} failed`,
            `color: ${ok ? 'green' : 'red'}; font-weight: bold;`
        );

        return ok;
    }

    /**
     * Świeże rejestry na każdy test, żeby zmiana właściwości w jednym nie sięgała następnego.
     * Wpisy 0..3 powstają tak samo jak przy malowaniu - przez ensure.
     */
    private reset(): void
    {
        this.tiles = new TileRegistry();
        this.objects = new ObjectRegistry();

        for (let textureId: uint = 0; textureId < 4; textureId++) {
            this.tiles.ensure(textureId, `Test/${textureId}`, false, false, TileType.DEFAULT, Tile.DEFAULT_SPEED_FACTOR);
            this.objects.ensure(textureId, `Test/${textureId}`, false, ObjectType.DEFAULT);
        }
    }

    private objectStackSitsAboveTileStack(): void
    {
        this.reset();

        const cell: Cell = new Cell();

        cell.pushTile(1);
        cell.pushTile(2);
        cell.pushObject(3);

        this.assert('the first object covers the last tile',
            cell.getTopTextureId(this.tiles, this.objects) === 3);
        this.assert('tile stack keeps its own order', cell.getTopTileId() === 2);
    }

    private collisionNeedsOnlyOneElement(): void
    {
        this.reset();

        const cell: Cell = new Cell();
        const blocking: Tile|null = this.tiles.get(1);

        cell.pushTile(0);
        cell.pushTile(1);
        cell.pushTile(2);

        this.assert('no collision when nothing collides',
            cell.hasCollision(this.tiles, this.objects) === false);

        blocking!.collision = true;
        this.assert('one colliding tile is enough', cell.hasCollision(this.tiles, this.objects) === true);

        blocking!.collision = false;

        const object: MapObject|null = this.objects.get(3);

        cell.pushObject(3);
        this.assert('object without collision changes nothing',
            cell.hasCollision(this.tiles, this.objects) === false);

        object!.collision = true;
        this.assert('one colliding object is enough', cell.hasCollision(this.tiles, this.objects) === true);
    }

    private speedFactorComesFromTheTopTile(): void
    {
        this.reset();

        const cell: Cell = new Cell();

        this.tiles.get(0)!.setSpeedFactor(2.0);
        this.tiles.get(1)!.setSpeedFactor(0.5);

        cell.pushTile(0);
        cell.pushTile(1);

        this.assert('speed factor comes from the top tile', cell.getSpeedFactor(this.tiles) === 0.5);

        cell.pushObject(3);
        this.assert('objects do not change the speed factor', cell.getSpeedFactor(this.tiles) === 0.5);
    }

    private typePrefersObjects(): void
    {
        this.reset();

        const cell: Cell = new Cell();

        this.tiles.get(0)!.type = TileType.STAIRS;
        cell.pushTile(0);

        this.assert('without objects the top tile decides',
            cell.getType(this.tiles, this.objects) === TileType.STAIRS);

        this.objects.get(3)!.type = ObjectType.CHEST;
        cell.pushObject(3);

        this.assert('the top object wins', cell.getType(this.tiles, this.objects) === ObjectType.CHEST);
    }

    private popTakesObjectsFirst(): void
    {
        this.reset();

        const cell: Cell = new Cell();

        cell.pushTile(0);
        cell.pushObject(3);

        this.assert('pop removes the object first', cell.popTop() && cell.getObjectStack().length === 0);
        this.assert('tile is still there', cell.getTileStack().length === 1);
        this.assert('then the tile goes', cell.popTop() && cell.isEmpty());
        this.assert('empty cell has nothing to pop', cell.popTop() === false);
    }

    private simpleCellStaysCheap(): void
    {
        this.reset();

        const chunk: Chunk = new Chunk({ cx: 0, cy: 0 });
        const simple: Cell = new Cell();

        simple.pushTile(1);
        chunk.storeCell(MapConfig.GROUND_LAYER, 3, 3, simple);

        const simpleSize: bytes = ChunkCodec.encode(chunk).byteLength;

        this.assert('a single tile is read back from the dense array',
            chunk.getTile(MapConfig.GROUND_LAYER, 3, 3) === 1);
        this.assert('and creates no record', chunk.getComplexCells(MapConfig.GROUND_LAYER) === null);

        const stacked: Cell = new Cell();

        stacked.pushTile(1);
        stacked.pushObject(3);
        chunk.storeCell(MapConfig.GROUND_LAYER, 4, 4, stacked);

        this.assert('an object forces a record', ChunkCodec.encode(chunk).byteLength > simpleSize);
    }

    private stacksSurviveRoundTrip(): void
    {
        this.reset();

        const chunk: Chunk = new Chunk({ cx: 1, cy: 2 });
        const cell: Cell = new Cell();

        cell.pushTile(0);
        cell.pushTile(2);
        cell.pushObject(3);
        cell.pushObject(1);
        chunk.storeCell(2, 10, 20, cell);

        const decoded: Cell|null = ChunkCodec.decode(ChunkCodec.encode(chunk)).getCell(2, 10, 20);

        this.assert('tile stack size survives', decoded?.getTileStack().length === 2);
        this.assert('tile stack order survives', decoded?.getTileStack().join(',') === '0,2');
        this.assert('object stack size survives', decoded?.getObjectStack().length === 2);
        this.assert('object stack order survives', decoded?.getObjectStack().join(',') === '3,1');
        this.assert('top tile id survives', decoded?.getTopTileId() === 2);
        this.assert('top object id survives', decoded?.getTopObjectId() === 1);
    }

    /** Właściwości nie jeżdżą już z komórką, więc muszą przetrwać w rejestrach zapisywanych obok */
    private registriesSurviveRoundTrip(): void
    {
        this.reset();

        const tile: Tile = this.tiles.get(2)!;
        const object: MapObject = this.objects.get(3)!;

        tile.type = TileType.HOLE_GROUND;
        tile.collision = true;
        tile.setSpeedFactor(1.5);

        object.type = ObjectType.CHEST;
        object.canPickup = true;
        object.canUse = true;
        object.canMove = false;
        object.weight = 1200;
        object.timeLeftSec = 90;

        const decodedTiles: TileRegistry = new TileRegistry();
        const decodedObjects: ObjectRegistry = new ObjectRegistry();

        decodedTiles.decode(this.tiles.encode());
        decodedObjects.decode(this.objects.encode());

        const decodedTile: Tile|null = decodedTiles.get(2);
        const decodedObject: MapObject|null = decodedObjects.get(3);

        this.assert('tile count survives', decodedTiles.getCount() === 4);
        this.assert('tile texture survives', decodedTile?.textureId === 2);
        this.assert('tile type survives', decodedTile?.type === TileType.HOLE_GROUND);
        this.assert('tile collision survives', decodedTile?.collision === true);
        this.assert('tile speed factor survives', decodedTile?.speedFactor === 1.5);

        this.assert('object count survives', decodedObjects.getCount() === 4);
        this.assert('object texture survives', decodedObject?.textureId === 3);
        this.assert('object type survives', decodedObject?.type === ObjectType.CHEST);
        this.assert('canPickup survives', decodedObject?.canPickup === true);
        this.assert('canUse survives', decodedObject?.canUse === true);
        this.assert('canMove stays false', decodedObject?.canMove === false);
        this.assert('weight survives', decodedObject?.weight === 1200);
        this.assert('timeLeftSec survives', decodedObject?.timeLeftSec === 90);
    }

    /** Nazwa obiektu jedzie w rejestrze tak samo jak nazwa kafla */
    private objectNameSurvivesRoundTrip(): void
    {
        this.reset();

        const object: MapObject = this.objects.get(2) as MapObject;

        object.name = 'Objects/Food/271';
        object.weight = 45;
        object.canStack = true;

        const decoded: ObjectRegistry = new ObjectRegistry();

        decoded.decode(this.objects.encode());

        this.assert('object name survives', decoded.get(2)?.name === 'Objects/Food/271');
        this.assert('weight survives next to the name', decoded.get(2)?.weight === 45);
        this.assert('canStack survives', decoded.get(2)?.canStack === true);
        this.assert('index stays the texture id', decoded.get(2)?.textureId === 2);
        this.assert('other entries keep their names', decoded.get(3)?.name === 'Test/3');
    }

    /**
     * Na stos nie da sie nic polozyc, gdy KTORYKOLWIEK jego element ma canStack = false -
     * nie tylko ten na wierzchu.
     */
    private stackingRuleLooksAtTheWholeStack(): void
    {
        this.reset();

        const blocking: MapObject = this.objects.get(0) as MapObject;
        const stackable: MapObject = this.objects.get(1) as MapObject;

        blocking.canStack = false;
        stackable.canStack = true;

        this.assert('stackable onto stackable is allowed', CellTest.isStackable(stackable, [1], this.objects));
        this.assert('stackable onto blocking is refused', CellTest.isStackable(stackable, [0], this.objects) === false);
        this.assert('blocking onto stackable is refused', CellTest.isStackable(blocking, [1], this.objects) === false);
        this.assert('one blocking element deeper in the stack still refuses',
            CellTest.isStackable(stackable, [1, 0, 1], this.objects) === false);
    }

    /** Ta sama regula, ktora stosuje kontroler przy malowaniu */
    private static isStackable(object: MapObject, stack: uint[], objects: ObjectRegistry): boolean
    {
        return object.canStack
            && stack.every((id: uint): boolean => objects.get(id)?.canStack === true);
    }

    private assert(name: string, condition: boolean, detail: string = ''): void
    {
        if (condition) {
            this.passed++;

            return;
        }

        this.failed++;
        console.error(`FAIL: ${name}${detail === '' ? '' : ` (${detail})`}`);
    }
}
