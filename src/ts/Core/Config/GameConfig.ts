export class GameConfig
{
    public static readonly TITLE: string = 'Vita';
    public static readonly AUTHOR: string = 'Rafal Swierczek';
    public static readonly VERSION: string = '0.1.2';
    public static readonly DISCORD_URL: string = 'https://discord.gg/vita';

    /** Kursor jest plikiem CUR (mimo rozszerzenia .jpg w assets), wiec ma przezroczystosc i hotspot */
    public static readonly CURSOR_URL: string = 'assets/d2.cur';

    public static readonly DIFFICULTIES: string[] = ['Easy', 'Medium', 'Hard', 'Hardcore'];
    public static readonly AUTOSAVE_MINUTES: uint[] = [5, 15, 30];
}
