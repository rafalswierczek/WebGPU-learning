import { MapObject } from "./MapObject";
import { ObjectRegistry } from "./ObjectRegistry";
import { Tile } from "./Tile";
import { TileRegistry } from "./TileRegistry";
import { TileType } from "./TileType";

/**
 * Konkretna komórka mapy - źródło prawdy o tym, co na niej stoi.
 *
 * Ma dokładnie dwie rzeczy: stos tile i stos obiektów. Oba trzymają wyłącznie IDENTYFIKATORY;
 * właściwości leżą w rejestrach, bo powtarzanie ich przy każdym z 10^8 wystąpień byłoby stratą.
 *
 * Cały stos obiektów leży NAD całym stosem tile, więc pierwszy obiekt od dołu jest wyżej niż
 * ostatni tile. Dzięki temu tekstury obiektów nigdy nie przemieszają się z tile.
 *
 * Zasady wyliczania właściwości komórki (spisane w analizie 05):
 * - kolizja: wystarczy JEDEN element z kolizją w którymkolwiek stosie
 * - speedFactor: wyłącznie z ostatniego elementu stosu tile
 * - type: z ostatniego obiektu, a gdy obiektów nie ma - z ostatniego tile
 */
export class Cell
{
    private readonly tileStack: uint[] = [];
    private readonly objectStack: uint[] = [];

    public getTileStack(): uint[]
    {
        return this.tileStack;
    }

    public getObjectStack(): uint[]
    {
        return this.objectStack;
    }

    public isEmpty(): boolean
    {
        return this.tileStack.length === 0 && this.objectStack.length === 0;
    }

    public pushTile(tileId: uint): void
    {
        this.tileStack.push(tileId);
    }

    public pushObject(objectId: uint): void
    {
        this.objectStack.push(objectId);
    }

    /** Zdejmuje z wierzchu: najpierw obiekty, bo leżą nad stosem tile */
    public popTop(): boolean
    {
        if (this.objectStack.length > 0) {
            this.objectStack.pop();

            return true;
        }

        if (this.tileStack.length > 0) {
            this.tileStack.pop();

            return true;
        }

        return false;
    }

    public getTopTileId(): int
    {
        return this.tileStack.length === 0 ? -1 : this.tileStack[this.tileStack.length - 1];
    }

    public getTopObjectId(): int
    {
        return this.objectStack.length === 0 ? -1 : this.objectStack[this.objectStack.length - 1];
    }

    /**
     * Wystarczy jeden element z kolizją w którymkolwiek stosie, żeby komórka była nieprzechodnia.
     * Komórka jest przechodnia dopiero wtedy, gdy żaden element obu stosów nie ma kolizji.
     */
    public hasCollision(tiles: TileRegistry, objects: ObjectRegistry): boolean
    {
        return this.tileStack.some((tileId: uint): boolean => tiles.get(tileId)?.collision === true)
            || this.objectStack.some((objectId: uint): boolean => objects.get(objectId)?.collision === true);
    }

    /** Liczy się wyłącznie stos tile - po obiektach się nie chodzi, chodzi się po ziemi */
    public getSpeedFactor(tiles: TileRegistry): float
    {
        return tiles.get(this.getTopTileId())?.speedFactor ?? Tile.DEFAULT_SPEED_FACTOR;
    }

    /** Obiekty mają pierwszeństwo, bo leżą wyżej; bez nich decyduje ostatni tile */
    public getType(tiles: TileRegistry, objects: ObjectRegistry): string
    {
        const object: MapObject|null = objects.get(this.getTopObjectId());

        if (object !== null) {
            return object.type;
        }

        return tiles.get(this.getTopTileId())?.type ?? TileType.DEFAULT;
    }

    /** Tekstura widoczna na wierzchu komórki albo -1, gdy komórka jest pusta */
    public getTopTextureId(tiles: TileRegistry, objects: ObjectRegistry): int
    {
        const object: MapObject|null = objects.get(this.getTopObjectId());

        if (object !== null) {
            return object.textureId;
        }

        return tiles.get(this.getTopTileId())?.textureId ?? -1;
    }

    /**
     * Komórka w stanie domyślnym poza jednym tile - da się ją zapisać w gęstej tablicy
     * jako sam identyfikator tego tile. Pusty stos obiektów i wszystko, co dojdzie w przyszłości,
     * jest wtedy dorozumiane.
     */
    public isSimple(): boolean
    {
        return this.objectStack.length === 0 && this.tileStack.length === 1;
    }
}
