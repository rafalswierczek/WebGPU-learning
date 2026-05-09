import map_editor_vert from "../../WGSL/VertexShader/map_editor.vert.wgsl";
import map_editor_frag from "../../WGSL/FragmentShader/map_editor.frag.wgsl";
import { FragmentState } from "../../WebGPU/Pipeline/State/Fragment/FragmentState";
import { PipelineLayoutDescriptor } from "../../WebGPU/Pipeline/PipelineLayoutDescriptor";
import { RenderPipelineDescriptor } from "../../WebGPU/Pipeline/RenderPipelineDescriptor";
import { ShaderModuleDescriptor } from "../../WebGPU/Pipeline/ShaderModuleDescriptor";
import { VertexState } from "../../WebGPU/Pipeline/State/Vertex/VertexState";
import { ColorTargetState } from "../../WebGPU/Pipeline/State/Fragment/ColorTargetState";
import { VertexBufferLayout } from "../../WebGPU/Pipeline/State/Vertex/VertexBufferLayout";
import { BufferBindingLayout } from "../../WebGPU/Buffer/BufferBindingLayout";
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
import { BufferDescriptor } from "../../WebGPU/Buffer/BufferDescriptor";
import { Camera } from "../Camera";

export class MapEditorHandler
{
    private readonly device: GPUDevice;
    private readonly resourceLoader: ResourceLoader;
    private readonly context: GPUCanvasContext;
    private readonly camera: Camera;

    public constructor(device: GPUDevice, resourceLoader: ResourceLoader, context: GPUCanvasContext, camera: Camera)
    {
        this.device = device;
        this.resourceLoader = resourceLoader;
        this.context = context;
        this.camera = camera;
    }

    public async create(): Promise<void>
    {
        const renderPassColorAttachment: RenderPassColorAttachment = new RenderPassColorAttachment(this.context.getCurrentTexture());
        const renderPassDescriptor: GPURenderPassDescriptor = new RenderPassDescriptor(
            'render_pass_map_editor',
            [renderPassColorAttachment],
        );
        const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();
        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        
        renderPass.setBindGroup(0, await this.getBindGroup());
        renderPass.setPipeline(await this.getPipeline());
        // renderPass.drawIndexed(?);
        // renderPass.setIndexBuffer(?);
        // renderPass.setVertexBuffer(?);
        renderPass.end();
    }

    private async getBindGroup(): Promise<GPUBindGroup>
    {
        const textureView: GPUTextureView = await this.getView();
        const sampler: GPUSampler = this.device.createSampler(new SamplerDescriptor(
            'sampler_map_editor',
        ));
        

        return this.device.createBindGroup(new BindGroupDescriptor(
            'bind_group_map_editor',
            this.createBindGroupLayout(),
            [
                { binding: 0, resource: textureView },
                { binding: 1, resource: sampler },
            ],
        ));
    }

    private getCameraBuffer(): GPUBuffer
    {
        const data: Uint32Array = new Uint32Array([this.camera.getX(), this.camera.getY()]);
        const cameraBuffer: GPUBuffer = this.device.createBuffer(new BufferDescriptor(
            'camera_buffer_map_editor',
            data.byteLength,
            GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
            true,
        ));
    }

    private async getView(): Promise<GPUTextureView>
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
        const bindGroupLayoutEntry: GPUBindGroupLayoutEntry = new BindGroupLayoutEntry(
            0,
            GPUShaderStage.VERTEX,
            undefined,
            samplerLayout,
            textureLayout,
        );
        const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = new BindGroupLayoutDescriptor(
            'bind_group_layout_map_editor',
            [bindGroupLayoutEntry]
        );

        return this.device.createBindGroupLayout(bindGroupLayoutDescriptor);
    }

    private async getPipeline(): Promise<GPURenderPipeline>
    {
        const pipelineLayout: GPUPipelineLayout = this.createPipelineLayout();
        const vertexState: GPUVertexState = this.createVertexState();
        const fragmentState: GPUFragmentState = this.createFragmentState();
        const renderPipelineDescriptor: GPURenderPipelineDescriptor = new RenderPipelineDescriptor(
            'pipeline_descriptor_map_editor',
            pipelineLayout,
            vertexState,
            fragmentState,
        );

        return this.device.createRenderPipelineAsync(renderPipelineDescriptor);
    }

    private createPipelineLayout(): GPUPipelineLayout
    {
        const bindGroupLayout: GPUBindGroupLayout = this.mapEditorBindGroup.createBindGroupLayout();

        const pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = new PipelineLayoutDescriptor(
            'pipeline_layout_descriptor_map_editor',
            [bindGroupLayout],
        );

        return this.device.createPipelineLayout(pipelineLayoutDescriptor);
    }

    private createVertexState(): GPUVertexState
    {
        const vertexShaderModuleDescriptor: GPUShaderModuleDescriptor = new ShaderModuleDescriptor('vs_module_descriptor_map_editor', map_editor_vert);
        const vertexShaderModule: GPUShaderModule = this.device.createShaderModule(vertexShaderModuleDescriptor);

        return new VertexState(
            vertexShaderModule,
            'main',
            [new VertexBufferLayout()],
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
