import { Canvas } from "./Canvas/Canvas";
import { CanvasSize } from "./Canvas/CanvasSize";
import { CanvasConfig } from "../WebGPU/Config/CanvasConfig";
import { SquareConfig } from "./Config/SquareConfig";
import { WebGPU } from "./WebGPU";
import { Camera } from "./Camera";
import { MissingCanvasParentElementException } from "./Exception/MissingCanvasParentElementException";
import { RenderPassHandler } from "./Objects/RenderPassHandler";

export class Renderer
{
    private device: GPUDevice;

    private canvas: Canvas;

    private camera: Camera;

    private renderPassHandler: RenderPassHandler|null = null;

    private frameId: number = -1;

    private started: boolean = false;

    private canvasDisplayed: boolean = false;

    public constructor(webGPU: WebGPU, camera: Camera)
    {
        webGPU.init();

        this.device = webGPU.getDevice(),
        this.canvas = webGPU.getCanvas();
        this.camera = camera;
    }

    /**
     * @throws {MissingCanvasParentElementException}
     */
    public displayCanvas(): void
    {
        const parentElement: HTMLElement|null = document.querySelector(CanvasConfig.PARENT_SELECTOR);

        if (!parentElement) {
            throw new MissingCanvasParentElementException();
        }

        this.canvas.appendTo(parentElement);

        this.canvasDisplayed = true;
    }

    public start(): void
    {
        this.camera.addKeyboardEvents();

        this.frameId = requestAnimationFrame(this.renderFrame);

        this.started = true;
    }

    public stop(): void
    {
        this.camera.removeKeyboardEvents();

        cancelAnimationFrame(this.frameId);

        this.started = false;
    }

    public hasStarted(): boolean
    {
        return this.started;
    }

    public isCanvasDisplayed(): boolean
    {
        return this.canvasDisplayed;
    }

    public updateRenderPassHandler(renderPassHandler: RenderPassHandler): void
    {
        this.renderPassHandler = renderPassHandler;
    }

    private async renderFrame()
    {
        console.log('frame id: ' + this.frameId);

        if (null === this.renderPassHandler) {
            throw new Error('Missing RenderPassHandler');
        }

        const commandEncoder: GPUCommandEncoder = this.renderPassHandler.getCommandEncoder();

        this.renderPassHandler.handle();

        this.device.queue.submit([commandEncoder.finish()]);

        this.camera.move();

        this.frameId = requestAnimationFrame(this.renderFrame);
    }

    private getScaledBaseSquareData(): Float32Array
    {
        const canvasSize: CanvasSize = this.canvas.getCanvasSize();

        const canvasWidthRatio: number = SquareConfig.LENGTH / canvasSize.getWidth();
        const canvasHeightRatio: number = SquareConfig.LENGTH / canvasSize.getHeight();

        const data: Float32Array = new Float32Array(4);

        data.set([-1.0 * canvasWidthRatio, 1.0 * canvasHeightRatio], 0); // left top
        data.set([-1.0 * canvasWidthRatio, -1.0 * canvasHeightRatio], 2); // left bottom
        data.set([1.0 * canvasWidthRatio, -1.0 * canvasHeightRatio], 4); // right bottom
        data.set([1.0 * canvasWidthRatio, 1.0 * canvasHeightRatio], 6); // right top

        return data;
    }
}
