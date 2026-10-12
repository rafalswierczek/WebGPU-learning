import { SquareConfig } from "./SquareConfig";

/**
 * Rozdzielczość odniesienia: ile ŚWIATA widać na ekranie przy zoomie 1.0.
 *
 * To jest wyznacznik prawdy dla całej gry. Przy 800 x 600 i boku kafla 50 widać dokładnie
 * 16 x 12 kafli - i tyle samo ma być widać w KAŻDEJ rozdzielczości, bo inaczej gracz na
 * większym monitorze widziałby większy kawałek mapy, czyli miałby przewagę.
 *
 * Wynika z tego, że to nie liczba kafli skaluje się z rozdzielczością, tylko rozmiar kafla
 * na ekranie: tileSizeX = resX / 16, tileSizeY = resY / 12. Dla 1280 x 960 wychodzi 80 x 80.
 * Renderer nie zna tych liczb - dostaje gotowy przelicznik świat -> piksele canvasa.
 *
 * Kamera pracuje wyłącznie w pikselach świata i o rozdzielczości nic nie wie. Dzięki temu
 * zmiana rozdzielczości, pełny ekran i devicePixelRatio nie ruszają tego, co widać.
 */
export class ViewConfig
{
    public static readonly REFERENCE_WIDTH: uint = 800;
    public static readonly REFERENCE_HEIGHT: uint = 600;

    /** 800 / 50 = 16 */
    public static readonly VISIBLE_TILES_X: uint = ViewConfig.REFERENCE_WIDTH / SquareConfig.LENGTH;
    /** 600 / 50 = 12 */
    public static readonly VISIBLE_TILES_Y: uint = ViewConfig.REFERENCE_HEIGHT / SquareConfig.LENGTH;
}
