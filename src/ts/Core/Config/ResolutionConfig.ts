/** Wszystkie rozdzielczości trzymają proporcję 4:3 (czyli 8:6) */
export class ResolutionConfig
{
    public static readonly SIZES: { width: uint, height: uint }[] = [
        { width: 800, height: 600 },
        { width: 1024, height: 768 },
        { width: 1280, height: 960 },
        { width: 1600, height: 1200 },
        { width: 1920, height: 1440 },
        { width: 2560, height: 1920 },
    ];

    /** 1280 x 960 - trzecia pozycja listy */
    public static readonly DEFAULT_INDEX: uint = 2;

    public static readonly ASPECT_WIDTH: uint = 4;
    public static readonly ASPECT_HEIGHT: uint = 3;

    /** Rozdzielczość startowa - obowiązuje, dopóki z bazy nie wczytają się ustawienia */
    public static getDefault(): { width: uint, height: uint }
    {
        return ResolutionConfig.SIZES[ResolutionConfig.DEFAULT_INDEX];
    }

    public static getLabel(size: { width: uint, height: uint }): string
    {
        return `${size.width} x ${size.height}`;
    }
}
