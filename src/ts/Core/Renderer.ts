import { Canvas } from "./Canvas/Canvas";
import { WebGPU } from "./WebGPU";
import { Camera } from "./Camera";

export class Renderer
{
    private readonly device: GPUDevice;
    private readonly canvas: Canvas;
    private readonly camera: Camera;
    private renderPassHandler: RenderPassHandler|null = null;
    private frameId: number = -1;
    private started: boolean = false;
    private canvasDisplayed: boolean = false;

    public constructor(webGPU: WebGPU, camera: Camera)
    {
        this.device = webGPU.device;
        this.canvas = webGPU.canvas;
        this.camera = camera;
    }

    public displayCanvas(): void
    {
        const parentElement: HTMLElement|null = document.querySelector('body');

        if (!parentElement) {
            throw new Error('Missing body element');
        }

        parentElement.appendChild(this.canvas.getCanvasElement());

        this.canvasDisplayed = true;
    }

    public start(): void
    {
        this.camera.addKeyboardEvents();

        this.frameId = requestAnimationFrame(this.renderFrame.bind(this));

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

    public setRenderPassHandler(renderPassHandler: RenderPassHandler): void
    {
        this.renderPassHandler = renderPassHandler;
    }

    private renderFrame()
    {
        if (this.renderPassHandler === null) {
            throw new Error('Missing RenderPassHandler');
        }

        const commandEncoder: GPUCommandEncoder = this.renderPassHandler.getCommandEncoder();

        this.renderPassHandler.handle();

        this.device.queue.submit([commandEncoder.finish()]);

        this.camera.move();

        this.frameId = requestAnimationFrame(this.renderFrame);
    }
}
