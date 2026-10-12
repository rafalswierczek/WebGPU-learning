import overlay_vert from "../../WGSL/VertexShader/overlay.vert.wgsl";
import overlay_frag from "../../WGSL/FragmentShader/overlay.frag.wgsl";
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
import { CopyExternalImageDestInfo } from "../../WebGPU/Texture/CopyExternalImageDestInfo";
import { CopyExternalImageSourceInfo } from "../../WebGPU/Texture/CopyExternalImageSourceInfo";
import { Extent3DDict } from "../../WebGPU/Texture/Extent3DDict";
import { FontAtlas } from "../Debug/FontAtlas";
import { FragmentState } from "../../WebGPU/Pipeline/State/Fragment/FragmentState";
import { PipelineLayoutDescriptor } from "../../WebGPU/Pipeline/PipelineLayoutDescriptor";
import { RenderPipelineDescriptor } from "../../WebGPU/Pipeline/RenderPipelineDescriptor";
import { SamplerBindingLayout } from "../../WebGPU/Sampler/SamplerBindingLayout";
import { SamplerDescriptor } from "../../WebGPU/Sampler/SamplerDescriptor";
import { ShaderModuleDescriptor } from "../../WebGPU/Pipeline/ShaderModuleDescriptor";
import { TextureBindingLayout } from "../../WebGPU/Texture/TextureBindingLayout";
import { TextureDescriptor } from "../../WebGPU/Texture/TextureDescriptor";
import { TextureViewDescriptor } from "../../WebGPU/Texture/TextureViewDescriptor";
import { UiConfig } from "../Config/UiConfig";
import { UiPainter } from "../Ui/UiPainter";
import { VertexState } from "../../WebGPU/Pipeline/State/Vertex/VertexState";

/**
 * Rysuje cały interfejs na GPU: tła paneli, ramki i każdy znak to jedna instancja tego samego
 * kwadratu. Całe UI schodzi jednym draw callem z jednego bufora storage.
 *
 * Klasa implementuje UiPainter, więc widgety (okno kontekstowe, pole tekstowe, panel debugowy)
 * nie wiedzą nic o WebGPU i przeniosą się do gry bez zmian.
 */
export class OverlayPass implements UiPainter
{
    private static readonly MAX_QUADS: uint = 4096;
    private static readonly FLOATS_PER_QUAD: uint = 12; // rect 4 + uv 4 + color 4
    private static readonly VERTEX_COUNT: uint = 6;

    private readonly device: GPUDevice;
    private readonly pipeline: GPURenderPipeline;
    private readonly bindGroup: GPUBindGroup;
    private readonly quadBuffer: GPUBuffer;
    private readonly atlas: FontAtlas;
    private readonly quadData: Float32Array<ArrayBuffer>;

    private quadCount: uint = 0;

    /** Calkowita skala tekstu; przy 2 atlas jest powielany pikselowo, wiec zostaje ostry */
    private textScale: uint = 1;

    private constructor(
        device: GPUDevice,
        pipeline: GPURenderPipeline,
        bindGroup: GPUBindGroup,
        quadBuffer: GPUBuffer,
        atlas: FontAtlas,
    ) {
        this.device = device;
        this.pipeline = pipeline;
        this.bindGroup = bindGroup;
        this.quadBuffer = quadBuffer;
        this.atlas = atlas;
        this.quadData = new Float32Array(OverlayPass.MAX_QUADS * OverlayPass.FLOATS_PER_QUAD);
    }

    public static async create(
        device: GPUDevice,
        format: GPUTextureFormat,
        frameBindGroupLayout: GPUBindGroupLayout,
    ): Promise<OverlayPass> {
        const atlas: FontAtlas = await FontAtlas.create();

        const texture: GPUTexture = device.createTexture(new TextureDescriptor(
            'texture_font_atlas',
            new Extent3DDict(atlas.canvas.width, atlas.canvas.height),
            'rgba8unorm',
            // copyExternalImageToTexture wymaga na docelowej teksturze RENDER_ATTACHMENT
            GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        ));

        device.queue.copyExternalImageToTexture(
            new CopyExternalImageSourceInfo(atlas.canvas),
            new CopyExternalImageDestInfo(texture),
            new Extent3DDict(atlas.canvas.width, atlas.canvas.height),
        );

        const quadBuffer: GPUBuffer = device.createBuffer(new BufferDescriptor(
            'buffer_overlay_quads',
            OverlayPass.MAX_QUADS * OverlayPass.FLOATS_PER_QUAD * Float32Array.BYTES_PER_ELEMENT,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            false,
        ));

        const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout(new BindGroupLayoutDescriptor(
            'bind_group_layout_overlay',
            [
                new BindGroupLayoutEntry(0, GPUShaderStage.VERTEX, new BufferBindingLayout('read-only-storage')),
                new BindGroupLayoutEntry(1, GPUShaderStage.FRAGMENT, undefined, undefined, new TextureBindingLayout('float', '2d')),
                new BindGroupLayoutEntry(2, GPUShaderStage.FRAGMENT, undefined, new SamplerBindingLayout('filtering')),
            ],
        ));

        const bindGroup: GPUBindGroup = device.createBindGroup(new BindGroupDescriptor(
            'bind_group_overlay',
            bindGroupLayout,
            [
                new BindGroupEntry(0, new BufferBinding(quadBuffer)),
                new BindGroupEntry(1, texture.createView(new TextureViewDescriptor('texture_view_font_atlas'))),
                new BindGroupEntry(2, device.createSampler(new SamplerDescriptor('sampler_font_atlas'))),
            ],
        ));

        const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout(
            new PipelineLayoutDescriptor('pipeline_layout_overlay', [frameBindGroupLayout, bindGroupLayout])
        );

        const vertexModule: GPUShaderModule = device.createShaderModule(
            new ShaderModuleDescriptor('vs_module_overlay', overlay_vert)
        );
        const fragmentModule: GPUShaderModule = device.createShaderModule(
            new ShaderModuleDescriptor('fs_module_overlay', overlay_frag)
        );

        const blend: GPUBlendState = new BlendState(
            new BlendComponent('add', 'src-alpha', 'one-minus-src-alpha'),
            new BlendComponent('add', 'one', 'one-minus-src-alpha'),
        );

        const pipeline: GPURenderPipeline = await device.createRenderPipelineAsync(new RenderPipelineDescriptor(
            'pipeline_overlay',
            pipelineLayout,
            new VertexState(vertexModule, 'main'),
            new FragmentState(fragmentModule, 'main', [new ColorTargetState(format, blend)]),
        ));

        return new OverlayPass(device, pipeline, bindGroup, quadBuffer, atlas);
    }

    /** Początek klatki UI: kolejność rysowania decyduje o tym, co jest na wierzchu. */
    public begin(): void
    {
        this.quadCount = 0;
    }

    /**
     * Skala tekstu ustawiana przez ekran. Cały układ interfejsu liczy się z getCharWidth()
     * i getLineHeight(), więc zmiana skali przesuwa wszystko automatycznie.
     */
    public setTextScale(scale: uint): void
    {
        this.textScale = Math.max(1, Math.round(scale));
    }

    public end(): void
    {
        if (this.quadCount === 0) {
            return;
        }

        this.device.queue.writeBuffer(
            this.quadBuffer,
            0,
            this.quadData,
            0,
            this.quadCount * OverlayPass.FLOATS_PER_QUAD,
        );
    }

    public drawRect(x: uint, y: uint, width: uint, height: uint, color: colorRgba): void
    {
        this.pushQuad(x, y, width, height, this.atlas.getSolidUv(), color);
    }

    public drawBorder(x: uint, y: uint, width: uint, height: uint, thickness: uint, color: colorRgba): void
    {
        this.drawRect(x, y, width, thickness, color);
        this.drawRect(x, y + height - thickness, width, thickness, color);
        this.drawRect(x, y, thickness, height, color);
        this.drawRect(x + width - thickness, y, thickness, height, color);
    }

    public drawText(x: uint, y: uint, text: string, color: colorRgba): void
    {
        let cursor: uint = x;

        for (const character of text) {
            const advance: uint = this.atlas.getAdvance(character) * this.textScale;

            // spacja nie ma tuszu, ale ma szerokosc - pomijamy rysowanie, nie przesuniecie
            if (character !== ' ') {
                this.pushQuad(
                    cursor,
                    y,
                    advance,
                    this.getGlyphHeight(),
                    this.atlas.getCellUv(this.atlas.getCellIndex(character)),
                    color,
                );
            }

            cursor += advance;
        }
    }

    public measureText(text: string): uint
    {
        let width: uint = 0;

        for (const character of text) {
            width += this.atlas.getAdvance(character) * this.textScale;
        }

        return width;
    }

    /**
     * Szerokosc odniesienia dla ukladu kolumnowego, a NIE szerokosc kazdego znaku - font jest
     * proporcjonalny. Do mierzenia tekstu sluzy measureText().
     */
    public getCharWidth(): uint
    {
        return this.atlas.getAdvance('M') * this.textScale;
    }

    /** Wysokosc wiersza razem z odstepem, ktory rozsuwa kolejne linie */
    public getLineHeight(): uint
    {
        return this.getGlyphHeight() + UiConfig.LINE_SPACING_PX;
    }

    /** Sam glif, bez odstepu - tyle zajmuje litera na ekranie */
    private getGlyphHeight(): uint
    {
        return this.atlas.cellHeight * this.textScale;
    }

    public draw(renderPass: GPURenderPassEncoder, frameBindGroup: GPUBindGroup): void
    {
        if (this.quadCount === 0) {
            return;
        }

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, frameBindGroup);
        renderPass.setBindGroup(1, this.bindGroup);
        renderPass.draw(OverlayPass.VERTEX_COUNT, this.quadCount);
    }

    private pushQuad(
        x: uint,
        y: uint,
        width: uint,
        height: uint,
        uv: [float, float, float, float],
        color: colorRgba,
    ): void {
        if (this.quadCount >= OverlayPass.MAX_QUADS) {
            return; // ciche obcięcie jest lepsze niż wyjątek w środku klatki
        }

        const offset: uint = this.quadCount * OverlayPass.FLOATS_PER_QUAD;

        this.quadData[offset] = x;
        this.quadData[offset + 1] = y;
        this.quadData[offset + 2] = width;
        this.quadData[offset + 3] = height;

        this.quadData[offset + 4] = uv[0];
        this.quadData[offset + 5] = uv[1];
        this.quadData[offset + 6] = uv[2];
        this.quadData[offset + 7] = uv[3];

        this.quadData[offset + 8] = color[0];
        this.quadData[offset + 9] = color[1];
        this.quadData[offset + 10] = color[2];
        this.quadData[offset + 11] = color[3];

        this.quadCount++;
    }
}
