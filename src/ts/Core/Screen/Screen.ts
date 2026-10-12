import { RenderPassHandler } from "../RenderPassHandler";

/** Nazwy ekranów; ScreenManager rozpoznaje po nich, dokąd przejść */
export class ScreenName
{
    public static readonly MAIN_MENU: string = 'main-menu';
    public static readonly OPTIONS: string = 'options';
    public static readonly INFO: string = 'info';
    public static readonly MAP_EDITOR: string = 'map-editor';
}

/**
 * Ekran to jedna pełna „strona" aplikacji: menu główne, opcje, informacje albo edytor mapy.
 *
 * Każdy sam podpina i odpina swoje zdarzenia wejścia, dzięki czemu w danej chwili nasłuchuje
 * dokładnie jeden - bez tego kliknięcie w menu malowałoby jeszcze po mapie.
 */
export interface Screen extends RenderPassHandler
{
    activate(): void;

    deactivate(): void;
}
