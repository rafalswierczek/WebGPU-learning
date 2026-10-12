export class UiConfig
{
    /**
     * Czcionka interfejsu. Plik lezy w assets/ i jest kopiowany do public/assets/ przy buildzie.
     * Verdana Bold jest PROPORCJONALNA - szerokosc znaku bierze sie z atlasu, a nie ze stalej.
     */
    static readonly FONT_FAMILY: string = 'Verdana Bold';
    static readonly FONT_FILE: string = 'assets/Verdana Bold.ttf';
    static readonly FONT_SIZE: uint = 14;
    /**
     * Dodatkowy odstep miedzy wierszami tekstu, w pikselach. Doliczany do wysokosci wiersza,
     * wiec rozsuwa KAZDY tekst w interfejsie - listy, menu, okno debugowe.
     */
    static readonly LINE_SPACING_PX: uint = 4;

    static readonly MENU_WIDTH: uint = 500;
    static readonly MENU_HEIGHT: uint = 600;
    static readonly PADDING: uint = 8;
    static readonly ROW_PADDING: uint = 6;
    /** Stała wysokość wiersza: rysowanie i trafianie myszą liczą się z tej samej liczby */
    static readonly ROW_HEIGHT: uint = 26;
    static readonly TITLE_HEIGHT: uint = 28;
    static readonly MENU_TITLE_HEIGHT: uint = 56;

    static readonly PANEL_COLOR: colorRgba = [0.05, 0.05, 0.07, 1.0];
    static readonly BORDER_COLOR: colorRgba = [0.35, 0.35, 0.42, 1.0];
    static readonly TEXT_COLOR: colorRgba = [1.0, 1.0, 1.0, 1.0];
    static readonly MUTED_TEXT_COLOR: colorRgba = [0.55, 0.55, 0.60, 1.0];
    static readonly ROW_HOVER_COLOR: colorRgba = [0.18, 0.22, 0.30, 1.0];
    static readonly ROW_SELECTED_COLOR: colorRgba = [0.14, 0.30, 0.45, 1.0];
    /** Naglowek sekcji w oknie - odrozniamy go kolorem, a nie krojem, bo atlas ma jeden krój */
    static readonly SECTION_COLOR: colorRgba = [0.55, 0.75, 1.0, 1.0];
    /** Odstep pod ostatnim wierszem sekcji */
    static readonly SECTION_SPACING_PX: uint = 8;
    static readonly INPUT_BACKGROUND_COLOR: colorRgba = [0.12, 0.12, 0.16, 1.0];
    static readonly INPUT_FOCUS_COLOR: colorRgba = [0.30, 0.55, 0.80, 1.0];
    static readonly CARET_COLOR: colorRgba = [1.0, 1.0, 1.0, 1.0];
    static readonly CARET_BLINK_MS: float = 530;
    static readonly BORDER_PX: uint = 1;

    /** Pasek menu na gorze canvasa */
    static readonly MENU_BAR_WIDTH: uint = 800;
    static readonly MENU_BAR_PADDING: uint = 5;
    static readonly MENU_BAR_ITEM_PADDING: uint = 10;

    /** Okna otwierane z paska menu */
    static readonly OPTIONS_WIDTH: uint = 500;
    static readonly OPTIONS_HEIGHT: uint = 500;
    static readonly BRUSH_WIDTH: uint = 500;
    static readonly BRUSH_HEIGHT: uint = 700;
    static readonly RESOLUTION_WIDTH: uint = 200;
    static readonly RESOLUTION_HEIGHT: uint = 300;

    /**
     * Lista tekstur w zakładce Brush.
     *
     * THUMBNAIL_PX to bok miniatury NA EKRANIE - tekstura w tablicy ma swój własny rozmiar
     * (TileTextureConfig.SIZE), a tutaj jest skalowana przez sampler, więc ta liczba
     * da się zmieniać dowolnie.
     */
    static readonly THUMBNAIL_PX: uint = 32;
    static readonly TREE_INDENT_PX: uint = 16;
    static readonly TREE_ROW_PADDING: uint = 4;
    static readonly TREE_OPEN: string = 'v';
    static readonly TREE_CLOSED: string = '>';

    /**
     * Bok JEDNEJ komorki podgladu pod oknem debugowym. Agregat pokazuje caly swoj wzor,
     * wiec zajmuje tyle komorek, ile ma kolumn i wierszy - posag 2x2 to kwadrat 2x2 komorek.
     */
    static readonly BRUSH_PREVIEW_PX: uint = 100;
    static readonly BRUSH_PREVIEW_MARGIN_LEFT: uint = 10;
    static readonly BRUSH_PREVIEW_MARGIN_TOP: uint = 8;

    /** Okno debugowe schodzi nizej, zeby nie zaslanial go pasek menu */
    static readonly DEBUG_MARGIN_TOP: uint = 108;
    static readonly DEBUG_MARGIN_LEFT: uint = 8;

    /** Komunikat o pauzie siedzi tuz pod paskiem menu */
    static readonly PAUSED_MARGIN_TOP: uint = 34;

    /** Ekrany menu: tlo canvasa i box menu */
    static readonly MENU_BACKGROUND_COLOR: GPUColor = { r: 0x61 / 255, g: 0x4B / 255, b: 0x18 / 255, a: 1.0 };
    static readonly MENU_BOX_COLOR: colorRgba = [0x33 / 255, 0x28 / 255, 0x0D / 255, 1.0];
    static readonly MAIN_MENU_WIDTH_PERCENT: float = 0.4;
    static readonly OPTIONS_WIDTH_PERCENT: float = 0.6;
    static readonly MENU_BOX_HEIGHT_PERCENT: float = 0.8;
    static readonly MENU_ROW_HEIGHT: uint = 48;
    /** Menu ma czcionke dwa razy wieksza niz edytor mapy */
    static readonly MENU_TEXT_SCALE: uint = 2;
    static readonly EDITOR_TEXT_SCALE: uint = 1;
    static readonly BACK_ARROW: string = '<-';
    static readonly BACK_ROW_MARGIN_BOTTOM: uint = 10;
    static readonly DIFFICULTY_NOTE: string = '(applies to New game only)';
    static readonly AUTOSAVE_WIDTH: uint = 200;
    static readonly AUTOSAVE_HEIGHT: uint = 160;
}
