import { MapConfig } from "../Map/MapConfig";
import { SquareConfig } from "../Config/SquareConfig";

/**
 * Pozycja myszy w jednym miejscu, w trzech układach naraz.
 * Zapisuje ją MapEditorController (jest właścicielem zdarzeń canvasa), czyta edytor i debugger.
 */
export class Pointer
{
    private canvasX: uint = 0;
    private canvasY: uint = 0;
    private worldX: uint = 0;
    private worldY: uint = 0;
    private inside: boolean = false;

    /**
     * @param canvasX piksele canvasa, origin w lewym górnym rogu (tak jak zdarzenia myszy)
     * @param canvasY piksele canvasa, rosną w dół
     * @param worldX  piksele świata, rosną w prawo
     * @param worldY  piksele świata, rosną w GÓRĘ
     */
    public update(canvasX: uint, canvasY: uint, worldX: uint, worldY: uint): void
    {
        this.canvasX = canvasX;
        this.canvasY = canvasY;
        this.worldX = worldX;
        this.worldY = worldY;
        this.inside = true;
    }

    public leave(): void
    {
        this.inside = false;
    }

    public isInside(): boolean
    {
        return this.inside;
    }

    public getCanvasX(): uint
    {
        return this.canvasX;
    }

    public getCanvasY(): uint
    {
        return this.canvasY;
    }

    public getWorldX(): uint
    {
        return this.worldX;
    }

    public getWorldY(): uint
    {
        return this.worldY;
    }

    public getTileX(): uint
    {
        return Math.floor(this.worldX / SquareConfig.LENGTH);
    }

    public getTileY(): uint
    {
        return Math.floor(this.worldY / SquareConfig.LENGTH);
    }

    public getChunkX(): uint
    {
        return Math.floor(this.getTileX() / MapConfig.TILES_IN_ROW);
    }

    public getChunkY(): uint
    {
        return Math.floor(this.getTileY() / MapConfig.TILES_IN_ROW);
    }
}
