import { RenderPassHandler } from "../RenderPassHandler";
import { GridPipeline } from "./GridPipeline";

export class GridRenderPassHandler extends RenderPassHandler
{
    private pipeline: GridPipeline;

    private image: HTMLImageElement;

    public constructor(
        device: GPUDevice,
        pipeline: GridPipeline,
        image: HTMLImageElement,
    ) {
        super(device);

        this.pipeline = pipeline;
        this.image = image;
    }

    public async handle(): Promise<void>
    {
        const renderPassEncoder: GPURenderPassEncoder = await this.createRenderPassEncoder(this.image);

        renderPassEncoder.setPipeline(await this.pipeline.create());
    }
}
