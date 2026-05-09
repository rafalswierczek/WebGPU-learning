import { CanvasConfiguration } from '../WebGPU/Canvas/CanvasConfiguration';
import { Canvas } from './Canvas/Canvas';
import { CameraConfig } from './Config/CameraConfig';
import { InvalidAdapterException } from './Exception/InvalidAdapterException';
import { InvalidCanvasContextException } from "./Exception/InvalidCanvasContextException";

export class WebGPU
{
    public readonly adapter: GPUAdapter;
    public readonly device: GPUDevice;
    public readonly context: GPUCanvasContext;
    public readonly canvasConfiguration: GPUCanvasConfiguration;
    public readonly canvas: Canvas;

    private constructor(
        adapter: GPUAdapter,
        device: GPUDevice,
        context: GPUCanvasContext,
        canvasConfiguration: GPUCanvasConfiguration,
        canvas: Canvas,
    ) {
        this.adapter = adapter;
        this.device = device;
        this.context = context;
        this.canvasConfiguration = canvasConfiguration;
        this.canvas = canvas;
    }

    /**
     * Create canvas element and configure context
     * 
     * @throws {InvalidAdapterException}
     * @throws {InvalidCanvasContextException}
     */
    public static async init(): Promise<WebGPU>
    {
        const adapter: GPUAdapter = await this.requestAdapter();
        const device: GPUDevice = await adapter.requestDevice();
        const canvasConfiguration: GPUCanvasConfiguration = new CanvasConfiguration(device, navigator.gpu.getPreferredCanvasFormat());
        const canvas: Canvas = new Canvas(CameraConfig.WIDTH, CameraConfig.HEIGHT, 'border: 1px solid black;');
        const context: GPUCanvasContext = canvas.getContext();
        context.configure(canvasConfiguration);

        return new WebGPU(adapter, device, context, canvasConfiguration, canvas);
    }

    /**
     * @throws {InvalidAdapterException}
     */
    private static async requestAdapter(): Promise<GPUAdapter>
    {
        const adapter: GPUAdapter|null = await navigator.gpu.requestAdapter();

        if (!adapter) {
            throw new InvalidAdapterException();
        }

        return adapter;
    }
}
