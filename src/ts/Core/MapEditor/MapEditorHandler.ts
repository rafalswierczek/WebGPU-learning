import { Brush } from "../Textures/Brush";
import { Camera } from "../Camera";
import { Canvas } from "../Canvas/Canvas";
import { DebugOverlay } from "../Debug/DebugOverlay";
import { EditorState } from "./EditorState";
import { GameMap } from "../Map/GameMap";
import { ObjectRegistry } from "../Map/ObjectRegistry";
import { TileRegistry } from "../Map/TileRegistry";
import { GridPass } from "./GridPass";
import { MapConfig } from "../Map/MapConfig";
import { UiContext } from "../Ui/UiContext";
import { Pointer } from "../Input/Pointer";
import { AppState } from "../AppState";
import { EditorUi } from "./EditorUi";
import { UiConfig } from "../Config/UiConfig";
import { RenderPassColorAttachment } from "../../WebGPU/RenderPass/RenderPassColorAttachment";
import { RenderPassDescriptor } from "../../WebGPU/RenderPass/RenderPassDescriptor";
import { RenderPassHandler } from "../RenderPassHandler";
import { ResourceLoader } from "../ResourceLoader";
import { SquareConfig } from "../Config/SquareConfig";
import { ThumbnailPass } from "./ThumbnailPass";
import { TilePass } from "./TilePass";
import { TileTextureAtlas } from "./TileTextureAtlas";
import { WebGPU } from "../WebGPU";

/**
 * Spina przejścia edytora w jedną klatkę: siatka -> kafle -> HUD.
 *
 * Wszystko, co kosztowne (tekstury, pipeline'y, bufory), powstaje raz w create().
 * W handle() zostaje tylko zapis uniformu i nagranie poleceń - żadnych createTexture,
 * createRenderPipeline ani await w środku klatki.
 */
export class MapEditorHandler implements RenderPassHandler
{
    /** O 1 px szersza niż linia siatki, żeby zaznaczenie było widoczne na tle kratki */
    private static readonly SELECTION_BORDER_PX: uint = 2;

    /** Kolor tła edytora. Należy do edytora, nie do opakowań WebGPU. */
    private static readonly CLEAR_COLOR: GPUColor = { r: 0.07, g: 0.07, b: 0.09, a: 1.0 };

    private readonly device: GPUDevice;
    private readonly context: GPUCanvasContext;
    private readonly canvas: Canvas;
    private readonly camera: Camera;
    private readonly map: GameMap;
    private readonly tiles: TileRegistry;
    private readonly objects: ObjectRegistry;
    private readonly editorState: EditorState;
    private readonly pointer: Pointer;
    private readonly debugOverlay: DebugOverlay;
    private readonly ui: UiContext;
    private readonly gridPass: GridPass;
    private readonly tilePass: TilePass;
    private readonly thumbnailPass: ThumbnailPass;
    private readonly atlas: TileTextureAtlas;
    private readonly editorUi: EditorUi;
    private readonly appState: AppState;

    private constructor(
        webGPU: WebGPU,
        camera: Camera,
        map: GameMap,
        tiles: TileRegistry,
        objects: ObjectRegistry,
        editorState: EditorState,
        pointer: Pointer,
        debugOverlay: DebugOverlay,
        ui: UiContext,
        gridPass: GridPass,
        tilePass: TilePass,
        thumbnailPass: ThumbnailPass,
        atlas: TileTextureAtlas,
        editorUi: EditorUi,
        appState: AppState,
    ) {
        this.device = webGPU.device;
        this.context = webGPU.context;
        this.canvas = webGPU.canvas;
        this.camera = camera;
        this.map = map;
        this.tiles = tiles;
        this.objects = objects;
        this.editorState = editorState;
        this.pointer = pointer;
        this.debugOverlay = debugOverlay;
        this.ui = ui;
        this.gridPass = gridPass;
        this.tilePass = tilePass;
        this.thumbnailPass = thumbnailPass;
        this.atlas = atlas;
        this.editorUi = editorUi;
        this.appState = appState;
    }

    public static async create(
        webGPU: WebGPU,
        camera: Camera,
        map: GameMap,
        tiles: TileRegistry,
        objects: ObjectRegistry,
        editorState: EditorState,
        pointer: Pointer,
        debugOverlay: DebugOverlay,
        textures: TileTextureAtlas,
        editorUi: EditorUi,
        appState: AppState,
        ui: UiContext,
    ): Promise<MapEditorHandler> {
        const device: GPUDevice = webGPU.device;
        const format: GPUTextureFormat = webGPU.canvasConfiguration.format;
        const layout: GPUBindGroupLayout = ui.getFrameBindGroupLayout();

        editorUi.setMetrics(ui.painter);

        return new MapEditorHandler(
            webGPU,
            camera,
            map,
            tiles,
            objects,
            editorState,
            pointer,
            debugOverlay,
            ui,
            await GridPass.create(device, format, layout),
            await TilePass.create(device, format, layout, textures),
            await ThumbnailPass.create(device, format, layout, textures),
            textures,
            editorUi,
            appState,
        );
    }

    public handle(commandEncoder: GPUCommandEncoder): void
    {
        this.debugOverlay.onFrame(performance.now());
        this.updateFrame();

        this.tilePass.update(
            this.map,
            this.tiles,
            this.objects,
            this.camera,
            this.canvas,
            this.editorState.getActiveLayer(),
        );
        this.debugOverlay.setVisibleTileCount(this.tilePass.getVisibleTileCount());

        // kolejność rysowania UI = kolejność warstw na ekranie
        this.ui.painter.setTextScale(UiConfig.EDITOR_TEXT_SCALE);
        this.ui.painter.begin();
        this.thumbnailPass.begin();
        this.drawSelection();
        this.editorUi.render(this.ui.painter, this.thumbnailPass, performance.now());
        this.debugOverlay.render(this.ui.painter);
        this.drawPaused();
        this.ui.painter.end();
        this.thumbnailPass.end();

        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass(new RenderPassDescriptor(
            'render_pass_map_editor',
            [new RenderPassColorAttachment(
                this.context.getCurrentTexture(),
                'clear',
                'store',
                MapEditorHandler.CLEAR_COLOR,
            )],
        ));

        this.gridPass.draw(renderPass, this.ui.getFrameBindGroup());
        this.tilePass.draw(renderPass, this.ui.getFrameBindGroup());
        this.ui.painter.draw(renderPass, this.ui.getFrameBindGroup());
        // miniatury na końcu, żeby leżały na tle panelu, a nie pod nim
        this.thumbnailPass.draw(renderPass, this.ui.getFrameBindGroup());

        renderPass.end();
    }

    /** Mały czarny box z napisem PAUSED, pod paskiem menu */
    private drawPaused(): void
    {
        if (!this.appState.isPaused()) {
            return;
        }

        const label: string = 'PAUSED';
        const width: uint = this.ui.painter.measureText(label) + UiConfig.PADDING * 2;
        const height: uint = this.ui.painter.getLineHeight() + UiConfig.PADDING * 2;
        const x: uint = Math.floor((this.canvas.getWidth() - width) / 2);

        this.ui.painter.drawRect(x, UiConfig.PAUSED_MARGIN_TOP, width, height, UiConfig.PANEL_COLOR);
        this.ui.painter.drawBorder(x, UiConfig.PAUSED_MARGIN_TOP, width, height, UiConfig.BORDER_PX, UiConfig.BORDER_COLOR);
        this.ui.painter.drawText(x + UiConfig.PADDING, UiConfig.PAUSED_MARGIN_TOP + UiConfig.PADDING, label, UiConfig.TEXT_COLOR);
    }

    /** Biała ramka wokół obszaru pędzla; znika razem z kursorem poza canvasem */
    private drawSelection(): void
    {
        const rect: rectPx|null = this.getSelectionRect();

        if (rect === null) {
            return;
        }

        this.ui.painter.drawBorder(
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            MapEditorHandler.SELECTION_BORDER_PX,
            UiConfig.TEXT_COLOR,
        );
    }

    /**
     * Kafel pod kursorem w pikselach canvasa. Zaznaczenie znika razem z kursorem poza canvasem,
     * dlatego przy braku wskazania zwracamy null i ramka po prostu nie powstaje.
     */
    private getSelectionRect(): rectPx|null
    {
        if (!this.pointer.isInside()) {
            return null;
        }

        const scaleX: float = this.camera.getPixelsPerWorldX(this.canvas.getWidth());
        const scaleY: float = this.camera.getPixelsPerWorldY(this.canvas.getHeight());
        const brush: Brush = this.editorState.getBrush();
        const originX: int = (this.pointer.getTileX() - this.editorState.getBrushOffsetX()) * SquareConfig.LENGTH;
        const originY: int = (this.pointer.getTileY() - this.editorState.getBrushOffsetY()) * SquareConfig.LENGTH;
        // zaznaczenie ma kształt odcisku pędzla, więc pokazuje, co dokładnie stanie na mapie
        const worldWidth: float = SquareConfig.LENGTH * brush.getColumns();
        const worldHeight: float = SquareConfig.LENGTH * brush.getRows();
        const height: float = worldHeight * scaleY;

        // świat rośnie w górę, canvas w dół, więc górny bok kafla na ekranie liczymy od jego dolnej krawędzi
        return {
            x: Math.round((originX - this.camera.getX()) * scaleX),
            y: Math.round(this.canvas.getHeight() - (originY - this.camera.getY()) * scaleY - height),
            width: Math.round(worldWidth * scaleX),
            height: Math.round(height),
        };
    }

    private updateFrame(): void
    {
        this.ui.updateFrame(
            this.camera.getX(),
            this.camera.getY(),
            this.canvas.getWidth(),
            this.canvas.getHeight(),
            SquareConfig.LENGTH,
            MapConfig.TILES_IN_ROW * SquareConfig.LENGTH,
            this.camera.getPixelsPerWorldX(this.canvas.getWidth()),
            this.camera.getPixelsPerWorldY(this.canvas.getHeight()),
            this.atlas.getColumns(),
            this.atlas.getRows(),
        );
    }
}
