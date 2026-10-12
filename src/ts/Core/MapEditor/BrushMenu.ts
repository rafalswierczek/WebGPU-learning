import { Brush } from "../Textures/Brush";
import { EditorState } from "./EditorState";
import { KeyboardFocus } from "../Ui/KeyboardFocus";
import { MapObject } from "../Map/MapObject";
import { ObjectRegistry } from "../Map/ObjectRegistry";
import { ObjectType } from "../Map/ObjectType";
import { TextInput } from "../Ui/TextInput";
import { Tile } from "../Map/Tile";
import { TileRegistry } from "../Map/TileRegistry";
import { TileType } from "../Map/TileType";
import { UiMenu, menuRow } from "../Ui/UiMenu";
import { UiPainter } from "../Ui/UiPainter";

/**
 * Okno atrybutów pędzla, otwierane kliknięciem w podgląd pod debuggerem.
 *
 * Edytuje to, czym się MALUJE, a nie to, w co się kliknęło - dlatego nie ma tu stosów ani
 * słowa "top". Zmiana idzie do wpisu w rejestrze, więc obejmuje wszystkie komórki z tą teksturą;
 * o to właśnie chodzi, bo rejestr trzyma jeden wpis na teksturę.
 *
 * Wpis jest zakładany w chwili otwarcia okna, jeśli jeszcze nie istnieje - inaczej nie byłoby
 * czego edytować, dopóki tekstura nie trafi na mapę.
 */
export class BrushMenu
{
    private static readonly DECIMAL_PATTERN: RegExp = /^[0-9.]$/;
    private static readonly INTEGER_PATTERN: RegExp = /^[0-9]$/;

    private readonly editorState: EditorState;
    private readonly tiles: TileRegistry;
    private readonly objects: ObjectRegistry;
    private readonly menu: UiMenu;

    /** Osobne pole na każdą liczbę - inaczej jedno obsługiwałoby wszystkie wiersze naraz */
    private readonly speedInput: TextInput;
    private readonly weightInput: TextInput;
    private readonly timeInput: TextInput;

    public constructor(
        editorState: EditorState,
        tiles: TileRegistry,
        objects: ObjectRegistry,
        keyboardFocus: KeyboardFocus,
    ) {
        this.editorState = editorState;
        this.tiles = tiles;
        this.objects = objects;
        this.menu = new UiMenu((): menuRow[] => this.buildRows());

        this.speedInput = this.menu.registerInput(new TextInput(keyboardFocus, BrushMenu.DECIMAL_PATTERN, 8));
        this.weightInput = this.menu.registerInput(new TextInput(keyboardFocus, BrushMenu.INTEGER_PATTERN, 8));
        this.timeInput = this.menu.registerInput(new TextInput(keyboardFocus, BrushMenu.INTEGER_PATTERN, 10));
    }

    public setMetrics(painter: UiPainter): void
    {
        this.menu.setMetrics(painter);
    }

    public isOpen(): boolean
    {
        return this.menu.isOpen();
    }

    /** Kliknięcie w podgląd otwiera okno, kolejne je zamyka */
    public toggle(canvasX: uint, canvasY: uint, canvasWidth: uint, canvasHeight: uint): void
    {
        if (this.menu.isOpen()) {
            this.close();

            return;
        }

        this.materializeEntry();
        this.menu.openAt(
            UiMenu.place(canvasX, canvasY, canvasWidth, canvasHeight),
            `Brush: ${this.editorState.placesObject() ? 'object' : 'tile'} ${this.getTextureId()}`,
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

    /** Tekstura widoczna w podglądzie - ta sama, którą pokazuje kwadrat pod debuggerem */
    private getTextureId(): uint
    {
        return this.editorState.getBrush().getPreviewTextureId();
    }

    /** Zakłada wpis w rejestrze, jeśli tekstura nie trafiła jeszcze na mapę */
    private materializeEntry(): void
    {
        const brush: Brush = this.editorState.getBrush();
        const textureId: uint = brush.getPreviewTextureId();

        if (this.editorState.placesObject()) {
            this.objects.ensure(
                textureId,
                brush.getTextureName(textureId),
                brush.collidesAt(textureId),
                brush.getType(),
            );

            return;
        }

        this.tiles.ensure(
            textureId,
            brush.getTextureName(textureId),
            brush.isAggregate(),
            brush.collidesAt(textureId),
            brush.getType(),
            brush.getSpeedFactor(),
        );
    }

    private buildRows(): menuRow[]
    {
        return this.editorState.placesObject()
            ? this.buildObjectRows(this.objects.get(this.getTextureId()))
            : this.buildTileRows(this.tiles.get(this.getTextureId()));
    }

    private buildTileRows(tile: Tile|null): menuRow[]
    {
        if (tile === null) {
            return [this.menu.makeRow('No tile selected')];
        }

        return [
            // textureId, name i isAggregate biora sie z dysku, wiec sa tylko do odczytu
            this.menu.makeRow(`textureId: ${tile.textureId}`),
            this.menu.makeRow(`name: ${tile.name}`),
            this.menu.makeRow(`isAggregate: ${tile.isAggregate}`),
            this.menu.makeRow(`type: ${tile.type}`, (): void => {
                tile.type = TileType.next(tile.type);
                this.tiles.touch();
            }),
            this.menu.makeRow(`collision: ${tile.collision}`, (): void => {
                tile.collision = !tile.collision;
                this.tiles.touch();
            }),
            this.menu.makeRow(`speedFactor: ${tile.speedFactor}`, (): void => {
                this.speedInput.focus(String(tile.speedFactor), (value: string): void => {
                    tile.setSpeedFactor(Number.parseFloat(value));
                    this.tiles.touch();
                });
            }, this.speedInput),
        ];
    }

    private buildObjectRows(object: MapObject|null): menuRow[]
    {
        if (object === null) {
            return [this.menu.makeRow('No object selected')];
        }

        return [
            this.menu.makeRow(`textureId: ${object.textureId}`),
            this.menu.makeRow(`name: ${object.name}`),
            this.menu.makeRow(`type: ${object.type}`, (): void => {
                object.type = ObjectType.next(object.type);
                this.objects.touch();
            }),
            this.toggleRow('collision', object.collision, (): void => {
                object.collision = !object.collision;
            }),
            this.toggleRow('canPickup', object.canPickup, (): void => {
                object.canPickup = !object.canPickup;
            }),
            this.toggleRow('canMove', object.canMove, (): void => {
                object.canMove = !object.canMove;
            }),
            this.toggleRow('canStack', object.canStack, (): void => {
                object.canStack = !object.canStack;
            }),
            this.toggleRow('canUse', object.canUse, (): void => {
                object.canUse = !object.canUse;
            }),
            this.toggleRow('active', object.active, (): void => {
                object.active = !object.active;
            }),
            this.numberRow('weight', object.weight, this.weightInput, (value: uint): void => {
                object.weight = value;
            }),
            this.numberRow('timeLeftSec', object.timeLeftSec, this.timeInput, (value: uint): void => {
                object.timeLeftSec = value;
            }),
        ];
    }

    /** Wiersz przełączający wartość logiczną - takich jest w obiekcie sześć */
    private toggleRow(label: string, value: boolean, toggle: () => void): menuRow
    {
        return this.menu.makeRow(`${label}: ${value}`, (): void => {
            toggle();
            this.objects.touch();
        });
    }

    private numberRow(label: string, value: uint, input: TextInput, apply: (value: uint) => void): menuRow
    {
        return this.menu.makeRow(`${label}: ${value}`, (): void => {
            input.focus(String(value), (text: string): void => {
                apply(Math.max(0, Math.trunc(Number.parseInt(text, 10) || 0)));
                this.objects.touch();
            });
        }, input);
    }
}
