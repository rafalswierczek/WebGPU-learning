import { Canvas } from './Canvas/Canvas';
import { CanvasConfigurationFactory } from './Factory/CanvasConfigurationFactory';
import { CanvasFactory } from './Factory/CanvasFactory';
import { InvalidAdapterException } from './Exception/InvalidAdapterException';
import { InvalidCanvasContextException } from "./Exception/InvalidCanvasContextException";
import { MissingCanvasParentElementException } from "./Exception/MissingCanvasParentElementException";

export class WebGPU
{
    private adapter: GPUAdapter|null = null;

    private device: GPUDevice|null = null;

    private context: GPUCanvasContext|null = null;

    private canvasConfiguration: GPUCanvasConfiguration|null = null;

    private canvas: Canvas;

    public constructor()
    {
        this.canvas = CanvasFactory.create();
    }

    /**
     * Create canvas element and configure context
     * 
     * @throws {InvalidAdapterException}
     * @throws {MissingCanvasParentElementException}
     * @throws {InvalidCanvasContextException}
     */
    public async init(): Promise<void>
    {
        const adapter: GPUAdapter = await this.requestAdapter();

        const device: GPUDevice = await this.requestDevice(adapter);

        const canvasConfiguration: GPUCanvasConfiguration = CanvasConfigurationFactory.create(device);

        const context: GPUCanvasContext = this.canvas.getContext();

        context.configure(canvasConfiguration);

        this.adapter = adapter;
        this.device = device;
        this.canvasConfiguration = canvasConfiguration;
        this.context = context;
    }

    public getCanvas(): Canvas
    {
        return this.canvas;
    }

    public getAdapter(): GPUAdapter
    {
        if (!this.adapter) {
            throw new Error('You have to call init method in order to get adapter');
        }

        return this.adapter;
    }

    public getDevice(): GPUDevice
    {
        if (!this.device) {
            throw new Error('You have to call init method in order to get device');
        }

        return this.device;
    }

    public getContext(): GPUCanvasContext
    {
        if (!this.context) {
            throw new Error('You have to call init method in order to get context');
        }

        return this.context;
    }

    public getCanvasConfiguration(): GPUCanvasConfiguration
    {
        if (!this.canvasConfiguration) {
            throw new Error('You have to call init method in order to get canvas configuration');
        }

        return this.canvasConfiguration;
    }

    /**
     * @throws {InvalidAdapterException}
     */
    public async requestAdapter(): Promise<GPUAdapter>
    {
        const adapter: GPUAdapter|null = await navigator.gpu.requestAdapter();

        if (!adapter) {
            throw new InvalidAdapterException();
        }

        return adapter;
    }

    public async requestDevice(adapter: GPUAdapter): Promise<GPUDevice>
    {
        return await adapter.requestDevice();
    }
}
