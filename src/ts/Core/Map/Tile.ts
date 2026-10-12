import { TileType } from "./TileType";

/**
 * Tile jako koncept: jeden wpis w rejestrze na jedną teksturę.
 *
 * Właściwości leżą tutaj, a nie w komórce, bo przy 10^8 komórkach powtarzanie ich
 * przy każdym wystąpieniu byłoby czystą stratą pamięci. Zmiana tutaj widoczna jest
 * w każdej komórce z tą teksturą - i o to chodzi.
 */
export class Tile
{
    public static readonly DEFAULT_SPEED_FACTOR: float = 1.0;
    public static readonly MIN_SPEED_FACTOR: float = 0.1;
    public static readonly MAX_SPEED_FACTOR: float = 10.0;

    public readonly textureId: uint;

    /**
     * Ścieżka w drzewie tekstur, np. "Structures/10 statue/533".
     *
     * Nazwa należy do tile, a nie do warstwy prezentacji, bo mapa ma być czytelna bez biblioteki
     * tekstur: zapisany rejestr mówi wprost, czym jest każdy kafel. Folder tej ścieżki jest też
     * tożsamością agregatu - po nim poznajemy, że dwa kafle to ten sam posąg.
     */
    public name: string = '';

    /** Kolizja z czymkolwiek i kimkolwiek: w GRZE nie da się tu wejść ani nic położyć */
    public collision: boolean = false;
    /** 1.5 = postać przechodzi o 50% szybciej */
    public speedFactor: float = Tile.DEFAULT_SPEED_FACTOR;
    public type: string = TileType.DEFAULT;

    /**
     * Czy ten kafel jest częścią agregatu, czyli obiektu złożonego z wielu tekstur (posąg, dach).
     *
     * Prawda wtedy, gdy identyfikator tekstury występuje w kluczu "textures" pliku config.json
     * jego folderu. Agregat trzeba kasować w całości - usunięcie jednego kafla zostawiłoby
     * posąg bez piedestału.
     *
     * Agregaty dotyczą WYŁĄCZNIE kafli; obiekty są zawsze 1x1.
     */
    public isAggregate: boolean = false;

    public constructor(textureId: uint)
    {
        this.textureId = textureId;
    }

    public setSpeedFactor(value: float): void
    {
        if (Number.isNaN(value)) {
            return;
        }

        this.speedFactor = Math.min(Tile.MAX_SPEED_FACTOR, Math.max(Tile.MIN_SPEED_FACTOR, value));
    }

    /** Folder, w którym leży tekstura - tożsamość agregatu, do którego kafel należy */
    public getAggregatePath(): string
    {
        const separator: int = this.name.lastIndexOf('/');

        return separator === -1 ? '' : this.name.slice(0, separator);
    }

    public hasDefaults(): boolean
    {
        return this.collision === false
            && this.speedFactor === Tile.DEFAULT_SPEED_FACTOR
            && this.type === TileType.DEFAULT;
    }
}
