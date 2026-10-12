/**
 * Rysowanie interfejsu w pikselach canvasa, origin w lewym górnym rogu.
 *
 * Widgety znają tylko ten interfejs, więc nie wiedzą nic o WebGPU i dadzą się użyć
 * zarówno w edytorze, jak i w grze. Implementacją jest OverlayPass.
 */
export interface UiPainter
{
    drawRect(x: uint, y: uint, width: uint, height: uint, color: colorRgba): void;

    /** Ramka rysowana od wewnątrz podanego prostokąta */
    drawBorder(x: uint, y: uint, width: uint, height: uint, thickness: uint, color: colorRgba): void;

    drawText(x: uint, y: uint, text: string, color: colorRgba): void;

    measureText(text: string): uint;

    getCharWidth(): uint;

    getLineHeight(): uint;
}
