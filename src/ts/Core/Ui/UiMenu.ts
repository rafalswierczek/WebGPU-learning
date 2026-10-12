import { TextInput } from "./TextInput";
import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "./UiPainter";

/**
 * Wygląd pojedynczego wiersza. Oba pola są opcjonalne, więc wiersz bez stylu wygląda tak,
 * jak wyglądał zawsze.
 */
export type rowStyle = {
    /** Kolor tekstu; domyślnie biały dla klikalnych, przygaszony dla informacyjnych */
    readonly color?: colorRgba;
    /** Dodatkowy odstęp POD wierszem w pikselach - do rozdzielania sekcji okna */
    readonly spacing?: uint;
};

/** Jeden wiersz okna po zawinięciu tekstu; y i height są w pikselach canvasa */
export type menuRow = {
    readonly lines: string[];
    readonly onClick: (() => void)|null;
    /** Pole tekstowe tego wiersza albo null, gdy wiersz nie jest edytowalny */
    readonly input: TextInput|null;
    readonly style: rowStyle;
    y: uint;
    height: uint;
};

/**
 * Panel z wierszami: tło, tytuł, zawijanie tekstu, najechanie, klikanie i pola tekstowe.
 *
 * Cała mechanika okna siedzi tutaj, a co w nim stoi, mówi funkcja budująca wiersze - dzięki temu
 * okno kafla (informacje o komórce) i okno pędzla (edycja atrybutów) mają wspólny szkielet
 * i różnią się wyłącznie zawartością.
 */
export class UiMenu
{
    private readonly buildRows: () => menuRow[];
    /** Wszystkie pola tekstowe okna - klawiatura trafia do tego, które ma focus */
    private readonly inputs: TextInput[] = [];

    private title: string = '';
    private open: boolean = false;
    private rect: rectPx = { x: 0, y: 0, width: UiConfig.MENU_WIDTH, height: UiConfig.MENU_HEIGHT };
    private rows: menuRow[] = [];
    private hoveredRow: int = -1;

    /**
     * Malarz jako źródło metryk. Font jest proporcjonalny, więc szerokości tekstu nie da się
     * policzyć ze stałej - trzeba go zmierzyć, także przy kliknięciu, poza rysowaniem klatki.
     */
    private metrics: UiPainter|null = null;

    public constructor(buildRows: () => menuRow[])
    {
        this.buildRows = buildRows;
    }

    /** Pola tekstowe trzeba zgłosić, żeby okno wiedziało, komu oddać klawiaturę i co wygasić */
    public registerInput(input: TextInput): TextInput
    {
        this.inputs.push(input);

        return input;
    }

    public setMetrics(painter: UiPainter): void
    {
        this.metrics = painter;
    }

    public isOpen(): boolean
    {
        return this.open;
    }

    public getRect(): rectPx
    {
        return this.rect;
    }

    public setTitle(title: string): void
    {
        this.title = title;
    }

    public openAt(rect: rectPx, title: string): void
    {
        this.rect = rect;
        this.title = title;
        this.open = true;
        this.hoveredRow = -1;

        this.layout();
    }

    public close(): void
    {
        this.open = false;
        this.hoveredRow = -1;

        for (const input of this.inputs) {
            input.blur();
        }
    }

    public contains(canvasX: uint, canvasY: uint): boolean
    {
        return this.open
            && canvasX >= this.rect.x && canvasX < this.rect.x + this.rect.width
            && canvasY >= this.rect.y && canvasY < this.rect.y + this.rect.height;
    }

    public onPointerMove(canvasX: uint, canvasY: uint): void
    {
        this.hoveredRow = this.contains(canvasX, canvasY) ? this.getRowAt(canvasY) : -1;
    }

    /**
     * @returns czy kliknięcie zostało pochłonięte przez okno
     *
     * Kliknięcie poza oknem zamyka je i też jest pochłaniane - tak jak w menu systemowych,
     * gdzie pierwsze kliknięcie obok zamyka menu, a nie wykonuje akcji pod kursorem.
     */
    public handleClick(canvasX: uint, canvasY: uint): boolean
    {
        if (!this.open) {
            return false;
        }

        if (!this.contains(canvasX, canvasY)) {
            this.close();

            return true;
        }

        const row: menuRow|undefined = this.rows[this.getRowAt(canvasY)];

        if (row !== undefined && row.onClick !== null) {
            row.onClick();
            this.layout();
        }

        return true;
    }

    public handleKey(event: KeyboardEvent): boolean
    {
        for (const input of this.inputs) {
            if (input.handleKey(event)) {
                this.layout();

                return true;
            }
        }

        if (this.open && event.key === 'Escape') {
            this.close();

            return true;
        }

        return false;
    }

    public render(painter: UiPainter, now: float): void
    {
        if (!this.open) {
            return;
        }

        painter.drawRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height, UiConfig.PANEL_COLOR);
        painter.drawBorder(
            this.rect.x,
            this.rect.y,
            this.rect.width,
            this.rect.height,
            UiConfig.BORDER_PX,
            UiConfig.BORDER_COLOR,
        );

        painter.drawText(
            this.rect.x + UiConfig.PADDING,
            this.rect.y + UiConfig.PADDING,
            this.title,
            UiConfig.MUTED_TEXT_COLOR,
        );

        for (let rowIndex: uint = 0; rowIndex < this.rows.length; rowIndex++) {
            this.renderRow(painter, this.rows[rowIndex], rowIndex, now);
        }
    }

    /** Buduje wiersze i wylicza ich pozycje; wysokość zależy od liczby linii po zawinięciu */
    public layout(): void
    {
        this.rows = this.buildRows();

        let y: uint = this.rect.y + UiConfig.PADDING + UiConfig.TITLE_HEIGHT;

        for (const row of this.rows) {
            row.y = y;
            row.height = row.lines.length * this.getLineHeight()
                + UiConfig.ROW_PADDING * 2
                + (row.style.spacing ?? 0);
            y += row.height;
        }
    }

    /**
     * @param style kolor tekstu i odstęp pod wierszem; bez niego wiersz bierze kolor
     *              z tego, czy jest klikalny, a odstęp wyłącznie z UiConfig.LINE_SPACING_PX
     */
    public makeRow(
        label: string,
        onClick: (() => void)|null = null,
        input: TextInput|null = null,
        style: rowStyle = {},
    ): menuRow {
        return { lines: this.wrap(label), onClick: onClick, input: input, style: style, y: 0, height: 0 };
    }

    private renderRow(painter: UiPainter, row: menuRow, rowIndex: uint, now: float): void
    {
        if (rowIndex === this.hoveredRow && row.onClick !== null) {
            painter.drawRect(
                this.rect.x + UiConfig.BORDER_PX,
                row.y,
                this.rect.width - UiConfig.BORDER_PX * 2,
                row.height,
                UiConfig.ROW_HOVER_COLOR,
            );
        }

        if (row.input !== null && row.input.isFocused()) {
            row.input.render(painter, {
                x: this.rect.x + UiConfig.PADDING,
                y: row.y,
                width: this.rect.width - UiConfig.PADDING * 2,
                height: row.height,
            }, now);

            return;
        }

        const color: colorRgba = row.style.color
            ?? (row.onClick === null ? UiConfig.MUTED_TEXT_COLOR : UiConfig.TEXT_COLOR);

        for (let lineIndex: uint = 0; lineIndex < row.lines.length; lineIndex++) {
            painter.drawText(
                this.rect.x + UiConfig.PADDING,
                row.y + UiConfig.ROW_PADDING + lineIndex * this.getLineHeight(),
                row.lines[lineIndex],
                color,
            );
        }
    }

    private getLineHeight(): uint
    {
        return this.metrics?.getLineHeight() ?? 16;
    }

    private measure(text: string): uint
    {
        return this.metrics?.measureText(text) ?? text.length * 8;
    }

    /**
     * Zawijanie po słowach; słowo dłuższe niż wiersz jest łamane twardo.
     * Szerokość mierzona jest znak po znaku, bo font jest proporcjonalny.
     */
    private wrap(text: string): string[]
    {
        const maxWidth: uint = Math.max(1, this.rect.width - UiConfig.PADDING * 2);
        const lines: string[] = [];
        let line: string = '';

        for (const word of text.split(' ')) {
            let rest: string = word;

            while (this.measure(rest) > maxWidth) {
                if (line !== '') {
                    lines.push(line);
                    line = '';
                }

                const head: string = this.cut(rest, maxWidth);

                lines.push(head);
                rest = rest.slice(head.length);
            }

            const candidate: string = line === '' ? rest : `${line} ${rest}`;

            if (this.measure(candidate) > maxWidth) {
                lines.push(line);
                line = rest;
            } else {
                line = candidate;
            }
        }

        if (line !== '' || lines.length === 0) {
            lines.push(line);
        }

        return lines;
    }

    /** Najdłuższy początek tekstu, który mieści się w podanej szerokości; zawsze co najmniej znak */
    private cut(text: string, maxWidth: uint): string
    {
        let taken: uint = 1;

        while (taken < text.length && this.measure(text.slice(0, taken + 1)) <= maxWidth) {
            taken++;
        }

        return text.slice(0, taken);
    }

    private getRowAt(canvasY: uint): int
    {
        for (let rowIndex: uint = 0; rowIndex < this.rows.length; rowIndex++) {
            const row: menuRow = this.rows[rowIndex];

            if (canvasY >= row.y && canvasY < row.y + row.height) {
                return rowIndex;
            }
        }

        return -1;
    }

    /**
     * Okno wychodzi w prawo od punktu i domyślnie w dół. Jeśli nie mieści się w dół,
     * idzie w górę; jeśli nie mieści się w żadną stronę, jest dosuwane do krawędzi canvasa.
     */
    public static place(
        canvasX: uint,
        canvasY: uint,
        canvasWidth: uint,
        canvasHeight: uint,
        width: uint = UiConfig.MENU_WIDTH,
        height: uint = UiConfig.MENU_HEIGHT,
    ): rectPx {
        const y: uint = canvasY + height > canvasHeight ? canvasY - height : canvasY;

        return {
            x: Math.max(0, Math.min(canvasX, canvasWidth - width)),
            y: Math.max(0, Math.min(y, canvasHeight - height)),
            width: width,
            height: height,
        };
    }
}
