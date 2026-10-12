/** Typ obiektu leżącego na komórce */
export class ObjectType
{
    public static readonly DEFAULT: string = 'default';
    public static readonly CHEST: string = 'chest';
    public static readonly LIGHT: string = 'light';
    public static readonly LEVER: string = 'lever';
    public static readonly BUTTON: string = 'button';

    public static readonly ALL: string[] = [
        ObjectType.DEFAULT,
        ObjectType.CHEST,
        ObjectType.LIGHT,
        ObjectType.LEVER,
        ObjectType.BUTTON,
    ];

    public static next(type: string): string
    {
        return ObjectType.ALL[(ObjectType.toIndex(type) + 1) % ObjectType.ALL.length];
    }

    /** Zapis binarny trzyma indeks, a nie tekst */
    public static toIndex(type: string): uint
    {
        return Math.max(0, ObjectType.ALL.indexOf(type));
    }

    public static fromIndex(index: uint): string
    {
        return ObjectType.ALL[index] ?? ObjectType.DEFAULT;
    }
}
