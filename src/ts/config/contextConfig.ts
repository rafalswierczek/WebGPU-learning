import { ContextSize } from "../object/contextSize";
import { CanvasConfiguration } from "../object/canvasConfiguration";

export class ContextConfig {
    private context: GPUCanvasContext;
    private canvasConfiguration: CanvasConfiguration;

    constructor(
        adapter: GPUAdapter,
        device: GPUDevice,
        canvasElement: HTMLCanvasElement,
        context: GPUCanvasContext
    ) {
        const contextSize = new ContextSize(
            canvasElement.clientWidth * window.devicePixelRatio || 1,
            canvasElement.clientHeight * window.devicePixelRatio || 1
        );

        const contextFormat = context.getPreferredFormat(adapter);

        this.canvasConfiguration = new CanvasConfiguration(
            device,
            contextFormat,
            contextSize
        );

        this.context = context;
    }

    configure() {
        this.context.configure(this.canvasConfiguration);
    }

    getCanvasConfiguration(): CanvasConfiguration {
        return this.canvasConfiguration;
    }
}