import { Canvas } from "../Canvas/Canvas";
import { FullScreen } from "../FullScreen";
import { GameConfig } from "../Config/GameConfig";
import { MenuScreen } from "./MenuScreen";
import { ResolutionConfig } from "../Config/ResolutionConfig";
import { ScreenManager } from "./ScreenManager";
import { ScreenName } from "./Screen";
import { Settings } from "../Settings/Settings";
import { SettingsRepository } from "../Settings/SettingsRepository";
import { Slider } from "../Ui/Slider";
import { UiButton, UiButtonList } from "../Ui/UiButtonList";
import { UiConfig } from "../Config/UiConfig";
import { UiContext } from "../Ui/UiContext";
import { UiPainter } from "../Ui/UiPainter";
import { UiWindow } from "../Ui/UiWindow";

/**
 * Ustawienia gry. Każda zmiana od razu ląduje w bazie, więc obowiązuje też w edytorze mapy
 * i po ponownym uruchomieniu.
 */
export class OptionsScreen extends MenuScreen
{
    private readonly settings: Settings;
    private readonly settingsRepository: SettingsRepository;
    private readonly fullScreen: FullScreen;
    private readonly screens: ScreenManager;

    private readonly backRow: UiButtonList = new UiButtonList();
    private readonly rows: UiButtonList = new UiButtonList();
    private readonly musicSlider: Slider;
    private readonly soundSlider: Slider;

    private readonly resolutionWindow: UiWindow = new UiWindow('Resolution', UiConfig.RESOLUTION_WIDTH, UiConfig.RESOLUTION_HEIGHT);
    private readonly autosaveWindow: UiWindow = new UiWindow('Autosave', UiConfig.AUTOSAVE_WIDTH, UiConfig.AUTOSAVE_HEIGHT);
    private readonly resolutionList: UiButtonList = new UiButtonList();
    private readonly autosaveList: UiButtonList = new UiButtonList();

    private draggingSlider: Slider|null = null;

    public constructor(
        canvas: Canvas,
        context: GPUCanvasContext,
        ui: UiContext,
        screens: ScreenManager,
        settings: Settings,
        settingsRepository: SettingsRepository,
        fullScreen: FullScreen,
    ) {
        super(canvas, context, ui);

        this.settings = settings;
        this.settingsRepository = settingsRepository;
        this.fullScreen = fullScreen;
        this.screens = screens;

        this.musicSlider = new Slider('Music volume', (value: uint): void => {
            settings.setMusicVolume(value);
            this.save();
        });
        this.soundSlider = new Slider('Sound volume', (value: uint): void => {
            settings.setSoundVolume(value);
            this.save();
        });

        this.backRow.setRowHeight(UiConfig.MENU_ROW_HEIGHT);
        this.backRow.setButtons([
            { label: `${UiConfig.BACK_ARROW} Options`, onClick: (): void => screens.goTo(ScreenName.MAIN_MENU) },
        ]);
        this.rows.setRowHeight(UiConfig.MENU_ROW_HEIGHT);
        this.resolutionList.setButtons(this.buildResolutionButtons());
        this.autosaveList.setButtons(this.buildAutosaveButtons());
    }

    protected getWidthPercent(): float
    {
        return UiConfig.OPTIONS_WIDTH_PERCENT;
    }

    protected onActivate(): void
    {
        this.musicSlider.setValue(this.settings.getMusicVolume());
        this.soundSlider.setValue(this.settings.getSoundVolume());
        this.resolutionWindow.close();
        this.autosaveWindow.close();
    }

    protected renderContent(painter: UiPainter, box: rectPx): void
    {
        const contentX: uint = box.x + UiConfig.PADDING;
        const contentWidth: uint = box.width - UiConfig.PADDING * 2;

        // strzałka powrotu w lewym górnym rogu boxa
        this.backRow.setRect({
            x: contentX,
            y: box.y + UiConfig.PADDING,
            width: contentWidth,
            height: UiConfig.MENU_ROW_HEIGHT,
        });
        this.backRow.render(painter);

        let y: uint = box.y + UiConfig.PADDING + UiConfig.MENU_ROW_HEIGHT + UiConfig.BACK_ROW_MARGIN_BOTTOM;

        this.rows.setButtons([
            { label: `Resolution: ${ResolutionConfig.getLabel(this.settings.getResolution())}`, onClick: (): void => this.openWindow(this.resolutionWindow) },
            { label: `Game difficulty: ${this.settings.getDifficultyName()}`, onClick: (): void => this.cycleDifficulty() },
        ]);
        this.rows.setRect({ x: contentX, y: y, width: contentWidth, height: this.rows.getHeight() });
        this.rows.render(painter);

        y += this.rows.getHeight();

        painter.drawText(contentX + UiConfig.ROW_PADDING, y, UiConfig.DIFFICULTY_NOTE, UiConfig.MUTED_TEXT_COLOR);
        y += UiConfig.MENU_ROW_HEIGHT;

        this.musicSlider.setRect({ x: contentX + UiConfig.ROW_PADDING, y: y, width: contentWidth - UiConfig.ROW_PADDING, height: UiConfig.MENU_ROW_HEIGHT });
        this.musicSlider.render(painter);
        y += UiConfig.MENU_ROW_HEIGHT;

        this.soundSlider.setRect({ x: contentX + UiConfig.ROW_PADDING, y: y, width: contentWidth - UiConfig.ROW_PADDING, height: UiConfig.MENU_ROW_HEIGHT });
        this.soundSlider.render(painter);
        y += UiConfig.MENU_ROW_HEIGHT;

        this.autosaveRow(painter, contentX, y, contentWidth);

        this.renderWindow(painter, this.resolutionWindow, this.resolutionList);
        this.renderWindow(painter, this.autosaveWindow, this.autosaveList);
    }

    protected onMove(canvasX: uint, canvasY: uint): void
    {
        if (this.draggingSlider !== null) {
            this.draggingSlider.handleDrag(canvasX, this.ui.painter.getCharWidth());

            return;
        }

        this.backRow.onPointerMove(canvasX, canvasY);
        this.rows.onPointerMove(canvasX, canvasY);
        this.autosaveButton.onPointerMove(canvasX, canvasY);
        this.resolutionList.onPointerMove(canvasX, canvasY);
        this.autosaveList.onPointerMove(canvasX, canvasY);
    }

    protected onRelease(): void
    {
        this.draggingSlider = null;
    }

    protected onPress(canvasX: uint, canvasY: uint): void
    {
        if (this.handleOpenWindow(canvasX, canvasY, this.resolutionWindow, this.resolutionList)) {
            return;
        }

        if (this.handleOpenWindow(canvasX, canvasY, this.autosaveWindow, this.autosaveList)) {
            return;
        }

        if (this.backRow.handleClick(canvasX, canvasY)) {
            return;
        }

        const charWidth: uint = this.ui.painter.getCharWidth();

        if (this.musicSlider.handlePress(canvasX, canvasY, charWidth)) {
            this.draggingSlider = this.musicSlider;

            return;
        }

        if (this.soundSlider.handlePress(canvasX, canvasY, charWidth)) {
            this.draggingSlider = this.soundSlider;

            return;
        }

        if (this.rows.handleClick(canvasX, canvasY)) {
            return;
        }

        this.autosaveButton.handleClick(canvasX, canvasY);
    }

    private readonly autosaveButton: UiButtonList = new UiButtonList();

    private autosaveRow(painter: UiPainter, x: uint, y: uint, width: uint): void
    {
        this.autosaveButton.setRowHeight(UiConfig.MENU_ROW_HEIGHT);
        this.autosaveButton.setButtons([
            { label: `Autosave: every ${this.settings.getAutosaveMinutes()} min`, onClick: (): void => this.openWindow(this.autosaveWindow) },
        ]);
        this.autosaveButton.setRect({ x: x, y: y, width: width, height: UiConfig.MENU_ROW_HEIGHT });
        this.autosaveButton.render(painter);
    }

    private openWindow(window: UiWindow): void
    {
        this.resolutionWindow.close();
        this.autosaveWindow.close();

        window.center(this.canvas.getWidth(), this.canvas.getHeight());
        window.setOpen(true);
    }

    /** @returns czy okno przejęło kliknięcie */
    private handleOpenWindow(canvasX: uint, canvasY: uint, window: UiWindow, list: UiButtonList): boolean
    {
        if (!window.isOpen()) {
            return false;
        }

        if (!window.contains(canvasX, canvasY)) {
            window.close();

            return true;
        }

        list.handleClick(canvasX, canvasY);

        return true;
    }

    private renderWindow(painter: UiPainter, window: UiWindow, list: UiButtonList): void
    {
        if (!window.isOpen()) {
            return;
        }

        window.renderChrome(painter);

        list.setRowHeight(painter.getLineHeight());
        list.setRect({
            x: window.getContentX(),
            y: window.getContentY(),
            width: window.getRect().width - UiConfig.PADDING * 2,
            height: list.getHeight(),
        });
        list.render(painter);
    }

    private buildResolutionButtons(): UiButton[]
    {
        return ResolutionConfig.SIZES.map((size: { width: uint, height: uint }, index: uint): UiButton => ({
            label: ResolutionConfig.getLabel(size),
            onClick: (): void => this.applyResolution(index),
        }));
    }

    private buildAutosaveButtons(): UiButton[]
    {
        return GameConfig.AUTOSAVE_MINUTES.map((minutes: uint): UiButton => ({
            label: `${minutes} min`,
            onClick: (): void => {
                this.settings.setAutosaveMinutes(minutes);
                this.autosaveWindow.close();
                this.save();
            },
        }));
    }

    private applyResolution(index: uint): void
    {
        this.settings.setResolutionIndex(index);

        // przez FullScreen, bo w pelnym ekranie rozmiar canvasa zalezy takze od ekranu
        this.fullScreen.applyResolution();
        this.resolutionWindow.close();
        this.save();
    }

    private cycleDifficulty(): void
    {
        this.settings.nextDifficulty();
        this.save();
    }

    private save(): void
    {
        this.settingsRepository.save(this.settings).catch((error: Error): void => console.error(error));
    }
}
