import { Camera } from "../Camera";
import { EditorState } from "../MapEditor/EditorState";
import { Pointer } from "../Input/Pointer";
import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "../Ui/UiPainter";

/** Stan okna debugowego. Rysowaniem zajmuje się OverlayPass - tu jest tylko treść i przełącznik. */
export class DebugOverlay
{
    private static readonly FPS_SAMPLE_MS: float = 500;
    private static readonly PADDING: uint = 6;
    private static readonly PANEL_COLOR: colorRgba = [0.0, 0.0, 0.0, 1.0];

    private readonly pointer: Pointer;
    private readonly camera: Camera;
    private readonly editorState: EditorState;
    private readonly keyDownHandlerRef: (event: KeyboardEvent) => void;

    private visible: boolean = false;
    private attached: boolean = false;
    private fps: uint = 0;
    private framesInSample: uint = 0;
    private sampleStart: float = 0;
    private visibleTiles: uint = 0;

    public constructor(pointer: Pointer, camera: Camera, editorState: EditorState)
    {
        this.pointer = pointer;
        this.camera = camera;
        this.editorState = editorState;
        this.keyDownHandlerRef = this.keyDownHandler.bind(this);
    }

    public attach(): void
    {
        if (this.attached) {
            return;
        }

        document.addEventListener('keydown', this.keyDownHandlerRef);
        this.attached = true;
    }

    public detach(): void
    {
        if (!this.attached) {
            return;
        }

        document.removeEventListener('keydown', this.keyDownHandlerRef);
        this.attached = false;
    }

    public isVisible(): boolean
    {
        return this.visible;
    }

    public toggle(): void
    {
        this.visible = !this.visible;
    }

    /** Wołane raz na klatkę przez handler renderowania. */
    public onFrame(now: float): void
    {
        if (this.sampleStart === 0) {
            this.sampleStart = now;
        }

        this.framesInSample++;

        const elapsed: float = now - this.sampleStart;

        if (elapsed >= DebugOverlay.FPS_SAMPLE_MS) {
            this.fps = Math.round(this.framesInSample * 1000 / elapsed);
            this.framesInSample = 0;
            this.sampleStart = now;
        }
    }

    public setVisibleTileCount(count: uint): void
    {
        this.visibleTiles = count;
    }

    /**
     * Dolna krawędź panelu; gdy panel jest schowany, jego górna krawędź.
     *
     * Dzięki temu podgląd pędzla może stać pod debuggerem i nie musi znać jego zawartości.
     */
    public getBottomY(painter: UiPainter): uint
    {
        if (!this.visible) {
            return UiConfig.DEBUG_MARGIN_TOP;
        }

        return UiConfig.DEBUG_MARGIN_TOP + this.getPanelHeight(painter);
    }

    private getPanelHeight(painter: UiPainter): uint
    {
        return this.getLines().length * painter.getLineHeight() + DebugOverlay.PADDING * 2;
    }

    public render(painter: UiPainter): void
    {
        if (!this.visible) {
            return;
        }

        const lines: string[] = this.getLines();
        // font jest proporcjonalny, wiec najdluzsza linia to nie ta o najwiekszej liczbie znakow
        const longest: uint = lines.reduce(
            (max: uint, line: string): uint => Math.max(max, painter.measureText(line)),
            0,
        );
        const width: uint = longest + DebugOverlay.PADDING * 2;
        const height: uint = this.getPanelHeight(painter);

        painter.drawRect(UiConfig.DEBUG_MARGIN_LEFT, UiConfig.DEBUG_MARGIN_TOP, width, height, DebugOverlay.PANEL_COLOR);

        for (let i: uint = 0; i < lines.length; i++) {
            painter.drawText(
                UiConfig.DEBUG_MARGIN_LEFT + DebugOverlay.PADDING,
                UiConfig.DEBUG_MARGIN_TOP + DebugOverlay.PADDING + i * painter.getLineHeight(),
                lines[i],
                UiConfig.TEXT_COLOR,
            );
        }
    }

    public getLines(): string[]
    {
        const lines: string[] = [
            `fps    ${this.fps}`,
            `layer  ${this.editorState.getActiveLayer()}`,
            `brush  ${this.editorState.getBrush().getColumns()}x${this.editorState.getBrush().getRows()}`
                + ` ${this.editorState.placesObject() ? 'object' : 'tile'}`,
            `zoom   ${this.camera.getZoom().toFixed(2)}x`,
            `tiles  ${this.visibleTiles}`,
            `camera ${this.camera.getX()}, ${this.camera.getY()}`,
        ];

        if (!this.pointer.isInside()) {
            lines.push('mouse  outside canvas');

            return lines;
        }

        lines.push(`canvas ${this.pointer.getCanvasX()}, ${this.pointer.getCanvasY()}`);
        lines.push(`world  ${this.pointer.getWorldX()}, ${this.pointer.getWorldY()}`);
        lines.push(`tile   ${this.pointer.getTileX()}, ${this.pointer.getTileY()}`);
        lines.push(`chunk  ${this.pointer.getChunkX()}, ${this.pointer.getChunkY()}`);

        return lines;
    }

    private keyDownHandler(event: KeyboardEvent): void
    {
        if (event.ctrlKey && event.key.toLowerCase() === 'q') {
            event.preventDefault();

            this.toggle();
        }
    }
}
