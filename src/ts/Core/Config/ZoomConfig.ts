export class ZoomConfig
{
    static readonly DEFAULT: float = 1.0;
    /** Maksymalne przybliżenie: kafel zajmuje 4x swój rozmiar w pikselach */
    static readonly MAX: float = 8.0;
    /** Ile kafli maksymalnie mieści się w poziomie przy pełnym oddaleniu - limit liczby instancji */
    static readonly MAX_VISIBLE_TILES_X: uint = 200;
    /** Mnożnik na jedno kliknięcie scrolla; mnożenie daje progresywny zoom bez żadnych warunków */
    static readonly STEP: float = 1.12;
    /** Poniżej tylu pikselów na ekranie linia siatki przestaje mieć sens i znika */
    static readonly MIN_GRID_PX: float = 4.0;
}
