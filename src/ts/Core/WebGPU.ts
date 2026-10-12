import { CanvasConfiguration } from '../WebGPU/Canvas/CanvasConfiguration';
import { Canvas } from './Canvas/Canvas';
import { ResolutionConfig } from './Config/ResolutionConfig';
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
        // rozdzielczosc domyslna, a nie docelowa: ustawienia siedza w bazie, ktorej jeszcze nie ma.
        // Application podmieni ja na wybrana, gdy tylko wczyta ustawienia
        const size: { width: uint, height: uint } = ResolutionConfig.getDefault();
        const canvas: Canvas = new Canvas(size.width, size.height, 'border: 1px solid black;');
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
