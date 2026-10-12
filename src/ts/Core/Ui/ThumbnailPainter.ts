/**
 * Rysowanie miniatur tekstur w pikselach canvasa, origin w lewym górnym rogu.
 *
 * Osobny interfejs od UiPainter, bo miniatury idą z innej tekstury (tablicy kafli) i innym
 * pipeline'em. Widgety znają tylko ten interfejs, więc nadal nie wiedzą nic o WebGPU.
 */
export interface ThumbnailPainter
{
    /** @param textureId identyfikator tekstury, czyli zarazem warstwa tablicy tekstur */
    drawTexture(x: uint, y: uint, width: uint, height: uint, textureId: uint): void;
}
