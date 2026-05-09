import map_editor_vert from "../../WGSL/VertexShader/map_editor.vert.wgsl";
import map_editor_frag from "../../WGSL/FragmentShader/map_editor.frag.wgsl";
import { FragmentState } from "../../WebGPU/Pipeline/State/Fragment/FragmentState";
import { PipelineLayoutDescriptor } from "../../WebGPU/Pipeline/PipelineLayoutDescriptor";
import { RenderPipelineDescriptor } from "../../WebGPU/Pipeline/RenderPipelineDescriptor";
import { ShaderModuleDescriptor } from "../../WebGPU/Pipeline/ShaderModuleDescriptor";
import { VertexState } from "../../WebGPU/Pipeline/State/Vertex/VertexState";
import { ColorTargetState } from "../../WebGPU/Pipeline/State/Fragment/ColorTargetState";
import { VertexBufferLayout } from "../../WebGPU/Pipeline/State/Vertex/VertexBufferLayout";
import { BindGroupLayoutEntry } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutEntry";
import { BindGroupLayoutDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutDescriptor";
import { RenderPassDescriptor } from "../../WebGPU/RenderPass/RenderPassDescriptor";
import { RenderPassColorAttachment } from "../../WebGPU/RenderPass/RenderPassColorAttachment";
import { ResourceLoader } from "../ResourceLoader";
import { SamplerDescriptor } from "../../WebGPU/Sampler/SamplerDescriptor";
import { BindGroupDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupDescriptor";
import { CopyExternalImageSourceInfo } from "../../WebGPU/Texture/CopyExternalImageSourceInfo";
import { CopyExternalImageDestInfo } from "../../WebGPU/Texture/CopyExternalImageDestInfo";
import { Extent3DDict } from "../../WebGPU/Texture/Extent3DDict";
import { Origin3DDict } from "../../WebGPU/Texture/Origin3DDict";
import { SpritesheetConfig } from "../Config/SpritesheetConfig";
import { TextureDescriptor } from "../../WebGPU/Texture/TextureDescriptor";
import { TextureViewDescriptor } from "../../WebGPU/Texture/TextureViewDescriptor";
import { SamplerBindingLayout } from "../../WebGPU/Sampler/SamplerBindingLayout";
import { TextureBindingLayout } from "../../WebGPU/Texture/TextureBindingLayout";
import { Camera } from "../Camera";
import { StagedBuffer } from "../StagedBuffer";
import { MasterBufferDescriptor } from "../../WebGPU/Buffer/MasterBufferDescriptor";
import { BufferBindingLayout } from "../../WebGPU/Buffer/BufferBindingLayout";

export class MapEditorHandler
{
    private readonly device: GPUDevice;
    private readonly resourceLoader: ResourceLoader;
    private readonly context: GPUCanvasContext;
    private readonly camera: Camera;
    private readonly cameraBuffer: StagedBuffer;

    public constructor(device: GPUDevice, resourceLoader: ResourceLoader, context: GPUCanvasContext, camera: Camera)
    {
        this.device = device;
        this.resourceLoader = resourceLoader;
        this.context = context;
        this.camera = camera;
        this.cameraBuffer = new StagedBuffer(
            'buffer_camera_map_editor',
            this.device,
            new MasterBufferDescriptor('master_buffer_camera_map_editor', this.getCameraData().byteLength, GPUBufferUsage.UNIFORM),
        );
    }

    public async draw(commandEncoder: GPUCommandEncoder): Promise<void>
    {
        this.cameraBuffer.update(this.getCameraData(), commandEncoder);

        const renderPassColorAttachment: RenderPassColorAttachment = new RenderPassColorAttachment(this.context.getCurrentTexture());
        const renderPassDescriptor: GPURenderPassDescriptor = new RenderPassDescriptor(
            'render_pass_map_editor',
            [renderPassColorAttachment],
        );
        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        const bindGroupLayout: GPUBindGroupLayout = this.createBindGroupLayout();
        
        renderPass.setBindGroup(0, await this.getBindGroup(bindGroupLayout));
        renderPass.setPipeline(await this.getPipeline(bindGroupLayout));
        // renderPass.drawIndexed(?);
        // renderPass.setIndexBuffer(?);
        // renderPass.setVertexBuffer(?);
        renderPass.end();
    }

    private async getBindGroup(layout: GPUBindGroupLayout): Promise<GPUBindGroup>
    {
        const sampler: GPUSampler = this.device.createSampler(new SamplerDescriptor('sampler_map_editor'));

        return this.device.createBindGroup(new BindGroupDescriptor(
            'bind_group_map_editor',
            layout,
            [
                { binding: 0, resource: this.cameraBuffer.masterBuffer },
                { binding: 1, resource: await this.getSpritesheetView() },
                { binding: 2, resource: sampler },
            ],
        ));
    }

    private getCameraData(): Uint32Array
    {
        return new Uint32Array([this.camera.getX(), this.camera.getY()]);
    }

    private async getSpritesheetView(): Promise<GPUTextureView>
    {
        const width = SpritesheetConfig.COLUMNS * SpritesheetConfig.IMAGE_SIZE;
        const height = SpritesheetConfig.ROWS * SpritesheetConfig.IMAGE_SIZE;
        const spritesheetsCount = 3;

        const texture = this.device.createTexture(new TextureDescriptor(
            'texture_spritesheets',
            new Extent3DDict(width, height, spritesheetsCount),
            'rgba8unorm',
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        ));

        const spritesheets: Record<uint, ImageBitmap> = await this.resourceLoader.getSpritesheets();
        let textureLayer: uint = 0; 

        for (const image of Object.values(spritesheets)) {
            this.device.queue.copyExternalImageToTexture(
                new CopyExternalImageSourceInfo(image),
                new CopyExternalImageDestInfo(texture, new Origin3DDict(0, 0, textureLayer)),
                new Extent3DDict(width, height),
            );

            textureLayer++;
        }

        return texture.createView(new TextureViewDescriptor(
            'texture_view_spritesheets',
            'rgba8unorm',
            '2d-array',
        ));
    }

    private createBindGroupLayout(): GPUBindGroupLayout
    {
        const samplerLayout: GPUSamplerBindingLayout = new SamplerBindingLayout('non-filtering');
        const textureLayout: GPUTextureBindingLayout = new TextureBindingLayout('float', '2d-array');
        const bufferLayout: GPUBufferBindingLayout = new BufferBindingLayout('uniform');
        const bindGroupLayoutEntry: GPUBindGroupLayoutEntry = new BindGroupLayoutEntry(
            0,
            GPUShaderStage.VERTEX,
            bufferLayout,
            samplerLayout,
            textureLayout,
        );
        const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = new BindGroupLayoutDescriptor(
            'bind_group_layout_map_editor',
            [bindGroupLayoutEntry]
        );

        return this.device.createBindGroupLayout(bindGroupLayoutDescriptor);
    }

    private async getPipeline(bindGroupLayout: GPUBindGroupLayout): Promise<GPURenderPipeline>
    {
        const pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = new PipelineLayoutDescriptor('pipeline_layout_map_editor', [bindGroupLayout]);
        const pipelineLayout: GPUPipelineLayout = this.device.createPipelineLayout(pipelineLayoutDescriptor);
        const vertexState: GPUVertexState = this.createVertexState();
        const fragmentState: GPUFragmentState = this.createFragmentState();
        const renderPipelineDescriptor: GPURenderPipelineDescriptor = new RenderPipelineDescriptor(
            'pipeline_map_editor',
            pipelineLayout,
            vertexState,
            fragmentState,
        );

        return this.device.createRenderPipelineAsync(renderPipelineDescriptor);
    }

    private createVertexState(): GPUVertexState
    {
        const vertexShaderModuleDescriptor: GPUShaderModuleDescriptor = new ShaderModuleDescriptor('vs_module_descriptor_map_editor', map_editor_vert);
        const vertexShaderModule: GPUShaderModule = this.device.createShaderModule(vertexShaderModuleDescriptor);

        return new VertexState(
            vertexShaderModule,
            'main',
        );
    }

    private createFragmentState(): GPUFragmentState
    {
        const fragmentShaderModuleDescriptor: GPUShaderModuleDescriptor = new ShaderModuleDescriptor('fs_module_descriptor_map_editor', map_editor_frag);
        const fragmentShaderModule: GPUShaderModule = this.device.createShaderModule(fragmentShaderModuleDescriptor);

        return new FragmentState(
            fragmentShaderModule,
            'main',
            [new ColorTargetState(navigator.gpu.getPreferredCanvasFormat())],
        );
    }
}
