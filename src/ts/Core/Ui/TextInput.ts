import { KeyboardFocus } from "./KeyboardFocus";
import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "./UiPainter";

/**
 * Pole tekstowe rysowane w canvasie. Nie wie nic o kaflach, WebGPU ani edytorze -
 * dostaje prostokąt i maluje się przez UiPainter, więc nadaje się tak samo do gry
 * (czat, nazwa postaci, pole wyszukiwania) jak do edytora.
 *
 * Cykl życia: focus() -> handleKey() dla każdego klawisza -> onCommit albo onCancel -> blur().
 */
export class TextInput
{
    private static readonly PRINTABLE: RegExp = /^.$/u;

    private readonly keyboardFocus: KeyboardFocus;
    /** Znaki spoza wzorca są odrzucane przy wpisywaniu; null = bez ograniczeń */
    private readonly allowed: RegExp|null;
    private readonly maxLength: uint;

    private value: string = '';
    private caret: uint = 0;
    private onCommit: ((value: string) => void)|null = null;

    public constructor(keyboardFocus: KeyboardFocus, allowed: RegExp|null = null, maxLength: uint = 32)
    {
        this.keyboardFocus = keyboardFocus;
        this.allowed = allowed;
        this.maxLength = maxLength;
    }

    public isFocused(): boolean
    {
        return this.keyboardFocus.isOwnedBy(this);
    }

    public getValue(): string
    {
        return this.value;
    }

    public focus(value: string, onCommit: (value: string) => void): void
    {
        this.value = value;
        this.caret = value.length;
        this.onCommit = onCommit;
        this.keyboardFocus.capture(this);
    }

    public blur(): void
    {
        this.keyboardFocus.release(this);
        this.onCommit = null;
    }

    /** @returns czy klawisz został skonsumowany - jeśli tak, nikt inny nie powinien go obsługiwać */
    public handleKey(event: KeyboardEvent): boolean
    {
        if (!this.isFocused()) {
            return false;
        }

        event.preventDefault();

        if (event.key === 'Enter') {
            this.commit();

            return true;
        }

        if (event.key === 'Escape') {
            this.blur();

            return true;
        }

        if (event.key === 'Backspace') {
            this.deleteBefore();

            return true;
        }

        if (event.key === 'Delete') {
            this.deleteAfter();

            return true;
        }

        if (event.key === 'ArrowLeft') {
            this.caret = Math.max(0, this.caret - 1);

            return true;
        }

        if (event.key === 'ArrowRight') {
            this.caret = Math.min(this.value.length, this.caret + 1);

            return true;
        }

        if (event.key === 'Home') {
            this.caret = 0;

            return true;
        }

        if (event.key === 'End') {
            this.caret = this.value.length;

            return true;
        }

        // pojedynczy znak drukowalny; skróty z ctrl/alt zostawiamy przeglądarce
        if (!event.ctrlKey && !event.altKey && TextInput.PRINTABLE.test(event.key)) {
            this.insert(event.key);
        }

        return true;
    }

    public render(painter: UiPainter, rect: rectPx, now: float): void
    {
        painter.drawRect(rect.x, rect.y, rect.width, rect.height, UiConfig.INPUT_BACKGROUND_COLOR);

        if (this.isFocused()) {
            painter.drawBorder(rect.x, rect.y, rect.width, rect.height, UiConfig.BORDER_PX, UiConfig.INPUT_FOCUS_COLOR);
        }

        const textX: uint = rect.x + UiConfig.ROW_PADDING;
        const textY: uint = rect.y + Math.floor((rect.height - painter.getLineHeight()) / 2);

        painter.drawText(textX, textY, this.value, UiConfig.TEXT_COLOR);

        if (!this.isFocused() || Math.floor(now / UiConfig.CARET_BLINK_MS) % 2 === 1) {
            return;
        }

        painter.drawRect(
            textX + painter.measureText(this.value.slice(0, this.caret)),
            textY,
            UiConfig.BORDER_PX,
            painter.getLineHeight(),
            UiConfig.CARET_COLOR,
        );
    }

    private commit(): void
    {
        const onCommit = this.onCommit;
        const value: string = this.value;

        this.blur();

        if (onCommit !== null) {
            onCommit(value);
        }
    }

    private insert(character: string): void
    {
        if (this.value.length >= this.maxLength) {
            return;
        }

        if (this.allowed !== null && !this.allowed.test(character)) {
            return;
        }

        this.value = this.value.slice(0, this.caret) + character + this.value.slice(this.caret);
        this.caret++;
    }

    private deleteBefore(): void
    {
        if (this.caret === 0) {
            return;
        }

        this.value = this.value.slice(0, this.caret - 1) + this.value.slice(this.caret);
        this.caret--;
    }

    private deleteAfter(): void
    {
        if (this.caret >= this.value.length) {
            return;
        }

        this.value = this.value.slice(0, this.caret) + this.value.slice(this.caret + 1);
    }
}
