import { Canvas } from "../Canvas/Canvas";
import { RenderPassColorAttachment } from "../../WebGPU/RenderPass/RenderPassColorAttachment";
import { RenderPassDescriptor } from "../../WebGPU/RenderPass/RenderPassDescriptor";
import { Screen } from "./Screen";
import { UiConfig } from "../Config/UiConfig";
import { UiContext } from "../Ui/UiContext";
import { UiPainter } from "../Ui/UiPainter";

/**
 * Wspólna podstawa ekranów menu: tło, wyśrodkowany box, obsługa myszy i cała ceremonia
 * render passa. Ekran potomny dopisuje tylko zawartość boxa i reakcję na kliknięcie.
 */
export abstract class MenuScreen implements Screen
{
    protected readonly canvas: Canvas;
    protected readonly ui: UiContext;

    private readonly context: GPUCanvasContext;
    private readonly moveHandlerRef: (event: MouseEvent) => void;
    private readonly downHandlerRef: (event: MouseEvent) => void;
    private readonly upHandlerRef: () => void;

    protected constructor(canvas: Canvas, context: GPUCanvasContext, ui: UiContext)
    {
        this.canvas = canvas;
        this.context = context;
        this.ui = ui;
        this.moveHandlerRef = (event: MouseEvent): void => this.dispatch(event, (x: uint, y: uint): void => this.onMove(x, y));
        this.downHandlerRef = (event: MouseEvent): void => this.dispatch(event, (x: uint, y: uint): void => this.onPress(x, y));
        this.upHandlerRef = (): void => this.onRelease();
    }

    public activate(): void
    {
        const element: HTMLCanvasElement = this.canvas.getCanvasElement();

        element.addEventListener('mousemove', this.moveHandlerRef);
        element.addEventListener('mousedown', this.downHandlerRef);
        element.addEventListener('mouseup', this.upHandlerRef);
        this.canvas.setCursorVisible(true);

        this.onActivate();
    }

    public deactivate(): void
    {
        const element: HTMLCanvasElement = this.canvas.getCanvasElement();

        element.removeEventListener('mousemove', this.moveHandlerRef);
        element.removeEventListener('mousedown', this.downHandlerRef);
        element.removeEventListener('mouseup', this.upHandlerRef);
    }

    public handle(commandEncoder: GPUCommandEncoder): void
    {
        this.ui.updateFrame(0, 0, this.canvas.getWidth(), this.canvas.getHeight(), 1, 1, 1, 1);
        this.ui.painter.setTextScale(UiConfig.MENU_TEXT_SCALE);

        const painter: UiPainter = this.ui.painter;
        const box: rectPx = this.getBoxRect();

        this.ui.painter.begin();
        painter.drawRect(box.x, box.y, box.width, box.height, UiConfig.MENU_BOX_COLOR);
        painter.drawBorder(box.x, box.y, box.width, box.height, UiConfig.BORDER_PX, UiConfig.BORDER_COLOR);
        this.renderContent(painter, box);
        this.ui.painter.end();

        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass(new RenderPassDescriptor(
            'render_pass_menu',
            [new RenderPassColorAttachment(
                this.context.getCurrentTexture(),
                'clear',
                'store',
                UiConfig.MENU_BACKGROUND_COLOR,
            )],
        ));

        this.ui.painter.draw(renderPass, this.ui.getFrameBindGroup());

        renderPass.end();
    }

    /** Box zajmuje zadany procent rozdzielczości i stoi na środku canvasa */
    protected getBoxRect(): rectPx
    {
        const width: uint = Math.round(this.canvas.getWidth() * this.getWidthPercent());
        const height: uint = Math.round(this.canvas.getHeight() * UiConfig.MENU_BOX_HEIGHT_PERCENT);

        return {
            x: Math.floor((this.canvas.getWidth() - width) / 2),
            y: Math.floor((this.canvas.getHeight() - height) / 2),
            width: width,
            height: height,
        };
    }

    protected abstract getWidthPercent(): float;

    protected abstract renderContent(painter: UiPainter, box: rectPx): void;

    protected abstract onPress(canvasX: uint, canvasY: uint): void;

    protected onMove(canvasX: uint, canvasY: uint): void
    {
        // ekrany bez najeżdżania nie muszą tego nadpisywać
    }

    protected onRelease(): void
    {
    }

    protected onActivate(): void
    {
    }

    private dispatch(event: MouseEvent, callback: (canvasX: uint, canvasY: uint) => void): void
    {
        const coords: coordsCanvas|null = this.canvas.getEventCoords(event);

        if (coords !== null) {
            callback(coords.canvasX, coords.canvasY);
        }
    }
}
