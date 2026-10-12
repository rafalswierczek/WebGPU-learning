import { API } from './API';
import { AppState } from './AppState';
import { Brush } from './Textures/Brush';
import { BrushMenu } from './MapEditor/BrushMenu';
import { Camera } from './Camera';
import { Controller } from './Controller/Controller';
import { Database } from './Database';
import { DebugOverlay } from './Debug/DebugOverlay';
import { EditorState } from './MapEditor/EditorState';
import { EditorUi } from './MapEditor/EditorUi';
import { FullScreen } from './FullScreen';
import { GameMap } from './Map/GameMap';
import { InfoScreen } from './Screen/InfoScreen';
import { KeyboardFocus } from './Ui/KeyboardFocus';
import { MainMenuScreen } from './Screen/MainMenuScreen';
import { MapConfig } from './Map/MapConfig';
import { MapEditorController } from './Controller/MapEditorController';
import { MapEditorHandler } from './MapEditor/MapEditorHandler';
import { MapEditorScreen } from './Screen/MapEditorScreen';
import { MapGenerator } from './Map/MapGenerator';
import { MapRepository } from './Map/MapRepository';
import { ObjectRegistry } from './Map/ObjectRegistry';
import { TileRegistry } from './Map/TileRegistry';
import { OptionsScreen } from './Screen/OptionsScreen';
import { Pointer } from './Input/Pointer';
import { Renderer } from './Renderer';
import { ResourceLoader } from './ResourceLoader';
import { ScreenManager } from './Screen/ScreenManager';
import { ScreenName } from './Screen/Screen';
import { Settings } from './Settings/Settings';
import { SettingsRepository } from './Settings/SettingsRepository';
import { TileContextMenu } from './MapEditor/TileContextMenu';
import { TileTextureAtlas } from './MapEditor/TileTextureAtlas';
import { UiContext } from './Ui/UiContext';
import { WebGPU } from './WebGPU';

export class Application
{
    static async run(): Promise<void>
    {
        const webGPU: WebGPU = await WebGPU.init();
        const camera: Camera = Camera.getInstance(MapConfig.WORLD_TILES_X, MapConfig.WORLD_TILES_Y);
        const renderer: Renderer = new Renderer(webGPU, camera);

        const database: Database = Database.getInstance();
        await database.init();

        // rozdzielczość jest wspólna dla gry i edytora, więc wczytujemy ją przed pierwszą klatką
        const settingsRepository: SettingsRepository = new SettingsRepository(database);
        const settings: Settings = await settingsRepository.load();

        webGPU.canvas.resize(settings.getResolution().width, settings.getResolution().height);

        // jedna mapa na całą aplikację: tę samą instancję czyta gra i edytuje edytor
        const map: GameMap = new GameMap();
        const resourceLoader: ResourceLoader = await ResourceLoader.init(database);
        // rejestry startuja puste i rosna przy malowaniu (findOrAdd) albo wczytuja sie z bazy -
        // wpis powstaje dopiero wtedy, gdy jakas komorka naprawde go uzywa
        const tiles: TileRegistry = new TileRegistry();
        const objects: ObjectRegistry = new ObjectRegistry();

        const mapRepository: MapRepository = new MapRepository(database, tiles, objects);
        const mapGenerator: MapGenerator = new MapGenerator(tiles, resourceLoader.getLibrary().getTextureIds());

        const pointer: Pointer = new Pointer();
        const keyboardFocus: KeyboardFocus = new KeyboardFocus();
        const appState: AppState = new AppState();
        const editorState: EditorState = new EditorState();
        const firstBrush: Brush|null = resourceLoader.getLibrary().getFirstBrush();

        // edytor startuje z pierwszym pedzlem z biblioteki, zeby malowanie przed wyborem
        // z listy nie stawialo niewidocznych kafli
        if (firstBrush !== null) {
            editorState.setInitialBrush(firstBrush);
        }


        camera.setKeyboardFocus(keyboardFocus);

        const screens: ScreenManager = new ScreenManager(renderer);
        const ui: UiContext = await UiContext.create(webGPU.device, webGPU.canvasConfiguration.format);

        const contextMenu: TileContextMenu = new TileContextMenu(map, tiles, objects);
        const debugOverlay: DebugOverlay = new DebugOverlay(pointer, camera, editorState);
        const brushMenu: BrushMenu = new BrushMenu(editorState, tiles, objects, keyboardFocus);

        const fullScreen: FullScreen = new FullScreen(webGPU.canvas, keyboardFocus, settings);

        fullScreen.attach();

        const editorUi: EditorUi = new EditorUi(
            webGPU.canvas,
            camera,
            contextMenu,
            map,
            mapRepository,
            settings,
            settingsRepository,
            screens,
            fullScreen,
            editorState,
            resourceLoader.getLibrary(),
            debugOverlay,
            brushMenu,
        );

        // zmiana rozmiaru canvasa nie rusza tego, co widac - pole widzenia jest stale (ViewConfig) -
        // ale uklad UI jest w pikselach canvasa i musi sie przeliczyc
        fullScreen.setResizeHandler((): void => editorUi.relayout());

        const mapEditorController: MapEditorController = new MapEditorController(
            webGPU.canvas,
            camera,
            map,
            tiles,
            objects,
            resourceLoader.getLibrary(),
            mapRepository,
            mapGenerator,
            pointer,
            editorState,
            editorUi,
        );

        const mapEditorHandler: MapEditorHandler = await MapEditorHandler.create(
            webGPU,
            camera,
            map,
            tiles,
            objects,
            editorState,
            pointer,
            debugOverlay,
            TileTextureAtlas.create(webGPU.device, resourceLoader),
            editorUi,
            appState,
            ui,
        );

        const controller: Controller = new Controller(mapEditorController, camera, appState);

        screens.register(ScreenName.MAIN_MENU, new MainMenuScreen(webGPU.canvas, webGPU.context, ui, screens));
        screens.register(ScreenName.OPTIONS, new OptionsScreen(
            webGPU.canvas,
            webGPU.context,
            ui,
            screens,
            settings,
            settingsRepository,
            fullScreen,
        ));
        screens.register(ScreenName.INFO, new InfoScreen(webGPU.canvas, webGPU.context, ui, screens, mapRepository));
        screens.register(ScreenName.MAP_EDITOR, new MapEditorScreen(mapEditorHandler, controller, debugOverlay));

        renderer.displayCanvas();

        await mapEditorController.load();

        const api: API = new API(controller, mapEditorController, debugOverlay, screens);

        api.init();

        // pętla renderowania chodzi przez cały czas życia aplikacji, zmienia się tylko ekran
        renderer.start();
        screens.goTo(ScreenName.MAIN_MENU);

        // przegladarka wpuszcza w pelny ekran tylko po gescie uzytkownika, wiec czekamy na pierwszy
        fullScreen.requestOnFirstGesture();
    }
}
