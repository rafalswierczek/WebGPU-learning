import { Canvas } from "../Canvas/Canvas";
import { GameConfig } from "../Config/GameConfig";
import { MapRepository } from "../Map/MapRepository";
import { MenuScreen } from "./MenuScreen";
import { ScreenManager } from "./ScreenManager";
import { ScreenName } from "./Screen";
import { UiButtonList } from "../Ui/UiButtonList";
import { UiConfig } from "../Config/UiConfig";
import { UiContext } from "../Ui/UiContext";
import { UiPainter } from "../Ui/UiPainter";

export class InfoScreen extends MenuScreen
{
    private readonly mapRepository: MapRepository;
    private readonly backRow: UiButtonList = new UiButtonList();

    public constructor(
        canvas: Canvas,
        context: GPUCanvasContext,
        ui: UiContext,
        screens: ScreenManager,
        mapRepository: MapRepository,
    ) {
        super(canvas, context, ui);

        this.mapRepository = mapRepository;

        this.backRow.setRowHeight(UiConfig.MENU_ROW_HEIGHT);
        this.backRow.setButtons([
            { label: `${UiConfig.BACK_ARROW} Info`, onClick: (): void => screens.goTo(ScreenName.MAIN_MENU) },
        ]);
    }

    protected getWidthPercent(): float
    {
        return UiConfig.MAIN_MENU_WIDTH_PERCENT;
    }

    protected renderContent(painter: UiPainter, box: rectPx): void
    {
        const contentX: uint = box.x + UiConfig.PADDING;

        this.backRow.setRect({
            x: contentX,
            y: box.y + UiConfig.PADDING,
            width: box.width - UiConfig.PADDING * 2,
            height: UiConfig.MENU_ROW_HEIGHT,
        });
        this.backRow.render(painter);

        const lines: string[] = [
            `Game:        ${GameConfig.TITLE}`,
            `Author:      ${GameConfig.AUTHOR}`,
            `Version:     ${GameConfig.VERSION}`,
            `Map version: ${this.mapRepository.getMapVersion()}`,
            '',
            'Discord:',
            GameConfig.DISCORD_URL,
        ];

        for (let i: uint = 0; i < lines.length; i++) {
            painter.drawText(
                contentX + UiConfig.ROW_PADDING,
                box.y + UiConfig.PADDING + UiConfig.MENU_ROW_HEIGHT + UiConfig.BACK_ROW_MARGIN_BOTTOM
                    + i * painter.getLineHeight(),
                lines[i],
                UiConfig.TEXT_COLOR,
            );
        }
    }

    protected onMove(canvasX: uint, canvasY: uint): void
    {
        this.backRow.onPointerMove(canvasX, canvasY);
    }

    protected onPress(canvasX: uint, canvasY: uint): void
    {
        this.backRow.handleClick(canvasX, canvasY);
    }
}
