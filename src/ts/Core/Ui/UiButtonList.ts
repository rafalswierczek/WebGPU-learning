import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "./UiPainter";

export type UiButton = {
    readonly label: string;
    readonly onClick: (() => void)|null;
};

/**
 * Pionowa lista klikalnych wierszy. Używana wszędzie, gdzie w interfejsie jest lista:
 * menu główne, opcje, wybór rozdzielczości, częstotliwość autozapisu, ekran informacji.
 *
 * Wiersz bez akcji (onClick === null) jest nieklikalny i rysowany przygaszonym kolorem.
 */
export class UiButtonList
{
    private buttons: UiButton[] = [];
    private rect: rectPx = { x: 0, y: 0, width: 0, height: 0 };
    private rowHeight: uint = UiConfig.ROW_HEIGHT;
    private hovered: int = -1;

    public setButtons(buttons: UiButton[]): void
    {
        this.buttons = buttons;
    }

    public setRect(rect: rectPx): void
    {
        this.rect = rect;
    }

    public setRowHeight(rowHeight: uint): void
    {
        this.rowHeight = rowHeight;
    }

    public getHeight(): uint
    {
        return this.buttons.length * this.rowHeight;
    }

    public onPointerMove(canvasX: uint, canvasY: uint): void
    {
        this.hovered = this.getRowAt(canvasX, canvasY);
    }

    /** @returns czy kliknięcie trafiło w którykolwiek wiersz */
    public handleClick(canvasX: uint, canvasY: uint): boolean
    {
        const index: int = this.getRowAt(canvasX, canvasY);

        if (index === -1) {
            return false;
        }

        const button: UiButton = this.buttons[index];

        if (button.onClick !== null) {
            button.onClick();
        }

        return true;
    }

    public render(painter: UiPainter): void
    {
        const textOffset: uint = Math.max(0, Math.floor((this.rowHeight - painter.getLineHeight()) / 2));

        for (let i: uint = 0; i < this.buttons.length; i++) {
            const button: UiButton = this.buttons[i];
            const y: uint = this.rect.y + i * this.rowHeight;

            if (i === this.hovered && button.onClick !== null) {
                painter.drawRect(this.rect.x, y, this.rect.width, this.rowHeight, UiConfig.ROW_HOVER_COLOR);
            }

            painter.drawText(
                this.rect.x + UiConfig.ROW_PADDING,
                y + textOffset,
                button.label,
                button.onClick === null ? UiConfig.MUTED_TEXT_COLOR : UiConfig.TEXT_COLOR,
            );
        }
    }

    private getRowAt(canvasX: uint, canvasY: uint): int
    {
        if (canvasX < this.rect.x || canvasX >= this.rect.x + this.rect.width) {
            return -1;
        }

        const index: int = Math.floor((canvasY - this.rect.y) / this.rowHeight);

        return index >= 0 && index < this.buttons.length ? index : -1;
    }
}
