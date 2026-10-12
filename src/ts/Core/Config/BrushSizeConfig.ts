export class BrushSizeConfig
{
    /**
     * Dozwolone boki pędzla, rosnąco.
     *
     * Dotyczą WYŁĄCZNIE pędzla 1x1, czyli pojedynczej tekstury malowanej kwadratem NxN.
     * Pędzel złożony (posąg, dach) ma rozmiar zapisany w swoim config.json i nie da się go
     * rozciągnąć - wyszedłby posąg z czterema tułowiami.
     *
     * Nie ma tu żadnej walidacji przybliżenia: pędzel 30x30 wolno wybrać także z bliska.
     * Poprzednie progi zoomu nie broniły przed niczym realnym, a blokowały największe pędzle
     * tam, gdzie były potrzebne.
     */
    public static readonly SIZES: uint[] = [1, 2, 3, 5, 8, 15, 30];
    public static readonly DEFAULT_SIZE: uint = 1;

    public static getNextSize(size: uint): uint
    {
        const index: int = BrushSizeConfig.SIZES.indexOf(size);

        return BrushSizeConfig.SIZES[Math.min(index + 1, BrushSizeConfig.SIZES.length - 1)];
    }

    public static getPreviousSize(size: uint): uint
    {
        const index: int = BrushSizeConfig.SIZES.indexOf(size);

        return BrushSizeConfig.SIZES[Math.max(index - 1, 0)];
    }
}
