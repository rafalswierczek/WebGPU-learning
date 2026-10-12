import { Canvas } from "../Canvas/Canvas";
import { GameConfig } from "../Config/GameConfig";
import { MenuScreen } from "./MenuScreen";
import { ScreenManager } from "./ScreenManager";
import { ScreenName } from "./Screen";
import { UiButtonList } from "../Ui/UiButtonList";
import { UiConfig } from "../Config/UiConfig";
import { UiContext } from "../Ui/UiContext";
import { UiPainter } from "../Ui/UiPainter";

export class MainMenuScreen extends MenuScreen
{
    private readonly list: UiButtonList = new UiButtonList();

    public constructor(canvas: Canvas, context: GPUCanvasContext, ui: UiContext, screens: ScreenManager)
    {
        super(canvas, context, ui);

        this.list.setRowHeight(UiConfig.MENU_ROW_HEIGHT);
        this.list.setButtons([
            { label: 'New game', onClick: null },
            { label: 'Load game', onClick: null },
            { label: 'Options', onClick: (): void => screens.goTo(ScreenName.OPTIONS) },
            { label: 'Map editor', onClick: (): void => screens.goTo(ScreenName.MAP_EDITOR) },
            { label: 'Info', onClick: (): void => screens.goTo(ScreenName.INFO) },
        ]);
    }

    protected getWidthPercent(): float
    {
        return UiConfig.MAIN_MENU_WIDTH_PERCENT;
    }

    protected renderContent(painter: UiPainter, box: rectPx): void
    {
        painter.drawText(box.x + UiConfig.PADDING, box.y + UiConfig.PADDING, GameConfig.TITLE, UiConfig.MUTED_TEXT_COLOR);

        this.list.setRect({
            x: box.x + UiConfig.PADDING,
            y: box.y + UiConfig.PADDING + UiConfig.MENU_TITLE_HEIGHT,
            width: box.width - UiConfig.PADDING * 2,
            height: this.list.getHeight(),
        });

        this.list.render(painter);
    }

    protected onMove(canvasX: uint, canvasY: uint): void
    {
        this.list.onPointerMove(canvasX, canvasY);
    }

    protected onPress(canvasX: uint, canvasY: uint): void
    {
        this.list.handleClick(canvasX, canvasY);
    }
}
