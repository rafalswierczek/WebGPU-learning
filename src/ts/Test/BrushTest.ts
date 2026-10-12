import { Brush } from "../Core/Textures/Brush";
import { BrushConfig, brushConfigJson } from "../Core/Textures/BrushConfigJson";
import { EditorState } from "../Core/MapEditor/EditorState";
import { Tile } from "../Core/Map/Tile";
import { TileRegistry } from "../Core/Map/TileRegistry";
import { TextureLibrary, brushEntry, textureRow } from "../Core/Textures/TextureLibrary";

/**
 * Pędzel jest teraz obiektem złożonym z wielu tekstur, a jego kształt bierze się z config.json.
 * Testujemy scalanie configu, budowę drzewa z samych ścieżek i regułę odcisku przy przeciąganiu.
 */
export class BrushTest
{
    private passed: uint = 0;
    private failed: uint = 0;

    public run(): boolean
    {
        this.configFallsBackToDefaults();
        this.configOverridesOnlyGivenKeys();
        this.gridMustMatchBrushSize();
        this.collisionListMarksOnlyListedTextures();
        this.treeIsRebuiltFromPaths();
        this.folderWithTexturesIsOneBrush();
        this.stampSkipsOverlappingPositions();
        this.onlySingleTileBrushResizes();
        this.firstConfigRowIsTheTopOfThePicture();
        this.aggregateKnowsItsMembers();
        this.registryKeepsOneEntryPerTexture();

        const ok: boolean = this.failed === 0;

        console.log(
            `%cBrush: ${this.passed} passed, ${this.failed} failed`,
            `color: ${ok ? 'green' : 'red'}; font-weight: bold;`
        );

        return ok;
    }

    private configFallsBackToDefaults(): void
    {
        const config: BrushConfig = BrushConfig.merge(null);

        this.assert('default brush is 1x1', config.getRows() === 1 && config.getColumns() === 1);
        this.assert('default has no collision', config.collidesAt(7) === false);
        this.assert('default type', config.type === 'default');
        this.assert('default speed factor', config.speedFactor === 1.0);
        this.assert('default has no texture grid', config.textures === null);
    }

    private configOverridesOnlyGivenKeys(): void
    {
        const config: BrushConfig = BrushConfig.merge({ speedFactor: 1.2 } as brushConfigJson);

        this.assert('speed factor is taken from the file', config.speedFactor === 1.2);
        this.assert('brush size stays default', config.getRows() === 1 && config.getColumns() === 1);
        this.assert('collision stays default', config.collidesAt(1) === false);
        this.assert('type stays default', config.type === 'default');
    }

    private gridMustMatchBrushSize(): void
    {
        const config: BrushConfig = BrushConfig.merge({
            brushSize: [2, 3],
            textures: [[1, 2, 3], [4, 5, 6]],
        } as brushConfigJson);

        const grid: uint[][] = config.toGrid('Test');

        this.assert('rows come first', grid.length === 2 && grid[0].length === 3);
        this.assert('grid keeps its order', grid[1][2] === 6);

        const broken: BrushConfig = BrushConfig.merge({
            brushSize: [2, 3],
            textures: [[1, 2], [3, 4]],
        } as brushConfigJson);

        this.assert('a mismatched grid is refused', this.throws((): void => {
            broken.toGrid('Test');
        }));
    }

    private collisionListMarksOnlyListedTextures(): void
    {
        const config: BrushConfig = BrushConfig.merge({
            brushSize: [2, 2],
            collision: [533, 534],
            textures: [[531, 532], [533, 534]],
        } as brushConfigJson);

        this.assert('listed texture collides', config.collidesAt(533));
        this.assert('unlisted texture does not', config.collidesAt(531) === false);

        const all: BrushConfig = BrushConfig.merge({ collision: true } as brushConfigJson);

        this.assert('boolean collision covers everything', all.collidesAt(999));
    }

    private treeIsRebuiltFromPaths(): void
    {
        const library: TextureLibrary = TextureLibrary.build([
            BrushTest.row('Buildings/6 roof red/601'),
            BrushTest.row('Buildings/6 roof red/602'),
            BrushTest.row('Grass/High/12'),
        ]);

        const buildings = library.getRoot().folders.find(f => f.name === 'Buildings');
        const roof = buildings?.folders.find(f => f.name === '6 roof red');

        this.assert('top level comes from the first path segment', library.getRoot().folders.length === 2);
        this.assert('nesting follows the separator', roof !== undefined);
        this.assert('every texture is its own brush', roof?.brushes.length === 2);
        this.assert('brush label is the texture id', roof?.brushes[0].label === '601');
        this.assert('path is kept for the tile menu', library.getPath(601) === 'Buildings/6 roof red/601');
        this.assert('deep nesting works', library.getRoot().folders
            .find(f => f.name === 'Grass')?.folders[0].brushes.length === 1);
    }

    private folderWithTexturesIsOneBrush(): void
    {
        const config: brushConfigJson = {
            brushSize: [2, 2],
            speedFactor: 1.2,
            collision: [533, 534],
            textures: [[531, 532], [533, 534]],
        };

        // w folderze leży też plik spoza listy - ma zostać zignorowany
        const library: TextureLibrary = TextureLibrary.build([
            BrushTest.row('Structures/10 statue/531', config),
            BrushTest.row('Structures/10 statue/532', config),
            BrushTest.row('Structures/10 statue/533', config),
            BrushTest.row('Structures/10 statue/534', config),
            BrushTest.row('Structures/10 statue/999', config),
        ]);

        const statue = library.getRoot().folders[0].folders[0];
        const entry: brushEntry = statue.brushes[0];

        this.assert('the whole folder is a single row', statue.brushes.length === 1);
        this.assert('the row is named after the folder', entry.label === '10 statue');
        this.assert('brush keeps its shape', entry.brush.getRows() === 2 && entry.brush.getColumns() === 2);
        this.assert('texture grid is addressable', entry.brush.getTextureAt(1, 0) === 533);
        this.assert('texture outside the config is ignored', entry.brush.getTextureAt(0, 0) === 531);
        this.assert('speed factor comes along', entry.brush.getSpeedFactor() === 1.2);
        this.assert('collision comes along', entry.brush.collidesAt(534) && !entry.brush.collidesAt(531));
    }

    private stampSkipsOverlappingPositions(): void
    {
        // pędzel 4 wiersze x 1 kolumna - „człowiek"
        const brush: Brush = new Brush(
            [[1], [2], [3], [4]],
            BrushConfig.merge({ brushSize: [4, 1], textures: [[1], [2], [3], [4]] } as brushConfigJson),
            'Test/human',
        );

        this.assert('one tile up still overlaps', brush.overlaps(10, 10, 10, 11));
        this.assert('three tiles up still overlaps', brush.overlaps(10, 10, 10, 13));
        this.assert('four tiles up is a new stamp', brush.overlaps(10, 10, 10, 14) === false);
        this.assert('one tile sideways is a new stamp', brush.overlaps(10, 10, 11, 10) === false);
    }

    private onlySingleTileBrushResizes(): void
    {
        const state: EditorState = new EditorState();

        state.setTileBrush(new Brush([[5]], BrushConfig.getDefault(), 'Test'));

        this.assert('single tile brush starts at 1x1', state.getBrushSize() === 1);
        this.assert('and grows', state.increaseBrush() && state.getBrushSize() === 2);
        this.assert('offset centers the brush', state.getBrushOffsetX() === 0);

        state.increaseBrush();
        this.assert('3x3 is centered on the cursor', state.getBrushOffsetX() === 1 && state.getBrushOffsetY() === 1);

        const composite: Brush = new Brush(
            [[1, 2], [3, 4]],
            BrushConfig.merge({ brushSize: [2, 2], textures: [[1, 2], [3, 4]] } as brushConfigJson),
            'Test/composite',
        );

        state.setTileBrush(composite);
        this.assert('composite brush refuses to grow', state.increaseBrush() === false);
        this.assert('composite brush keeps its shape', state.getBrush().getRows() === 2);

        state.decreaseBrush();
        this.assert('and refuses to shrink', state.getBrush().getRows() === 2);
    }

    /**
     * Wiersz 0 w config.json to GORA obrazka. Posag ma glowe w wierszu 0, a piedestal
     * z kolizja w wierszu 1 - i tak samo musi wygladac na mapie, gdzie os Y rosnie w gore.
     */
    private firstConfigRowIsTheTopOfThePicture(): void
    {
        const brush: Brush = new Brush(
            [[531, 532], [533, 534]],
            BrushConfig.merge({
                brushSize: [2, 2],
                collision: [533, 534],
                textures: [[531, 532], [533, 534]],
            } as brushConfigJson),
            'Structures/10 statue',
        );

        const rows: uint = brush.getRows();
        const originY: uint = 100;
        // odwzorowanie petli malowania: wiersz 0 ma wyladowac NAJWYZEJ
        const yOfTopRow: uint = originY + (rows - 1 - 0);
        const yOfBottomRow: uint = originY + (rows - 1 - 1);

        this.assert('config row 0 lands above row 1', yOfTopRow > yOfBottomRow);
        this.assert('head is in the top row', brush.getTextureAt(0, 0) === 531);
        this.assert('pedestal is in the bottom row', brush.getTextureAt(1, 0) === 533);
        this.assert('and it is the pedestal that collides',
            brush.collidesAt(533) && brush.collidesAt(534) && !brush.collidesAt(531));
    }

    /** Kasowanie agregatu liczy jego polozenie ze wzoru, wiec wzor musi byc adresowalny w obie strony */
    private aggregateKnowsItsMembers(): void
    {
        const config: brushConfigJson = {
            brushSize: [2, 2],
            collision: [533, 534],
            textures: [[531, 532], [533, 534]],
        };

        const library: TextureLibrary = TextureLibrary.build([
            BrushTest.row('Structures/10 statue/531', config),
            BrushTest.row('Structures/10 statue/532', config),
            BrushTest.row('Structures/10 statue/533', config),
            BrushTest.row('Structures/10 statue/534', config),
        ]);

        const brush: Brush|null = library.getAggregate('Structures/10 statue');

        this.assert('aggregate is reachable by its folder', brush !== null);
        this.assert('plain folder is not an aggregate', library.getAggregate('Structures') === null);
        this.assert('brush is marked as an aggregate', brush?.isAggregate() === true);

        const found = brush?.findTexture(534);

        this.assert('member position is found', found?.row === 1 && found?.column === 1);
        this.assert('foreign texture is not a member', brush?.findTexture(999) === null);
        this.assert('texture name is the tree path',
            brush?.getTextureName(533) === 'Structures/10 statue/533');
    }

    /**
     * Rejestr jest indeksowany identyfikatorem TEKSTURY, wiec w oknie kafla widac ten sam numer,
     * co w drzewie. Powtorne malowanie nie moze nadpisac recznej zmiany wlasciwosci.
     */
    private registryKeepsOneEntryPerTexture(): void
    {
        const registry: TileRegistry = new TileRegistry();
        const tile: Tile = registry.ensure(533, 'Structures/10 statue/533', true, true, 'default', 1.2);

        this.assert('entry is keyed by texture id', registry.get(533) === tile);
        this.assert('there is no entry under a made up id', registry.get(0) === null);
        this.assert('name comes along', tile.name === 'Structures/10 statue/533');
        this.assert('aggregate flag comes along', tile.isAggregate);
        this.assert('aggregate path is the folder', tile.getAggregatePath() === 'Structures/10 statue');

        tile.setSpeedFactor(3.0);
        registry.ensure(533, 'Structures/10 statue/533', true, true, 'default', 1.2);

        this.assert('painting again keeps the edited value', registry.get(533)?.speedFactor === 3.0);
        this.assert('and adds no second entry', registry.getCount() === 1);

        const decoded: TileRegistry = new TileRegistry();

        decoded.decode(registry.encode());

        this.assert('name survives the round trip', decoded.get(533)?.name === 'Structures/10 statue/533');
        this.assert('aggregate flag survives', decoded.get(533)?.isAggregate === true);
        this.assert('collision survives', decoded.get(533)?.collision === true);
        this.assert('speed factor survives', decoded.get(533)?.speedFactor === 3.0);
        this.assert('index stays the texture id', decoded.get(533)?.textureId === 533);
    }

    private static row(path: string, config: brushConfigJson|null = null): textureRow
    {
        return { path: path, texture: null as unknown as Blob, config: config };
    }

    private throws(action: () => void): boolean
    {
        try {
            action();
        } catch (error) {
            return true;
        }

        return false;
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
