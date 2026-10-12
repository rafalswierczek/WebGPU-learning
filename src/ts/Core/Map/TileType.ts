/**
 * Typ tile. Wpływa na to, co gra robi, gdy postać wejdzie na komórkę.
 * Edytor traktuje wszystkie typy tak samo - pozwala stawiać i kasować bez ograniczeń.
 */
export class TileType
{
    /** Zwykły tile, brak zachowania specjalnego */
    public static readonly DEFAULT: string = 'default';
    /** Schody: postać zmienia warstwę o 1 w górę lub w dół, w zakresie -8..8 */
    public static readonly STAIRS: string = 'stairs';
    /** Dziura w ziemi: wejście działa jak schody w dół (warstwa -1) */
    public static readonly HOLE_GROUND: string = 'hole-ground';
    /** Dziura w suficie: samo wejście nic nie robi, dopiero lina działa jak schody w górę (warstwa +1) */
    public static readonly HOLE_CEILING: string = 'hole-ceiling';

    public static readonly ALL: string[] = [
        TileType.DEFAULT,
        TileType.STAIRS,
        TileType.HOLE_GROUND,
        TileType.HOLE_CEILING,
    ];

    public static next(type: string): string
    {
        return TileType.ALL[(TileType.toIndex(type) + 1) % TileType.ALL.length];
    }

    /** Zapis binarny trzyma indeks, a nie tekst */
    public static toIndex(type: string): uint
    {
        return Math.max(0, TileType.ALL.indexOf(type));
    }

    public static fromIndex(index: uint): string
    {
        return TileType.ALL[index] ?? TileType.DEFAULT;
    }
}
