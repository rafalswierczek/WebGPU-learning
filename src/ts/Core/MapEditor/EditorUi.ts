import { BrushMenu } from "./BrushMenu";
import { Camera } from "../Camera";
import { DebugOverlay } from "../Debug/DebugOverlay";
import { EditorState } from "./EditorState";
import { FullScreen } from "../FullScreen";
import { GameMap } from "../Map/GameMap";
import { MapRepository } from "../Map/MapRepository";
import { Canvas } from "../Canvas/Canvas";
import { MapConfig } from "../Map/MapConfig";
import { MenuBar } from "../Ui/MenuBar";
import { ResolutionConfig } from "../Config/ResolutionConfig";
import { ScreenManager } from "../Screen/ScreenManager";
import { ScreenName } from "../Screen/Screen";
import { Settings } from "../Settings/Settings";
import { SettingsRepository } from "../Settings/SettingsRepository";
import { SquareConfig } from "../Config/SquareConfig";
import { Brush } from "../Textures/Brush";
import { BrushTreeView } from "../Ui/BrushTreeView";
import { TextureLibrary } from "../Textures/TextureLibrary";
import { ThumbnailPainter } from "../Ui/ThumbnailPainter";
import { TileContextMenu } from "./TileContextMenu";
import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "../Ui/UiPainter";
import { UiWindow } from "../Ui/UiWindow";

/**
 * Cały interfejs edytora w jednym miejscu: pasek menu, okna z niego otwierane i menu kafla.
 *
 * Kontroler wejścia i renderer rozmawiają wyłącznie z tą klasą, dzięki czemu nie muszą wiedzieć,
 * ile okien istnieje ani w jakiej kolejności obsługiwać kliknięcia.
 */
export class EditorUi
{
    private readonly canvas: Canvas;
    private readonly camera: Camera;
    private readonly contextMenu: TileContextMenu;
    private readonly map: GameMap;
    private readonly mapRepository: MapRepository;
    private readonly settings: Settings;
    private readonly settingsRepository: SettingsRepository;
    private readonly screens: ScreenManager;
    private readonly fullScreen: FullScreen;
    private readonly editorState: EditorState;
    private readonly debugOverlay: DebugOverlay;
    private readonly brushMenu: BrushMenu;
    /**
     * Podglad pedzla liczony przy rysowaniu, bo jego pozycja zalezy od wysokosci okna debugowego.
     * Trafienie mysza sprawdza sie prostokatem z poprzedniej klatki - panel zmienia rozmiar
     * najwyzej o wiersz, wiec roznicy nie widac.
     */
    private previewRect: rectPx = { x: 0, y: 0, width: 0, height: 0 };
    /** Dwie osobne wyszukiwarki: jedna wybiera pędzel kafla, druga pędzel obiektu */
    private readonly tileTree: BrushTreeView;
    private readonly objectTree: BrushTreeView;
    private menuBar: MenuBar;

    private readonly optionsWindow: UiWindow = new UiWindow('Options', UiConfig.OPTIONS_WIDTH, UiConfig.OPTIONS_HEIGHT);
    private readonly tileWindow: UiWindow = new UiWindow('Tile', UiConfig.BRUSH_WIDTH, UiConfig.BRUSH_HEIGHT);
    private readonly objectWindow: UiWindow = new UiWindow('Object', UiConfig.BRUSH_WIDTH, UiConfig.BRUSH_HEIGHT);
    private readonly resolutionWindow: UiWindow = new UiWindow('Resolution', UiConfig.RESOLUTION_WIDTH, UiConfig.RESOLUTION_HEIGHT);

    private readonly windows: UiWindow[];

    private metrics: UiPainter|null = null;
    private hoveredResolution: int = -1;

    public constructor(
        canvas: Canvas,
        camera: Camera,
        contextMenu: TileContextMenu,
        map: GameMap,
        mapRepository: MapRepository,
        settings: Settings,
        settingsRepository: SettingsRepository,
        screens: ScreenManager,
        fullScreen: FullScreen,
        editorState: EditorState,
        library: TextureLibrary,
        debugOverlay: DebugOverlay,
        brushMenu: BrushMenu,
    ) {
        this.canvas = canvas;
        this.camera = camera;
        this.contextMenu = contextMenu;
        this.map = map;
        this.mapRepository = mapRepository;
        this.settings = settings;
        this.settingsRepository = settingsRepository;
        this.screens = screens;
        this.fullScreen = fullScreen;
        this.editorState = editorState;
        this.debugOverlay = debugOverlay;
        this.brushMenu = brushMenu;
        this.tileTree = new BrushTreeView(
            library.getRoot(),
            (brush: Brush): void => this.editorState.setTileBrush(brush),
        );
        this.objectTree = new BrushTreeView(
            library.getRoot(),
            (brush: Brush): void => this.editorState.setObjectBrush(brush),
            false,
        );
        this.windows = [this.optionsWindow, this.tileWindow, this.objectWindow, this.resolutionWindow];
        this.menuBar = this.buildMenuBar();
    }

    /**
     * Pasek jest przebudowywany po zapisie, bo etykieta z wersją mapy jest jego częścią -
     * inaczej numer nie odświeżyłby się bez przeładowania strony.
     */
    private buildMenuBar(): MenuBar
    {
        return new MenuBar([
            { label: 'Tile', onClick: (): void => this.toggleWindow(this.tileWindow) },
            { label: 'Object', onClick: (): void => this.toggleWindow(this.objectWindow) },
            { label: 'Save', onClick: (): void => { this.saveMap(); } },
            { label: 'Options', onClick: (): void => this.toggleWindow(this.optionsWindow) },
            { label: 'Resolution', onClick: (): void => this.toggleWindow(this.resolutionWindow) },
            { label: 'Center', onClick: (): void => this.centerCamera() },
            { label: 'Full screen', onClick: (): void => this.fullScreen.toggle() },
            { label: `Map version: ${this.mapRepository.getMapVersion()}`, onClick: null },
            { label: 'Exit', onClick: (): void => this.screens.goTo(ScreenName.MAIN_MENU) },
        ]);
    }

    private saveMap(): void
    {
        this.mapRepository.saveWithNewVersion(this.map)
            .then((chunks: uint): void => {
                console.log(`%cMap saved: ${chunks} chunks, version ${this.mapRepository.getMapVersion()}`, 'color: green;');

                this.rebuildMenuBar();
            })
            .catch((error: Error): void => console.error(error));
    }

    private rebuildMenuBar(): void
    {
        this.menuBar = this.buildMenuBar();

        if (this.metrics !== null) {
            this.menuBar.setFontMetrics(
                (text: string): uint => (this.metrics as UiPainter).measureText(text),
                this.metrics.getLineHeight(),
            );
        }

        this.menuBar.layout(this.canvas.getWidth());
    }

    /**
     * Malarz jest zrodlem metryk, bo font jest proporcjonalny - szerokosci tekstu nie da sie
     * policzyc ze stalej, a uklad musi ja znac takze poza rysowaniem klatki.
     */
    public setMetrics(painter: UiPainter): void
    {
        this.metrics = painter;
        this.menuBar.setFontMetrics(
            (text: string): uint => painter.measureText(text),
            painter.getLineHeight(),
        );
        this.contextMenu.setMetrics(painter);
        this.brushMenu.setMetrics(painter);
        this.tileTree.setFontMetrics(painter.getLineHeight());
        this.objectTree.setFontMetrics(painter.getLineHeight());
        this.menuBar.layout(this.canvas.getWidth());
        this.layoutBrushTrees();
    }

    /** Czy w danym punkcie jest jakikolwiek element interfejsu - po tym poznajemy, czy pokazać kursor */
    public isOverUi(canvasX: uint, canvasY: uint): boolean
    {
        if (this.menuBar.contains(canvasX, canvasY) || this.contextMenu.contains(canvasX, canvasY)) {
            return true;
        }

        if (this.brushMenu.contains(canvasX, canvasY) || this.containsPreview(canvasX, canvasY)) {
            return true;
        }

        return this.windows.some((window: UiWindow): boolean => window.contains(canvasX, canvasY));
    }

    public onPointerMove(canvasX: uint, canvasY: uint): void
    {
        this.menuBar.onPointerMove(canvasX, canvasY);
        this.contextMenu.onPointerMove(canvasX, canvasY);
        this.brushMenu.onPointerMove(canvasX, canvasY);
        this.hoveredResolution = this.resolutionWindow.contains(canvasX, canvasY)
            ? this.getResolutionAt(canvasY)
            : -1;

        this.forEachTree((window: UiWindow, tree: BrushTreeView): void => {
            if (window.isOpen()) {
                tree.onPointerMove(canvasX, canvasY);
            } else {
                tree.clearHover();
            }
        });
    }

    /** @returns czy przewijanie zostało pochłonięte przez interfejs (a więc nie zmienia zoomu) */
    public handleWheel(canvasX: uint, canvasY: uint, deltaY: float): boolean
    {
        let handled: boolean = false;

        this.forEachTree((window: UiWindow, tree: BrushTreeView): void => {
            handled = handled || (window.isOpen() && tree.handleWheel(canvasX, canvasY, deltaY));
        });

        return handled;
    }

    /** Obie wyszukiwarki obsługuje się tak samo, różni je tylko okno i cel wyboru */
    private forEachTree(action: (window: UiWindow, tree: BrushTreeView) => void): void
    {
        action(this.tileWindow, this.tileTree);
        action(this.objectWindow, this.objectTree);
    }

    /** @returns czy kliknięcie zostało pochłonięte przez interfejs */
    public handleClick(canvasX: uint, canvasY: uint): boolean
    {
        if (this.menuBar.handleClick(canvasX, canvasY)) {
            return true;
        }

        // podglad otwiera okno atrybutow tego, czym sie maluje
        if (this.containsPreview(canvasX, canvasY)) {
            this.brushMenu.toggle(
                this.previewRect.x + this.previewRect.width,
                this.previewRect.y,
                this.canvas.getWidth(),
                this.canvas.getHeight(),
            );

            return true;
        }

        if (this.brushMenu.handleClick(canvasX, canvasY)) {
            return true;
        }

        for (const window of this.windows) {
            if (!window.isOpen()) {
                continue;
            }

            if (!window.contains(canvasX, canvasY)) {
                window.close(); // kliknięcie poza oknem zamyka je, tak jak w menu systemowych

                return true;
            }

            if (window === this.resolutionWindow) {
                this.applyResolution(this.getResolutionAt(canvasY));
            }

            if (window === this.tileWindow) {
                this.tileTree.handleClick(canvasX, canvasY);
            }

            if (window === this.objectWindow) {
                this.objectTree.handleClick(canvasX, canvasY);
            }

            return true;
        }

        return this.contextMenu.handleClick(canvasX, canvasY);
    }

    public handleKey(event: KeyboardEvent): boolean
    {
        if (this.contextMenu.handleKey(event) || this.brushMenu.handleKey(event)) {
            return true;
        }

        if (event.key === 'Escape') {
            this.closeAll();

            return true;
        }

        return false;
    }

    /** PPM na mapie: menu kafla zamyka okna z paska, zeby nie nakladaly sie na siebie */
    public toggleTileMenu(canvasX: uint, canvasY: uint, tile: coordsTile, layer: int): void
    {
        for (const window of this.windows) {
            window.close();
        }

        this.contextMenu.toggle(canvasX, canvasY, tile, layer, this.canvas.getWidth(), this.canvas.getHeight());
    }

    public closeAll(): void
    {
        this.contextMenu.close();
        this.brushMenu.close();

        for (const window of this.windows) {
            window.close();
        }
    }

    public render(painter: UiPainter, thumbnails: ThumbnailPainter, now: float): void
    {
        this.menuBar.render(painter);
        this.drawBrushPreview(painter, thumbnails);
        this.contextMenu.render(painter, now);
        this.brushMenu.render(painter, now);

        for (const window of this.windows) {
            window.renderChrome(painter);
        }

        this.renderResolutionRows(painter);

        this.forEachTree((window: UiWindow, tree: BrushTreeView): void => {
            if (window.isOpen()) {
                tree.render(painter, thumbnails);
            }
        });
    }

    /** Wywoływane po zmianie rozmiaru canvasa - pasek i otwarte okna muszą wrócić na środek */
    public relayout(): void
    {
        this.menuBar.layout(this.canvas.getWidth());

        for (const window of this.windows) {
            window.center(this.canvas.getWidth(), this.canvas.getHeight());
        }

        this.layoutBrushTrees();
    }

    /**
     * Podglad tekstury pedzla, tuz pod oknem debugowym. Klikniecie w niego otwiera okno atrybutow,
     * wiec jest to element interfejsu, a nie sama dekoracja.
     */
    private drawBrushPreview(painter: UiPainter, thumbnails: ThumbnailPainter): void
    {
        const brush: Brush = this.editorState.getBrush();
        const cell: uint = UiConfig.BRUSH_PREVIEW_PX;
        // pedzel 1x1 powiekszony do NxN maluje wszedzie to samo, wiec podglad zostaje jedna komorka
        const columns: uint = brush.isResizable() ? 1 : brush.getColumns();
        const rows: uint = brush.isResizable() ? 1 : brush.getRows();

        this.previewRect = {
            x: UiConfig.BRUSH_PREVIEW_MARGIN_LEFT,
            y: this.debugOverlay.getBottomY(painter) + UiConfig.BRUSH_PREVIEW_MARGIN_TOP,
            width: columns * cell,
            height: rows * cell,
        };

        painter.drawRect(
            this.previewRect.x,
            this.previewRect.y,
            this.previewRect.width,
            this.previewRect.height,
            UiConfig.PANEL_COLOR,
        );

        // wiersz 0 wzoru to gora obrazka, a podglad tez rosnie w dol - kolejnosc idzie wprost
        for (let row: uint = 0; row < rows; row++) {
            for (let column: uint = 0; column < columns; column++) {
                thumbnails.drawTexture(
                    this.previewRect.x + column * cell,
                    this.previewRect.y + row * cell,
                    cell,
                    cell,
                    brush.getTextureAt(row, column),
                );
            }
        }

        painter.drawBorder(
            this.previewRect.x,
            this.previewRect.y,
            this.previewRect.width,
            this.previewRect.height,
            UiConfig.BORDER_PX,
            this.brushMenu.isOpen() ? UiConfig.INPUT_FOCUS_COLOR : UiConfig.BORDER_COLOR,
        );
    }

    private containsPreview(canvasX: uint, canvasY: uint): boolean
    {
        return canvasX >= this.previewRect.x && canvasX < this.previewRect.x + this.previewRect.width
            && canvasY >= this.previewRect.y && canvasY < this.previewRect.y + this.previewRect.height;
    }

    /** Lista zajmuje całą zawartość swojego okna, więc jedzie za nim przy każdym przesunięciu */
    private layoutBrushTrees(): void
    {
        this.forEachTree((window: UiWindow, tree: BrushTreeView): void => {
            const rect: rectPx = window.getRect();

            tree.setRect({
                x: window.getContentX(),
                y: window.getContentY(),
                width: rect.width - UiConfig.PADDING * 2,
                height: rect.height - (window.getContentY() - rect.y) - UiConfig.PADDING,
            });
        });
    }

    private toggleWindow(target: UiWindow): void
    {
        const wasOpen: boolean = target.isOpen();

        this.closeAll();

        if (wasOpen) {
            return;
        }

        target.center(this.canvas.getWidth(), this.canvas.getHeight());
        target.setOpen(true);

        if (target === this.tileWindow || target === this.objectWindow) {
            this.layoutBrushTrees();
        }
    }

    private centerCamera(): void
    {
        this.camera.centerOn(
            MapConfig.WORLD_TILES_X * SquareConfig.LENGTH / 2,
            MapConfig.WORLD_TILES_Y * SquareConfig.LENGTH / 2,
        );
    }

    private renderResolutionRows(painter: UiPainter): void
    {
        if (!this.resolutionWindow.isOpen()) {
            return;
        }

        const rect: rectPx = this.resolutionWindow.getRect();

        for (let i: uint = 0; i < ResolutionConfig.SIZES.length; i++) {
            const y: uint = this.resolutionWindow.getContentY() + i * this.getLineHeight();
            // po indeksie z ustawien, a nie po szerokosci canvasa: ta jest przemnozona przez
            // devicePixelRatio, a w pelnym ekranie dodatkowo dopasowana do ekranu
            const current: boolean = i === this.settings.getResolutionIndex();

            if (i === this.hoveredResolution) {
                painter.drawRect(rect.x + UiConfig.BORDER_PX, y, rect.width - UiConfig.BORDER_PX * 2, this.getLineHeight(), UiConfig.ROW_HOVER_COLOR);
            }

            painter.drawText(
                this.resolutionWindow.getContentX(),
                y,
                `${current ? '> ' : '  '}${ResolutionConfig.getLabel(ResolutionConfig.SIZES[i])}`,
                current ? UiConfig.INPUT_FOCUS_COLOR : UiConfig.TEXT_COLOR,
            );
        }
    }

    private getLineHeight(): uint
    {
        return this.metrics?.getLineHeight() ?? UiConfig.ROW_HEIGHT;
    }

    private getResolutionAt(canvasY: uint): int
    {
        const index: int = Math.floor((canvasY - this.resolutionWindow.getContentY()) / this.getLineHeight());

        return index >= 0 && index < ResolutionConfig.SIZES.length ? index : -1;
    }

    private applyResolution(index: int): void
    {
        const size: { width: uint, height: uint }|undefined = ResolutionConfig.SIZES[index];

        if (size === undefined) {
            return;
        }

        this.settings.setResolutionIndex(index);
        this.settingsRepository.save(this.settings).catch((error: Error): void => console.error(error));

        // przez FullScreen, bo w pelnym ekranie rozmiar canvasa zalezy takze od ekranu
        this.fullScreen.applyResolution();
        this.relayout();
    }
}
