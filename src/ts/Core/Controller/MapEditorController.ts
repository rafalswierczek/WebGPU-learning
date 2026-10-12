import JSZip from "jszip";
import { Camera } from "../Camera";
import { Chunk } from "../Map/Chunk";
import { MapObject } from "../Map/MapObject";
import { Tile } from "../Map/Tile";
import { ChunkCodec } from "../Map/ChunkCodec";
import { Brush } from "../Textures/Brush";
import { Cell } from "../Map/Cell";
import { GameMap } from "../Map/GameMap";
import { MapConfig } from "../Map/MapConfig";
import { MapGenerator } from "../Map/MapGenerator";
import { EditorState } from "../MapEditor/EditorState";
import { MapRepository } from "../Map/MapRepository";
import { ObjectRegistry } from "../Map/ObjectRegistry";
import { TextureLibrary } from "../Textures/TextureLibrary";
import { TileRegistry } from "../Map/TileRegistry";
import { Pointer } from "../Input/Pointer";
import { Canvas } from "../Canvas/Canvas";
import { EditorUi } from "../MapEditor/EditorUi";

export class MapEditorController
{
    private readonly canvasWrapper: Canvas;
    private readonly canvas: HTMLCanvasElement;
    private readonly camera: Camera;
    private readonly map: GameMap;
    private readonly tiles: TileRegistry;
    private readonly objects: ObjectRegistry;
    private readonly library: TextureLibrary;
    private readonly mapRepository: MapRepository;
    private readonly mapGenerator: MapGenerator;

    private readonly pointer: Pointer;
    private readonly downHandlerRef: (event: MouseEvent) => void;
    private readonly moveHandlerRef: (event: MouseEvent) => void;
    private readonly upHandlerRef: () => void;
    private readonly leaveHandlerRef: () => void;
    private readonly contextMenuHandlerRef: (event: MouseEvent) => void;
    private readonly wheelHandlerRef: (event: WheelEvent) => void;
    private readonly keyDownHandlerRef: (event: KeyboardEvent) => void;

    private readonly editorState: EditorState;
    private readonly editorUi: EditorUi;
    /**
     * Rodzaj trwającego pociągnięcia myszą. LPM dokłada, CTRL+PPM zdejmuje - oba działają
     * tak samo: całym pędzlem i przy przeciąganiu.
     */
    private stroke: strokeMode = 'none';
    /** Komórki dotknięte bieżącym pociągnięciem - bez tego przeciąganie budowałoby stos w kółko */
    private readonly paintedCells: Set<string> = new Set<string>();
    /**
     * Miejsce ostatniego odcisku pędzla złożonego; -1 znaczy „jeszcze żadnego w tym pociągnięciu".
     * Pędzel złożony stawia kolejny odcisk dopiero po wyjściu poza poprzedni.
     */
    private lastStampX: int = -1;
    private lastStampY: int = -1;
    private listening: boolean = false;

    public constructor(
        canvasWrapper: Canvas,
        camera: Camera,
        map: GameMap,
        tiles: TileRegistry,
        objects: ObjectRegistry,
        library: TextureLibrary,
        mapRepository: MapRepository,
        mapGenerator: MapGenerator,
        pointer: Pointer,
        editorState: EditorState,
        editorUi: EditorUi,
    ) {
        this.canvasWrapper = canvasWrapper;
        this.canvas = canvasWrapper.getCanvasElement();
        this.camera = camera;
        this.map = map;
        this.tiles = tiles;
        this.objects = objects;
        this.library = library;
        this.mapRepository = mapRepository;
        this.mapGenerator = mapGenerator;
        this.pointer = pointer;
        this.editorState = editorState;
        this.editorUi = editorUi;
        this.downHandlerRef = this.downHandler.bind(this);
        this.moveHandlerRef = this.moveHandler.bind(this);
        this.upHandlerRef = (): void => this.stopStroke();
        this.leaveHandlerRef = (): void => {
            this.stopStroke();
            this.pointer.leave();
        };
        this.contextMenuHandlerRef = (event: MouseEvent): void => event.preventDefault();
        this.wheelHandlerRef = this.wheelHandler.bind(this);
        this.keyDownHandlerRef = this.keyDownHandler.bind(this);
    }

    public isListening(): boolean
    {
        return this.listening;
    }

    public start(): void
    {
        if (this.listening) {
            return;
        }

        this.canvas.addEventListener('mousedown', this.downHandlerRef);
        this.canvas.addEventListener('mousemove', this.moveHandlerRef);
        this.canvas.addEventListener('mouseup', this.upHandlerRef);
        this.canvas.addEventListener('mouseleave', this.leaveHandlerRef);
        this.canvas.addEventListener('contextmenu', this.contextMenuHandlerRef);
        this.canvas.addEventListener('wheel', this.wheelHandlerRef, { passive: false });
        document.addEventListener('keydown', this.keyDownHandlerRef);
        this.listening = true;
    }

    public stop(): void
    {
        if (!this.listening) {
            return;
        }

        this.stopStroke();
        this.editorUi.closeAll();
        this.canvasWrapper.setCursorVisible(true);

        this.canvas.removeEventListener('mousedown', this.downHandlerRef);
        this.canvas.removeEventListener('mousemove', this.moveHandlerRef);
        this.canvas.removeEventListener('mouseup', this.upHandlerRef);
        this.canvas.removeEventListener('mouseleave', this.leaveHandlerRef);
        this.canvas.removeEventListener('contextmenu', this.contextMenuHandlerRef);
        this.canvas.removeEventListener('wheel', this.wheelHandlerRef);
        document.removeEventListener('keydown', this.keyDownHandlerRef);
        this.listening = false;
    }

    /** Wczytuje mapę z bazy do tej samej instancji GameMap, której używa reszta aplikacji. */
    public async load(): Promise<uint>
    {
        const count: uint = await this.mapRepository.loadInto(this.map);

        console.log(`%cMap loaded: ${count} chunks`, 'color: green;');

        return count;
    }

    /** Zapisuje wyłącznie chunki zmienione od ostatniego zapisu. */
    public async save(): Promise<uint>
    {
        const count: uint = await this.mapRepository.saveDirty(this.map);

        console.log(`%cMap saved: ${count} chunks`, 'color: green;');

        return count;
    }

    /** Generuje mapę testową i od razu ją zapisuje. Nadpisuje to, co jest w bazie. */
    public async generateTestMap(chunksX: uint = 3, chunksY: uint = 3): Promise<void>
    {
        this.map.clear();
        await this.mapRepository.clear();

        this.mapGenerator.generateTestMap(this.map, chunksX, chunksY);

        const count: uint = await this.mapRepository.saveAll(this.map);

        console.log(`%cTest map generated and saved: ${count} chunks`, 'color: green;');
    }


    public getInfo(): object
    {
        const stats = this.map.getStats();

        return {
            chunks: stats.chunks,
            allocatedLayers: stats.allocatedLayers,
            unsavedChunks: stats.unsavedChunks,
            ramMB: Math.round(stats.ramBytes / 1024 / 1024 * 100) / 100,
            activeLayer: this.editorState.getActiveLayer(),
            brushSize: this.editorState.getBrushSize(),
            pointerTile: this.pointer.isInside() ? { tileX: this.pointer.getTileX(), tileY: this.pointer.getTileY() } : null,
            camera: { x: this.camera.getX(), y: this.camera.getY() },
        };
    }

    /** Eksport całej mapy do zipa - format dystrybucji, jeden plik VTMP na chunk. */
    public async download(): Promise<void>
    {
        if (this.map.getChunkCount() === 0) {
            console.error('Cannot download map. Map is empty.');

            return;
        }

        const zip: JSZip = new JSZip();

        for (const chunk of this.map.getChunks()) {
            chunk.compact();

            if (chunk.isEmpty()) {
                continue;
            }

            zip.file(`${chunk.coords.cx}x${chunk.coords.cy}_chunk.vitamap`, ChunkCodec.encode(chunk));
        }

        const mapBlob: Blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const url: string = URL.createObjectURL(mapBlob);
        const link: HTMLAnchorElement = document.createElement('a');

        link.href = url;
        link.download = `vita_map.zip`;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /** Import zipa do prawdziwej mapy i do bazy. */
    public async importZip(blob: Blob): Promise<uint>
    {
        const zip: JSZip = await JSZip.loadAsync(blob);

        this.map.clear();
        await this.mapRepository.clear();

        const files = Object.values(zip.files).filter(file => !file.dir);

        for (const file of files) {
            const chunk: Chunk = ChunkCodec.decode(await file.async('arraybuffer'));

            this.map.putChunk(chunk);
        }

        const count: uint = await this.mapRepository.saveAll(this.map);

        console.log(`%cMap imported: ${count} chunks`, 'color: green;');

        return count;
    }

    /**
     * Malowanie jest z definicji interaktywne, więc żyje przy zdarzeniach myszy, a nie w API konsoli.
     * LPM stawia kafel pędzla, PPM go kasuje, przeciąganie maluje ciągiem.
     */
    private downHandler(event: MouseEvent): void
    {
        this.updatePointer(event);

        if (event.button === 2) {
            if (event.ctrlKey) {
                // nad interfejsem nie kasujemy, tak samo jak nie malujemy
                if (!this.editorUi.isOverUi(this.pointer.getCanvasX(), this.pointer.getCanvasY())) {
                    this.startStroke('erase');
                }
            } else {
                this.editorUi.toggleTileMenu(
                    this.pointer.getCanvasX(),
                    this.pointer.getCanvasY(),
                    { tileX: this.pointer.getTileX(), tileY: this.pointer.getTileY() },
                    this.editorState.getActiveLayer(),
                );
            }

            return;
        }

        if (event.button !== 0) {
            return;
        }

        // interfejs ma pierwszenstwo: klikniecie w pasek albo okno nie moze malowac mapy
        if (this.editorUi.handleClick(this.pointer.getCanvasX(), this.pointer.getCanvasY())) {
            return;
        }

        this.startStroke('paint');
    }

    private startStroke(mode: strokeMode): void
    {
        this.stroke = mode;
        this.paintedCells.clear();
        this.lastStampX = -1;
        this.lastStampY = -1;
        this.applyStroke();
    }

    /** Scroll = zoom. Cała matematyka siedzi w kamerze, tu jest tylko zdarzenie. */
    private wheelHandler(event: WheelEvent): void
    {
        event.preventDefault();

        this.updatePointer(event);

        // interfejs ma pierwszenstwo: przewijanie listy tekstur nie moze zmieniac zoomu
        if (this.editorUi.handleWheel(this.pointer.getCanvasX(), this.pointer.getCanvasY(), event.deltaY)) {
            return;
        }

        // deltaY bywa w pikselach albo w liniach i potrafi być ogromne przy gładkim scrollu -
        // obcinamy do jednego kliknięcia na zdarzenie, żeby zoom nie przeskakiwał
        const notches: float = event.deltaY > 0 ? -1 : 1;

        this.camera.zoomAt(
            notches,
            this.pointer.getCanvasX(),
            this.pointer.getCanvasY(),
            this.canvas.width,
            this.canvas.height,
        );

    }

    private moveHandler(event: MouseEvent): void
    {
        this.updatePointer(event);

        this.editorUi.onPointerMove(this.pointer.getCanvasX(), this.pointer.getCanvasY());

        if (this.editorUi.isOverUi(this.pointer.getCanvasX(), this.pointer.getCanvasY())) {
            return; // nad interfejsem nie malujemy
        }

        if (this.stroke !== 'none') {
            this.applyStroke();
        }
    }

    private stopStroke(): void
    {
        this.stroke = 'none';
        this.paintedCells.clear();
        this.lastStampX = -1;
        this.lastStampY = -1;
    }

    /**
     * Strzałki góra/dół przechodzą między warstwami. To jest narzędzie EDYTORA -
     * w grze warstwę zmienia wejście postaci na kafel z kategorią "stairs", a nie klawiatura.
     *
     * 1-9 wybiera pędzel; to proteza, dopóki nie ma palety kafli.
     */
    private keyDownHandler(event: KeyboardEvent): void
    {
        // interfejs i jego pole tekstowe maja pierwszenstwo przed skrotami edytora
        if (this.editorUi.handleKey(event)) {
            return;
        }

        if (event.ctrlKey || event.altKey) {
            return;
        }

        if (event.code === 'NumpadAdd') {
            this.editorState.increaseBrush();

            return;
        }

        if (event.code === 'NumpadSubtract') {
            this.editorState.decreaseBrush();

            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.changeLayer(1);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.changeLayer(-1);
        }
    }

    private changeLayer(step: int): void
    {
        const layer: int = this.editorState.getActiveLayer() + step;

        if (layer < MapConfig.LAYER_MIN || layer > MapConfig.LAYER_MAX) {
            return;
        }

        this.editorState.setActiveLayer(layer);
    }

    /**
     * Wykonuje bieżące pociągnięcie odciskiem pędzla wokół kafla pod kursorem.
     *
     * Pędzel działa we współrzędnych świata, a nie ekranu, więc przy krawędzi widoku spokojnie
     * sięga też po kafle poza nim - obcinamy tylko do granic świata.
     */
    private applyStroke(): void
    {
        if (!this.pointer.isInside() || this.stroke === 'none') {
            return;
        }

        const brush: Brush = this.editorState.getBrush();
        const originX: int = this.pointer.getTileX() - this.editorState.getBrushOffsetX();
        const originY: int = this.pointer.getTileY() - this.editorState.getBrushOffsetY();

        if (!this.canStamp(brush, originX, originY)) {
            return;
        }

        const layer: int = this.editorState.getActiveLayer();

        // Agregat jest jednym obiektem, wiec albo wchodzi w calosci, albo wcale - inaczej
        // jedna zajeta komorka zostawilaby posag bez piedestalu. Pedzel prosty maluje tam,
        // gdzie moze, i pomija komorki zablokowane przez obiekty.
        if (brush.isAggregate() && !this.canStampAggregate(brush, layer, originX, originY)) {
            return;
        }

        for (let row: uint = 0; row < brush.getRows(); row++) {
            for (let column: uint = 0; column < brush.getColumns(); column++) {
                // wiersz 0 wzoru to GORA obrazka, a os Y swiata rosnie w gore - stad odwrocenie
                const tileY: int = originY + (brush.getRows() - 1 - row);

                this.applyToCell(brush, layer, originX + column, tileY, row, column);
            }
        }
    }

    /**
     * Pędzel złożony to jeden logiczny obiekt (posąg, dach), więc przeciąganie stawia kolejny
     * odcisk dopiero wtedy, gdy nowy prostokąt nie nachodzi na poprzedni - inaczej ciągnięcie
     * w górę o jeden kafel dałoby posąg z wydłużonym tułowiem.
     *
     * Pędzel 1x1 maluje po staremu, ciągiem: przed powtórnym dotknięciem tej samej komórki
     * broni już zbiór paintedCells.
     */
    private canStamp(brush: Brush, originX: int, originY: int): boolean
    {
        if (brush.isResizable()) {
            return true;
        }

        if (this.lastStampX !== -1 && brush.overlaps(originX, originY, this.lastStampX, this.lastStampY)) {
            return false;
        }

        this.lastStampX = originX;
        this.lastStampY = originY;

        return true;
    }

    private applyToCell(brush: Brush, layer: int, tileX: int, tileY: int, row: uint, column: uint): void
    {
        if (!MapEditorController.isInsideWorld(tileX, tileY)) {
            return;
        }

        const key: string = GameMap.cellKey(layer, tileX, tileY);

        if (this.paintedCells.has(key)) {
            return; // jedno pociagniecie dotyka komorki najwyzej raz
        }

        this.paintedCells.add(key);

        if (this.stroke === 'erase') {
            this.eraseAt(layer, tileX, tileY);

            return;
        }

        const textureId: uint = brush.getTextureAt(row, column);

        // pedzel wskazuje teksture i wlasciwosci; wpis rejestru zakladany jest dopiero tutaj
        if (this.editorState.placesObject()) {
            this.pushObject(brush, layer, tileX, tileY, textureId);

            return;
        }

        if (!this.canPlaceTile(layer, tileX, tileY)) {
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

        this.map.pushTile(layer, tileX, tileY, textureId);
    }

    /**
     * Kafla nie maluje sie na obiektach - BEZ WYJATKOW.
     *
     * Obiekt lezy nad kaflami, wiec kafel i tak by go nie zaslonil, a stos przestalby opisywac
     * to, co widac. Wczesniejszy wyjatek dla agregatow bez kolizji dawal zachowanie, ktorego
     * nie dalo sie przewidziec z ekranu: ten sam pedzel raz wchodzil, raz nie, zaleznie od tego,
     * ktora jego tekstura trafila na obiekt.
     */
    private canPlaceTile(layer: int, tileX: int, tileY: int): boolean
    {
        return (this.map.getCell(layer, tileX, tileY)?.getObjectStack() ?? []).length === 0;
    }

    /** Czy caly odcisk agregatu ma gdzie stanac */
    private canStampAggregate(brush: Brush, layer: int, originX: int, originY: int): boolean
    {
        for (let row: uint = 0; row < brush.getRows(); row++) {
            for (let column: uint = 0; column < brush.getColumns(); column++) {
                const tileX: int = originX + column;
                const tileY: int = originY + (brush.getRows() - 1 - row);

                if (!MapEditorController.isInsideWorld(tileX, tileY)) {
                    continue;
                }

                if (!this.canPlaceTile(layer, tileX, tileY)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Obiekt trafia na komorke tylko wtedy, gdy CALY stos na to pozwala.
     *
     * Wystarczy jeden obiekt z canStack = false gdziekolwiek w stosie, zeby nie dalo sie na nim
     * nic polozyc - nie tylko ten na wierzchu. Dokladany obiekt tez musi byc stackowalny,
     * inaczej canStack = false nie znaczyloby nic przy pierwszym dokladaniu.
     */
    private pushObject(brush: Brush, layer: int, tileX: int, tileY: int, textureId: uint): void
    {
        const object: MapObject = this.objects.ensure(
            textureId,
            brush.getTextureName(textureId),
            brush.collidesAt(textureId),
            brush.getType(),
        );

        const stack: uint[] = this.map.getCell(layer, tileX, tileY)?.getObjectStack() ?? [];

        if (stack.length > 0 && !this.isStackable(object, stack)) {
            return;
        }

        this.map.pushObject(layer, tileX, tileY, textureId);
    }

    private isStackable(object: MapObject, stack: uint[]): boolean
    {
        return object.canStack
            && stack.every((id: uint): boolean => this.objects.get(id)?.canStack === true);
    }

    /**
     * Zdejmuje z wierzchu komorki. Kafel bedacy czescia agregatu (posag, dach) znika RAZEM
     * z calym agregatem - usuniecie jednej komorki zostawiloby posag bez piedestalu.
     */
    private eraseAt(layer: int, tileX: int, tileY: int): void
    {
        const cell: Cell|null = this.map.getCell(layer, tileX, tileY);

        if (cell === null) {
            return;
        }

        // obiekty leza nad kaflami, wiec dopoki jakis jest, to on schodzi pierwszy
        if (cell.getObjectStack().length > 0) {
            this.map.popTop(layer, tileX, tileY);

            return;
        }

        const tile: Tile|null = this.tiles.get(cell.getTopTileId());

        if (tile === null || !tile.isAggregate) {
            this.map.popTop(layer, tileX, tileY);

            return;
        }

        this.eraseAggregate(layer, tileX, tileY, tile);
    }

    /**
     * Kasuje wszystkie kafle agregatu, liczac jego polozenie ze wzoru pedzla.
     *
     * Wzor jest znany (folder tekstury to tozsamosc agregatu), a klikinieta tekstura da sie w nim
     * odnalezc - stad wiadomo, gdzie lezy reszta. Zdejmujemy tylko te komorki, ktore naprawde maja
     * na wierzchu kafel tego samego agregatu, wiec czesciowo zamalowany posag nie zabierze sasiadow.
     */
    private eraseAggregate(layer: int, tileX: int, tileY: int, tile: Tile): void
    {
        const path: string = tile.getAggregatePath();
        const brush: Brush|null = this.library.getAggregate(path);
        const position: { row: uint, column: uint }|null = brush?.findTexture(tile.textureId) ?? null;

        if (brush === null || position === null) {
            this.map.popTop(layer, tileX, tileY); // agregat bez wzoru - kasujemy pojedynczo

            return;
        }

        const originX: int = tileX - position.column;
        const originY: int = tileY - (brush.getRows() - 1 - position.row);

        for (let row: uint = 0; row < brush.getRows(); row++) {
            for (let column: uint = 0; column < brush.getColumns(); column++) {
                const cellX: int = originX + column;
                const cellY: int = originY + (brush.getRows() - 1 - row);

                if (!MapEditorController.isInsideWorld(cellX, cellY)) {
                    continue;
                }

                const top: Tile|null = this.tiles.get(
                    this.map.getCell(layer, cellX, cellY)?.getTopTileId() ?? -1
                );

                if (top !== null && top.getAggregatePath() === path) {
                    this.map.popTop(layer, cellX, cellY);
                }
            }
        }
    }

    private static isInsideWorld(tileX: int, tileY: int): boolean
    {
        return tileX >= 0 && tileY >= 0
            && tileX < MapConfig.WORLD_TILES_X && tileY < MapConfig.WORLD_TILES_Y;
    }

    private updatePointer(event: MouseEvent): void
    {
        const coords: coordsCanvas|null = this.canvasWrapper.getEventCoords(event);

        if (coords === null) {
            return;
        }

        // ten sam przelicznik, ktorym renderer rysuje kafle - inaczej kursor celowalby obok
        const perPixelX: float = 1 / this.camera.getPixelsPerWorldX(this.canvas.width);
        const perPixelY: float = 1 / this.camera.getPixelsPerWorldY(this.canvas.height);

        this.pointer.update(
            coords.canvasX,
            coords.canvasY,
            Math.floor(this.camera.getX() + coords.canvasX * perPixelX),
            Math.floor(this.camera.getY() + (this.canvas.height - coords.canvasY) * perPixelY),
        );
    }
}
