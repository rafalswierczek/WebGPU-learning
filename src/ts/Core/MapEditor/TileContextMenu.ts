import { Cell } from "../Map/Cell";
import { GameMap } from "../Map/GameMap";
import { MapObject } from "../Map/MapObject";
import { ObjectRegistry } from "../Map/ObjectRegistry";
import { Tile } from "../Map/Tile";
import { TileRegistry } from "../Map/TileRegistry";
import { UiConfig } from "../Config/UiConfig";
import { UiMenu, menuRow } from "../Ui/UiMenu";
import { UiPainter } from "../Ui/UiPainter";

/**
 * Okno informacji o komórce, otwierane prawym przyciskiem myszy.
 *
 * Wyłącznie CZYTA: pokazuje oba stosy w całości i wyliczone z nich właściwości komórki.
 * Edycja atrybutów przeniosła się do okna pędzla (podgląd pod debuggerem), bo tam edytuje się
 * to, co się właśnie maluje - a nie to, w co się akurat kliknęło.
 */
export class TileContextMenu
{
    private readonly map: GameMap;
    private readonly tiles: TileRegistry;
    private readonly objects: ObjectRegistry;
    private readonly menu: UiMenu;

    private tileCoords: coordsTile = { tileX: 0, tileY: 0 };
    /** Komórka przechwycona w chwili otwarcia - okno pokazuje stan z tamtej chwili */
    private cell: Cell|null = null;
    private layer: int = 0;

    public constructor(map: GameMap, tiles: TileRegistry, objects: ObjectRegistry)
    {
        this.map = map;
        this.tiles = tiles;
        this.objects = objects;
        this.menu = new UiMenu((): menuRow[] => this.buildRows());
    }

    public setMetrics(painter: UiPainter): void
    {
        this.menu.setMetrics(painter);
    }

    public isOpen(): boolean
    {
        return this.menu.isOpen();
    }

    /** PPM: na tym samym kaflu zamyka okno, na innym zamyka stare i od razu otwiera nowe */
    public toggle(
        canvasX: uint,
        canvasY: uint,
        tile: coordsTile,
        layer: int,
        canvasWidth: uint,
        canvasHeight: uint,
    ): void {
        const sameTile: boolean = this.menu.isOpen()
            && this.tileCoords.tileX === tile.tileX
            && this.tileCoords.tileY === tile.tileY
            && this.layer === layer;

        this.close();

        if (sameTile) {
            return;
        }

        this.tileCoords = tile;
        this.layer = layer;
        this.cell = this.map.getCell(layer, tile.tileX, tile.tileY);

        this.menu.openAt(
            UiMenu.place(canvasX, canvasY, canvasWidth, canvasHeight),
            this.buildTitle(),
        );
    }

    public close(): void
    {
        this.menu.close();
    }

    public contains(canvasX: uint, canvasY: uint): boolean
    {
        return this.menu.contains(canvasX, canvasY);
    }

    public onPointerMove(canvasX: uint, canvasY: uint): void
    {
        this.menu.onPointerMove(canvasX, canvasY);
    }

    public handleClick(canvasX: uint, canvasY: uint): boolean
    {
        return this.menu.handleClick(canvasX, canvasY);
    }

    public handleKey(event: KeyboardEvent): boolean
    {
        return this.menu.handleKey(event);
    }

    public render(painter: UiPainter, now: float): void
    {
        this.menu.render(painter, now);
    }

    /** Nagłówek nosi nazwę tego, co leży na wierzchu - czyli obiektu, a bez obiektów kafla */
    private buildTitle(): string
    {
        const name: string = this.getTopName();
        const coords: string = `${this.tileCoords.tileX}x${this.tileCoords.tileY} layer ${this.layer}`;

        return name === '' ? `Empty cell ${coords}` : `${name} ${coords}`;
    }

    private getTopName(): string
    {
        const object: MapObject|null = this.objects.get(this.cell?.getTopObjectId() ?? -1);

        if (object !== null) {
            return object.name;
        }

        return this.tiles.get(this.cell?.getTopTileId() ?? -1)?.name ?? '';
    }

    private buildRows(): menuRow[]
    {
        const cell: Cell|null = this.cell;

        if (cell === null || cell.isEmpty()) {
            return [this.menu.makeRow('Empty cell')];
        }

        const rows: menuRow[] = [];
        const objectStack: uint[] = cell.getObjectStack();
        const tileStack: uint[] = cell.getTileStack();

        // obiekty pierwsze, bo caly ich stos lezy nad calym stosem tile
        rows.push(this.menu.makeRow(
            `objectStack (${objectStack.length}):`,
            null,
            null,
            { color: UiConfig.SECTION_COLOR },
        ));

        for (let i: uint = objectStack.length - 1; i >= 0; i--) {
            rows.push(this.menu.makeRow(TileContextMenu.describeObject(this.objects.get(objectStack[i]))));
        }

        rows.push(this.menu.makeRow(
            `tileStack (${tileStack.length}):`,
            null,
            null,
            { color: UiConfig.SECTION_COLOR },
        ));

        for (let i: uint = tileStack.length - 1; i >= 0; i--) {
            rows.push(this.menu.makeRow(TileContextMenu.describeTile(this.tiles.get(tileStack[i]))));
        }

        rows.push(this.menu.makeRow(
            'Cell info:',
            null,
            null,
            { color: UiConfig.SECTION_COLOR },
        ));

        for (const line of this.buildCellInfo(cell)) {
            rows.push(this.menu.makeRow(line));
        }

        return rows;
    }

    /**
     * Właściwości komórki, czyli to, czym ona jest dla gry.
     *
     * Źródłem jest ostatni obiekt, a gdy obiektów nie ma - ostatni kafel. Kolizja jest wyjątkiem:
     * bierze się z OBU stosów naraz, więc komórka potrafi kolidować mimo obiektu bez kolizji.
     */
    private buildCellInfo(cell: Cell): string[]
    {
        const object: MapObject|null = this.objects.get(cell.getTopObjectId());
        const collision: boolean = cell.hasCollision(this.tiles, this.objects);

        if (object !== null) {
            return [
                `textureId: ${object.textureId}`,
                `name: ${object.name}`,
                `type: ${object.type}`,
                `collision: ${collision}`,
                `canPickup: ${object.canPickup}`,
                `canMove: ${object.canMove}`,
                `canUse: ${object.canUse}`,
                `canStack: ${object.canStack}`,
                `active: ${object.active}`,
                `weight: ${object.weight}`,
                `time: ${object.timeLeftSec}`,
            ];
        }

        const tile: Tile|null = this.tiles.get(cell.getTopTileId());

        if (tile === null) {
            return ['empty'];
        }

        return [
            `textureId: ${tile.textureId}`,
            `name: ${tile.name}`,
            `type: ${tile.type}`,
            `collision: ${collision}`,
            `agg: ${tile.isAggregate}`,
            `speed: ${cell.getSpeedFactor(this.tiles)}`,
        ];
    }

    private static describeObject(object: MapObject|null): string
    {
        if (object === null) {
            return '- missing object';
        }

        return `- TEXID: ${object.textureId}, NAME: ${object.name}, TYPE: ${object.type}`
            + `, COLLISION: ${object.collision}, CAN_PICKUP: ${object.canPickup}`
            + `, CAN_MOVE: ${object.canMove}, CAN_USE: ${object.canUse}`
            + `, CAN_STACK: ${object.canStack}, ACTIVE: ${object.active}`
            + `, WEIGHT: ${object.weight}, TIME: ${object.timeLeftSec}`;
    }

    private static describeTile(tile: Tile|null): string
    {
        if (tile === null) {
            return '- missing tile';
        }

        return `- TEXID: ${tile.textureId}, NAME: ${tile.name}, TYPE: ${tile.type}`
            + `, COLLISION: ${tile.collision}, AGG: ${tile.isAggregate}, SPEED: ${tile.speedFactor}`;
    }
}
