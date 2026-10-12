import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "./UiPainter";

export type MenuBarItem = {
    readonly label: string;
    readonly onClick: (() => void)|null;
};

/**
 * Stały pasek menu na górze canvasa, jak Plik/Edycja/Widok w edytorach tekstu.
 * Sam nie wie, co robią pozycje - dostaje je z zewnątrz razem z akcjami.
 */
export class MenuBar
{
    private readonly items: MenuBarItem[];

    private rect: rectPx = { x: 0, y: 0, width: UiConfig.MENU_BAR_WIDTH, height: 0 };
    private itemWidths: uint[] = [];
    private hovered: int = -1;
    private charWidth: uint = 8;
    private lineHeight: uint = 16;

    public constructor(items: MenuBarItem[])
    {
        this.items = items;
    }

    public setFontMetrics(measure: (text: string) => uint, lineHeight: uint): void
    {
        this.charWidth = measure('M');
        this.lineHeight = lineHeight;
        this.itemWidths = this.items.map(
            (item: MenuBarItem): uint => measure(item.label) + UiConfig.MENU_BAR_ITEM_PADDING * 2
        );
    }

    /** Pasek jest wyśrodkowany na górze i przelicza się przy zmianie rozdzielczości */
    public layout(canvasWidth: uint): void
    {
        const width: uint = Math.min(UiConfig.MENU_BAR_WIDTH, canvasWidth);

        this.rect = {
            x: Math.floor((canvasWidth - width) / 2),
            y: 0,
            width: width,
            height: this.lineHeight + UiConfig.MENU_BAR_PADDING * 2,
        };
    }

    public getRect(): rectPx
    {
        return this.rect;
    }

    public contains(canvasX: uint, canvasY: uint): boolean
    {
        return canvasX >= this.rect.x && canvasX < this.rect.x + this.rect.width
            && canvasY >= this.rect.y && canvasY < this.rect.y + this.rect.height;
    }

    public onPointerMove(canvasX: uint, canvasY: uint): void
    {
        this.hovered = this.contains(canvasX, canvasY) ? this.getItemAt(canvasX) : -1;
    }

    /** @returns czy kliknięcie trafiło w pasek */
    public handleClick(canvasX: uint, canvasY: uint): boolean
    {
        if (!this.contains(canvasX, canvasY)) {
            return false;
        }

        const item: MenuBarItem|undefined = this.items[this.getItemAt(canvasX)];

        if (item !== undefined && item.onClick !== null) {
            item.onClick();
        }

        return true;
    }

    public render(painter: UiPainter): void
    {
        painter.drawRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height, UiConfig.PANEL_COLOR);
        painter.drawBorder(this.rect.x, this.rect.y, this.rect.width, this.rect.height, UiConfig.BORDER_PX, UiConfig.BORDER_COLOR);

        let x: uint = this.rect.x + UiConfig.MENU_BAR_PADDING;

        for (let i: uint = 0; i < this.items.length; i++) {
            if (i === this.hovered && this.items[i].onClick !== null) {
                painter.drawRect(x, this.rect.y + UiConfig.BORDER_PX, this.itemWidths[i], this.rect.height - UiConfig.BORDER_PX * 2, UiConfig.ROW_HOVER_COLOR);
            }

            painter.drawText(
                x + UiConfig.MENU_BAR_ITEM_PADDING,
                this.rect.y + UiConfig.MENU_BAR_PADDING,
                this.items[i].label,
                this.items[i].onClick === null ? UiConfig.MUTED_TEXT_COLOR : UiConfig.TEXT_COLOR,
            );

            x += this.itemWidths[i];
        }
    }

    private getItemAt(canvasX: uint): int
    {
        let x: uint = this.rect.x + UiConfig.MENU_BAR_PADDING;

        for (let i: uint = 0; i < this.items.length; i++) {
            if (canvasX >= x && canvasX < x + this.itemWidths[i]) {
                return i;
            }

            x += this.itemWidths[i];
        }

        return -1;
    }
}
