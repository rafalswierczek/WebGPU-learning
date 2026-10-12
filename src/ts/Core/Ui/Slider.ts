import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "./UiPainter";

/**
 * Suwak 0-100 z wartością procentową obok. Nie wie, co reguluje - dostaje etykietę
 * i callback, więc obsłuży tak samo muzykę, dźwięki i cokolwiek późniejszego.
 *
 * Etykieta, tor i uchwyt są wyrównane do jednej osi w środku wiersza - bez tego tekst
 * i tor rozjeżdżały się o kilka pikseli, bo każde liczyło swój własny środek.
 */
export class Slider
{
    private static readonly TRACK_HEIGHT: uint = 6;
    private static readonly KNOB_WIDTH: uint = 6;
    /** Uchwyt wystaje ponad tor, ale nie na całą wysokość wiersza - inaczej sąsiednie suwaki na siebie nachodzą */
    private static readonly KNOB_PADDING: uint = 4;
    /** Miejsce na tekst "100%" po prawej stronie toru */
    private static readonly VALUE_CHARS: uint = 6;

    private readonly label: string;
    private readonly onChange: (value: uint) => void;

    private rect: rectPx = { x: 0, y: 0, width: 0, height: UiConfig.MENU_ROW_HEIGHT };
    private value: uint = 0;

    public constructor(label: string, onChange: (value: uint) => void)
    {
        this.label = label;
        this.onChange = onChange;
    }

    public setRect(rect: rectPx): void
    {
        this.rect = rect;
    }

    public setValue(value: uint): void
    {
        this.value = Math.round(Math.min(100, Math.max(0, value)));
    }

    public contains(canvasX: uint, canvasY: uint): boolean
    {
        return canvasX >= this.rect.x && canvasX < this.rect.x + this.rect.width
            && canvasY >= this.rect.y && canvasY < this.rect.y + this.rect.height;
    }

    /** @returns czy suwak przejął zdarzenie - wtedy właściciel powinien śledzić przeciąganie */
    public handlePress(canvasX: uint, canvasY: uint, charWidth: uint): boolean
    {
        if (!this.contains(canvasX, canvasY)) {
            return false;
        }

        this.applyFromPosition(canvasX, charWidth);

        return true;
    }

    public handleDrag(canvasX: uint, charWidth: uint): void
    {
        this.applyFromPosition(canvasX, charWidth);
    }

    public render(painter: UiPainter): void
    {
        const charWidth: uint = painter.getCharWidth();
        const centerY: uint = this.rect.y + Math.floor(this.rect.height / 2);
        const trackX: uint = this.getTrackX(charWidth);
        const trackWidth: uint = this.getTrackWidth(charWidth);
        const filled: uint = Math.round(trackWidth * this.value / 100);
        const knobHeight: uint = Slider.TRACK_HEIGHT + Slider.KNOB_PADDING * 2;
        const textY: uint = centerY - Math.floor(painter.getLineHeight() / 2);

        painter.drawText(this.rect.x, textY, this.label, UiConfig.TEXT_COLOR);

        painter.drawRect(
            trackX,
            centerY - Math.floor(Slider.TRACK_HEIGHT / 2),
            trackWidth,
            Slider.TRACK_HEIGHT,
            UiConfig.INPUT_BACKGROUND_COLOR,
        );
        painter.drawRect(
            trackX,
            centerY - Math.floor(Slider.TRACK_HEIGHT / 2),
            filled,
            Slider.TRACK_HEIGHT,
            UiConfig.INPUT_FOCUS_COLOR,
        );
        painter.drawRect(
            trackX + Math.min(trackWidth - Slider.KNOB_WIDTH, filled),
            centerY - Math.floor(knobHeight / 2),
            Slider.KNOB_WIDTH,
            knobHeight,
            UiConfig.TEXT_COLOR,
        );

        painter.drawText(trackX + trackWidth + UiConfig.ROW_PADDING, textY, `${this.value}%`, UiConfig.TEXT_COLOR);
    }

    private getTrackX(charWidth: uint): uint
    {
        return this.rect.x + this.label.length * charWidth + UiConfig.ROW_PADDING;
    }

    private getTrackWidth(charWidth: uint): uint
    {
        const used: uint = (this.label.length + Slider.VALUE_CHARS) * charWidth + UiConfig.ROW_PADDING * 2;

        return Math.max(charWidth, this.rect.width - used);
    }

    private applyFromPosition(canvasX: uint, charWidth: uint): void
    {
        const trackX: uint = this.getTrackX(charWidth);
        const trackWidth: uint = this.getTrackWidth(charWidth);

        this.setValue(Math.round((canvasX - trackX) / trackWidth * 100));
        this.onChange(this.value);
    }
}
