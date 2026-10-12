import thumbnail_vert from "../../WGSL/VertexShader/thumbnail.vert.wgsl";
import thumbnail_frag from "../../WGSL/FragmentShader/thumbnail.frag.wgsl";
import { BindGroupDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupDescriptor";
import { BindGroupEntry } from "../../WebGPU/Pipeline/BindGroup/BindGroupEntry";
import { BindGroupLayoutDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutDescriptor";
import { BindGroupLayoutEntry } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutEntry";
import { BlendComponent } from "../../WebGPU/Pipeline/State/Fragment/BlendComponent";
import { BlendState } from "../../WebGPU/Pipeline/State/Fragment/BlendState";
import { BufferBinding } from "../../WebGPU/Buffer/BufferBinding";
import { BufferBindingLayout } from "../../WebGPU/Buffer/BufferBindingLayout";
import { BufferDescriptor } from "../../WebGPU/Buffer/BufferDescriptor";
import { ColorTargetState } from "../../WebGPU/Pipeline/State/Fragment/ColorTargetState";
import { FragmentState } from "../../WebGPU/Pipeline/State/Fragment/FragmentState";
import { PipelineLayoutDescriptor } from "../../WebGPU/Pipeline/PipelineLayoutDescriptor";
import { RenderPipelineDescriptor } from "../../WebGPU/Pipeline/RenderPipelineDescriptor";
import { SamplerBindingLayout } from "../../WebGPU/Sampler/SamplerBindingLayout";
import { ShaderModuleDescriptor } from "../../WebGPU/Pipeline/ShaderModuleDescriptor";
import { TextureBindingLayout } from "../../WebGPU/Texture/TextureBindingLayout";
import { ThumbnailPainter } from "../Ui/ThumbnailPainter";
import { TileTextureAtlas } from "./TileTextureAtlas";
import { VertexState } from "../../WebGPU/Pipeline/State/Vertex/VertexState";

/**
 * Miniatury tekstur w interfejsie: lista w zakładce Brush i podgląd wybranej tekstury.
 *
 * Osobny pipeline od OverlayPass, bo tamten próbkuje atlas fontu, a ten tablicę kafli.
 * Rysuje się po interfejsie, więc miniatury leżą na tle panelu, a nie pod nim.
 *
 * Skalowanie robi sampler: w tablicy tekstura ma zawsze TileTextureConfig.SIZE, a na ekranie
 * dostaje tyle pikseli, ile poda wywołujący - dzięki temu rozmiar miniatury jest w configu.
 */
export class ThumbnailPass implements ThumbnailPainter
{
    private static readonly MAX_THUMBNAILS: uint = 1024;
    private static readonly FLOATS_PER_THUMBNAIL: uint = 8; // rect 4 + layer 1 + 3 na wyrównanie do 16 B
    private static readonly VERTEX_COUNT: uint = 6;

    private readonly device: GPUDevice;
    private readonly atlas: TileTextureAtlas;
    private readonly pipeline: GPURenderPipeline;
    private readonly bindGroup: GPUBindGroup;
    private readonly buffer: GPUBuffer;
    private readonly data: Float32Array<ArrayBuffer>;
    private readonly layers: Uint32Array<ArrayBuffer>;

    private count: uint = 0;

    private constructor(
        device: GPUDevice,
        atlas: TileTextureAtlas,
        pipeline: GPURenderPipeline,
        bindGroup: GPUBindGroup,
        buffer: GPUBuffer,
    ) {
        this.device = device;
        this.atlas = atlas;
        this.pipeline = pipeline;
        this.bindGroup = bindGroup;
        this.buffer = buffer;

        const raw: ArrayBuffer = new ArrayBuffer(
            ThumbnailPass.MAX_THUMBNAILS * ThumbnailPass.FLOATS_PER_THUMBNAIL * Float32Array.BYTES_PER_ELEMENT
        );

        // ten sam bufor widziany jako float (prostokąt) i jako u32 (warstwa tekstury)
        this.data = new Float32Array(raw);
        this.layers = new Uint32Array(raw);
    }

    public static async create(
        device: GPUDevice,
        format: GPUTextureFormat,
        frameBindGroupLayout: GPUBindGroupLayout,
        textures: TileTextureAtlas,
    ): Promise<ThumbnailPass> {
        const buffer: GPUBuffer = device.createBuffer(new BufferDescriptor(
            'buffer_thumbnails',
            ThumbnailPass.MAX_THUMBNAILS * ThumbnailPass.FLOATS_PER_THUMBNAIL * Float32Array.BYTES_PER_ELEMENT,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            false,
        ));

        const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout(new BindGroupLayoutDescriptor(
            'bind_group_layout_thumbnails',
            [
                new BindGroupLayoutEntry(0, GPUShaderStage.VERTEX, new BufferBindingLayout('read-only-storage')),
                new BindGroupLayoutEntry(1, GPUShaderStage.FRAGMENT, undefined, undefined, new TextureBindingLayout('float', '2d')),
                new BindGroupLayoutEntry(2, GPUShaderStage.FRAGMENT, undefined, new SamplerBindingLayout('filtering')),
            ],
        ));

        const bindGroup: GPUBindGroup = device.createBindGroup(new BindGroupDescriptor(
            'bind_group_thumbnails',
            bindGroupLayout,
            [
                new BindGroupEntry(0, new BufferBinding(buffer)),
                new BindGroupEntry(1, textures.getView()),
                new BindGroupEntry(2, textures.getSampler()),
            ],
        ));

        // obiekty mają kanał alpha, więc miniatura musi się mieszać z tłem panelu
        const blend: GPUBlendState = new BlendState(
            new BlendComponent('add', 'src-alpha', 'one-minus-src-alpha'),
            new BlendComponent('add', 'one', 'one-minus-src-alpha'),
        );

        const pipeline: GPURenderPipeline = await device.createRenderPipelineAsync(new RenderPipelineDescriptor(
            'pipeline_thumbnails',
            device.createPipelineLayout(
                new PipelineLayoutDescriptor('pipeline_layout_thumbnails', [frameBindGroupLayout, bindGroupLayout])
            ),
            new VertexState(
                device.createShaderModule(new ShaderModuleDescriptor('vs_module_thumbnails', thumbnail_vert)),
                'main',
            ),
            new FragmentState(
                device.createShaderModule(new ShaderModuleDescriptor('fs_module_thumbnails', thumbnail_frag)),
                'main',
                [new ColorTargetState(format, blend)],
            ),
        ));

        return new ThumbnailPass(device, textures, pipeline, bindGroup, buffer);
    }

    public begin(): void
    {
        this.count = 0;
    }

    public drawTexture(x: uint, y: uint, width: uint, height: uint, textureId: uint): void
    {
        const slot: int = this.atlas.getSlot(textureId);

        if (this.count >= ThumbnailPass.MAX_THUMBNAILS || slot === -1) {
            return;
        }

        const offset: uint = this.count * ThumbnailPass.FLOATS_PER_THUMBNAIL;

        this.data[offset] = x;
        this.data[offset + 1] = y;
        this.data[offset + 2] = width;
        this.data[offset + 3] = height;
        this.layers[offset + 4] = slot;

        this.count++;
    }

    public end(): void
    {
        if (this.count === 0) {
            return;
        }

        this.device.queue.writeBuffer(
            this.buffer,
            0,
            this.data,
            0,
            this.count * ThumbnailPass.FLOATS_PER_THUMBNAIL,
        );
    }

    public draw(renderPass: GPURenderPassEncoder, frameBindGroup: GPUBindGroup): void
    {
        if (this.count === 0) {
            return;
        }

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, frameBindGroup);
        renderPass.setBindGroup(1, this.bindGroup);
        renderPass.draw(ThumbnailPass.VERTEX_COUNT, this.count);
    }
}
