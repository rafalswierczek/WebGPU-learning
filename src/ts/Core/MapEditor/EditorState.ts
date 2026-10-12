import { Brush } from "../Textures/Brush";
import { BrushConfig } from "../Textures/BrushConfigJson";
import { BrushSizeConfig } from "../Config/BrushSizeConfig";
import { MapConfig } from "../Map/MapConfig";

/**
 * Stan edytora dzielony między kontroler (zapisuje), renderer i debugger (czytają).
 * Bez tego renderer musiałby znać kontroler, a debugger renderer.
 */
export class EditorState
{
    private activeLayer: int = MapConfig.GROUND_LAYER;

    /**
     * Osobny pędzel dla kafli i dla obiektów, bo wybiera się je w osobnych oknach (Tile i Object)
     * i przełączanie między nimi nie może gubić poprzedniego wyboru.
     */
    private tileBrush: Brush = EditorState.createFallbackBrush();
    private objectBrush: Brush = EditorState.createFallbackBrush();
    private brushPlacesObject: boolean = false;
    /** Rozmiar dotyczy tylko pędzla 1x1; pędzel złożony zawsze wraca do swojego kształtu */
    private brushSize: uint = BrushSizeConfig.DEFAULT_SIZE;

    public getActiveLayer(): int
    {
        return this.activeLayer;
    }

    public setActiveLayer(layer: int): void
    {
        this.activeLayer = MapConfig.toLayer(MapConfig.toLayerIndex(layer));
    }

    /** Pędzel gotowy do malowania: z rozmiarem, jeśli w ogóle da się go zmieniać */
    public getBrush(): Brush
    {
        const brush: Brush = this.brushPlacesObject ? this.objectBrush : this.tileBrush;

        return brush.resized(this.brushSize);
    }

    /** Pędzel startowy dla obu zakładek; nie przełącza celu, bo użytkownik jeszcze nic nie wybrał */
    public setInitialBrush(brush: Brush): void
    {
        this.tileBrush = brush;
        this.objectBrush = brush;
    }

    public setTileBrush(brush: Brush): void
    {
        this.tileBrush = brush;
        this.brushPlacesObject = false;
    }

    public setObjectBrush(brush: Brush): void
    {
        this.objectBrush = brush;
        this.brushPlacesObject = true;
    }

    public placesObject(): boolean
    {
        return this.brushPlacesObject;
    }

    public getBrushSize(): uint
    {
        return this.getBrush().getSize();
    }

    /**
     * Przesunięcie lewego dolnego rogu odcisku względem kafla pod kursorem - mysz zostaje
     * mniej więcej na środku pędzla.
     */
    public getBrushOffsetX(): uint
    {
        return Math.floor((this.getBrush().getColumns() - 1) / 2);
    }

    public getBrushOffsetY(): uint
    {
        return Math.floor((this.getBrush().getRows() - 1) / 2);
    }

    /** @returns false, gdy pędzla nie da się powiększyć (złożony albo już największy) */
    public increaseBrush(): boolean
    {
        if (!this.getBrush().isResizable()) {
            return false;
        }

        const next: uint = BrushSizeConfig.getNextSize(this.brushSize);

        if (next === this.brushSize) {
            return false;
        }

        this.brushSize = next;

        return true;
    }

    public decreaseBrush(): void
    {
        if (!this.getBrush().isResizable()) {
            return;
        }

        this.brushSize = BrushSizeConfig.getPreviousSize(this.brushSize);
    }

    /**
     * Pędzel zastępczy na czas, zanim biblioteka tekstur zdąży się wczytać.
     *
     * Nie sięga po teksturę 0, bo takiej nie musi być - renderer po prostu nic nie narysuje,
     * dopóki użytkownik nie wybierze czegoś z listy.
     */
    private static createFallbackBrush(): Brush
    {
        return new Brush([[0]], BrushConfig.getDefault(), '');
    }
}
