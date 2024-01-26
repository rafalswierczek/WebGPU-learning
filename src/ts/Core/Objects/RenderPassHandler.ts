import { TextureConfig } from "../../WebGPU/Config/TextureConfig";
import { RenderPassColorAttachment } from "../../WebGPU/RenderPass/RenderPassColorAttachment";
import { RenderPassDescriptor } from "../../WebGPU/RenderPass/RenderPassDescriptor";
import { Extent3DDict } from "../../WebGPU/Texture/Extent3DDict";
import { TextureDescriptor } from "../../WebGPU/Texture/TextureDescriptor";
import { TextureViewDescriptor } from "../../WebGPU/Texture/TextureViewDescriptor";

export abstract class RenderPassHandler
{
    private device: GPUDevice;

    private commandEncoder: GPUCommandEncoder;
    
    public constructor(device: GPUDevice)
    {
        this.device = device;
        this.commandEncoder = device.createCommandEncoder();
    }

    public getCommandEncoder(): GPUCommandEncoder
    {
        return this.commandEncoder;
    }

    public abstract handle(): void;

    protected async createRenderPassEncoder(image: HTMLImageElement): Promise<GPURenderPassEncoder>
    {
        const imageBitmap = await createImageBitmap(image);

        const textureDescriptor: GPUTextureDescriptor = new TextureDescriptor(
            'texture_descriptor_'+image.src,
            new Extent3DDict(imageBitmap.width, imageBitmap.height),
            TextureConfig.FORMAT,
            TextureConfig.USAGE,
            TextureConfig.SAMPLE_COUNT
        );

        const texture = this.device.createTexture(textureDescriptor);

        const textureViewDescriptor: GPUTextureViewDescriptor = new TextureViewDescriptor(
            'texture_view_descriptor_'+image.src,
            TextureConfig.FORMAT
        )

        const textureView: GPUTextureView = texture.createView(textureViewDescriptor);

        const renderPassColorAttachment: RenderPassColorAttachment = new RenderPassColorAttachment(
            textureView
        );

        const renderPassDescriptor: GPURenderPassDescriptor = new RenderPassDescriptor(
            'render_pass_'+image.src,
            [renderPassColorAttachment]
        );

        return this.commandEncoder.beginRenderPass(renderPassDescriptor);
    }
}
