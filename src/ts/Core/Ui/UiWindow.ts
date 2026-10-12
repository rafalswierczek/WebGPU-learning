import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "./UiPainter";

/**
 * Czarne okno UI: prostokąt, tło, ramka, tytuł i stan otwarcia.
 *
 * Wszystkie okna edytora (Options, Brush, Resolution, menu kafla) są tą samą klasą -
 * różnią się tylko rozmiarem, sposobem ustawienia i zawartością rysowaną przez właściciela.
 */
export class UiWindow
{
    public readonly title: string;

    private rect: rectPx;
    private open: boolean = false;

    public constructor(title: string, width: uint, height: uint)
    {
        this.title = title;
        this.rect = { x: 0, y: 0, width: width, height: height };
    }

    public isOpen(): boolean
    {
        return this.open;
    }

    public getRect(): rectPx
    {
        return this.rect;
    }

    public setRect(rect: rectPx): void
    {
        this.rect = rect;
    }

    /** Ustawia okno na środku canvasa */
    public center(canvasWidth: uint, canvasHeight: uint): void
    {
        this.rect = {
            x: Math.max(0, Math.floor((canvasWidth - this.rect.width) / 2)),
            y: Math.max(0, Math.floor((canvasHeight - this.rect.height) / 2)),
            width: this.rect.width,
            height: this.rect.height,
        };
    }

    public setOpen(open: boolean): void
    {
        this.open = open;
    }

    public toggle(): void
    {
        this.open = !this.open;
    }

    public close(): void
    {
        this.open = false;
    }

    public contains(canvasX: uint, canvasY: uint): boolean
    {
        return this.open
            && canvasX >= this.rect.x && canvasX < this.rect.x + this.rect.width
            && canvasY >= this.rect.y && canvasY < this.rect.y + this.rect.height;
    }

    /** Rysuje tło, ramkę i tytuł. Zawartość dorysowuje właściciel od getContentY(). */
    public renderChrome(painter: UiPainter): void
    {
        if (!this.open) {
            return;
        }

        painter.drawRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height, UiConfig.PANEL_COLOR);
        painter.drawBorder(this.rect.x, this.rect.y, this.rect.width, this.rect.height, UiConfig.BORDER_PX, UiConfig.BORDER_COLOR);

        if (this.title !== '') {
            painter.drawText(
                this.rect.x + UiConfig.PADDING,
                this.rect.y + UiConfig.PADDING,
                this.title,
                UiConfig.MUTED_TEXT_COLOR,
            );
        }
    }

    /** Pierwsza wolna linia pod tytułem */
    public getContentY(): uint
    {
        return this.rect.y + UiConfig.PADDING + (this.title === '' ? 0 : UiConfig.TITLE_HEIGHT);
    }

    public getContentX(): uint
    {
        return this.rect.x + UiConfig.PADDING;
    }
}
