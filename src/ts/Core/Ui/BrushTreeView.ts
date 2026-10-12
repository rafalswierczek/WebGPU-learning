import { Brush } from "../Textures/Brush";
import { TextureNode, brushEntry } from "../Textures/TextureLibrary";
import { ThumbnailPainter } from "./ThumbnailPainter";
import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "./UiPainter";

/** Jeden wiersz listy - albo folder do rozwinięcia, albo pędzel do wybrania */
type treeRow = {
    readonly depth: uint;
    readonly folder: TextureNode|null;
    readonly entry: brushEntry|null;
};

/**
 * Rozwijana lista pędzli, zbudowana z drzewa folderów `assets/Textures` - tak jak drzewo
 * plików w IDE.
 *
 * Wiersz nie musi być jedną teksturą: folder z `config.json` zawierającym `textures` jest JEDNYM
 * wierszem i jednym pędzlem o wymiarach `brushSize`. Dlatego wiersz pokazuje rozmiar pędzla,
 * a wybranie go od razu ustawia kształt pędzla w edytorze.
 *
 * Widget nie wie nic o WebGPU: rysuje przez UiPainter i ThumbnailPainter, a wybór oddaje
 * przez callback.
 */
export class BrushTreeView
{
    private readonly root: TextureNode;
    private readonly onSelect: (brush: Brush) => void;
    private readonly allowAggregates: boolean;
    /** Rozwinięte foldery, po ścieżce */
    private readonly expanded: Set<string> = new Set<string>();

    /** Spłaszczone drzewo; przebudowywane dopiero po zmianie rozwinięcia, a nie co klatkę */
    private rows: treeRow[]|null = null;
    private rect: rectPx = { x: 0, y: 0, width: 0, height: 0 };
    private lineHeight: uint = 16;
    private hovered: int = -1;
    private scroll: uint = 0;
    private selected: brushEntry|null = null;

    /**
     * @param allowAggregates czy lista pokazuje pedzle zlozone. Zakladka Object ma je ukryte,
     *                        bo obiekty sa zawsze 1x1 - agregat jest pojeciem wylacznie kaflowym.
     */
    public constructor(root: TextureNode, onSelect: (brush: Brush) => void, allowAggregates: boolean = true)
    {
        this.root = root;
        this.onSelect = onSelect;
        this.allowAggregates = allowAggregates;
    }

    public setRect(rect: rectPx): void
    {
        this.rect = rect;
        this.clampScroll();
    }

    /** Szerokość znaku bierzemy z malarza przy rysowaniu, więc tu liczy się tylko wysokość wiersza */
    public setFontMetrics(lineHeight: uint): void
    {
        this.lineHeight = lineHeight;
    }

    public onPointerMove(canvasX: uint, canvasY: uint): void
    {
        this.hovered = this.getRowAt(canvasX, canvasY);
    }

    public clearHover(): void
    {
        this.hovered = -1;
    }

    /** @returns czy kliknięcie trafiło w wiersz */
    public handleClick(canvasX: uint, canvasY: uint): boolean
    {
        const index: int = this.getRowAt(canvasX, canvasY);

        if (index === -1) {
            return false;
        }

        const row: treeRow = this.getRows()[index];

        if (row.folder !== null) {
            this.toggleFolder(row.folder);

            return true;
        }

        if (row.entry !== null) {
            this.selected = row.entry;
            this.onSelect(row.entry.brush);
        }

        return true;
    }

    /** @returns czy przewijanie zostało pochłonięte przez listę */
    public handleWheel(canvasX: uint, canvasY: uint, deltaY: float): boolean
    {
        if (!this.contains(canvasX, canvasY)) {
            return false;
        }

        this.scroll = Math.max(0, this.scroll + (deltaY > 0 ? 1 : -1));
        this.clampScroll();

        return true;
    }

    public render(painter: UiPainter, thumbnails: ThumbnailPainter): void
    {
        const rows: treeRow[] = this.getRows();
        const rowHeight: uint = this.getRowHeight();
        const visibleRows: uint = this.getVisibleRowCount();
        const last: uint = Math.min(rows.length, this.scroll + visibleRows);

        for (let i: uint = this.scroll; i < last; i++) {
            this.renderRow(painter, thumbnails, rows[i], i, this.rect.y + (i - this.scroll) * rowHeight);
        }

        if (rows.length > last) {
            painter.drawText(
                this.rect.x,
                this.rect.y + visibleRows * rowHeight,
                `... ${rows.length - last} more (scroll)`,
                UiConfig.MUTED_TEXT_COLOR,
            );
        }
    }

    private renderRow(
        painter: UiPainter,
        thumbnails: ThumbnailPainter,
        row: treeRow,
        index: uint,
        y: uint,
    ): void {
        const rowHeight: uint = this.getRowHeight();
        const selected: boolean = row.entry !== null && row.entry === this.selected;

        if (selected) {
            painter.drawRect(this.rect.x, y, this.rect.width, rowHeight, UiConfig.ROW_SELECTED_COLOR);
        } else if (index === this.hovered) {
            painter.drawRect(this.rect.x, y, this.rect.width, rowHeight, UiConfig.ROW_HOVER_COLOR);
        }

        const x: uint = this.rect.x + row.depth * UiConfig.TREE_INDENT_PX;
        const textY: uint = y + Math.floor((rowHeight - this.lineHeight) / 2);

        if (row.folder !== null) {
            painter.drawText(
                x,
                textY,
                `${this.expanded.has(row.folder.path) ? UiConfig.TREE_OPEN : UiConfig.TREE_CLOSED} ${row.folder.name}`,
                UiConfig.TEXT_COLOR,
            );

            return;
        }

        if (row.entry === null) {
            return;
        }

        const brush: Brush = row.entry.brush;
        const label: string = brush.isResizable()
            ? row.entry.label
            : `${row.entry.label} ${brush.getColumns()}x${brush.getRows()}`;

        painter.drawText(x, textY, label, selected ? UiConfig.INPUT_FOCUS_COLOR : UiConfig.TEXT_COLOR);
        thumbnails.drawTexture(
            x + painter.measureText(label) + UiConfig.PADDING,
            y + Math.floor((rowHeight - UiConfig.THUMBNAIL_PX) / 2),
            UiConfig.THUMBNAIL_PX,
            UiConfig.THUMBNAIL_PX,
            brush.getPreviewTextureId(),
        );
    }

    /**
     * Drzewo spłaszczone do wierszy w kolejności rysowania: najpierw pędzle folderu,
     * potem jego rozwinięte podfoldery.
     *
     * Wynik jest trzymany, bo lista jest czytana kilka razy na klatkę, a zmienia się tylko przy
     * rozwijaniu folderu - przy setkach tekstur przeliczanie jej co klatkę byłoby marnotrawstwem.
     */
    private getRows(): treeRow[]
    {
        if (this.rows === null) {
            this.rows = [];
            this.pushFolderRows(this.root, 0, this.rows);
        }

        return this.rows;
    }

    private pushFolderRows(folder: TextureNode, depth: uint, rows: treeRow[]): void
    {
        for (const entry of folder.brushes) {
            if (!this.allowAggregates && entry.brush.isAggregate()) {
                continue;
            }

            rows.push({ depth: depth, folder: null, entry: entry });
        }

        for (const child of folder.folders) {
            rows.push({ depth: depth, folder: child, entry: null });

            if (this.expanded.has(child.path)) {
                this.pushFolderRows(child, depth + 1, rows);
            }
        }
    }

    private toggleFolder(folder: TextureNode): void
    {
        if (this.expanded.has(folder.path)) {
            this.expanded.delete(folder.path);
        } else {
            this.expanded.add(folder.path);
        }

        this.rows = null;
        this.clampScroll();
    }

    private getRowAt(canvasX: uint, canvasY: uint): int
    {
        if (!this.contains(canvasX, canvasY)) {
            return -1;
        }

        const index: int = this.scroll + Math.floor((canvasY - this.rect.y) / this.getRowHeight());

        return index < this.getRows().length ? index : -1;
    }

    private contains(canvasX: uint, canvasY: uint): boolean
    {
        return canvasX >= this.rect.x && canvasX < this.rect.x + this.rect.width
            && canvasY >= this.rect.y && canvasY < this.rect.y + this.rect.height;
    }

    /** Wiersz musi pomieścić miniaturę, więc rośnie razem z nią */
    private getRowHeight(): uint
    {
        return Math.max(this.lineHeight, UiConfig.THUMBNAIL_PX) + UiConfig.TREE_ROW_PADDING;
    }

    private getVisibleRowCount(): uint
    {
        // ostatni wiersz zostaje na informację o przewijaniu
        return Math.max(1, Math.floor(this.rect.height / this.getRowHeight()) - 1);
    }

    private clampScroll(): void
    {
        const rows: uint = this.getRows().length;
        const visible: uint = this.getVisibleRowCount();

        this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, rows - visible)));
    }
}
