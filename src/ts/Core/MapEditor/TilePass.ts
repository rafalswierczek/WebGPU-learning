import tile_vert from "../../WGSL/VertexShader/tile.vert.wgsl";
import tile_frag from "../../WGSL/FragmentShader/tile.frag.wgsl";
import { BindGroupDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupDescriptor";
import { BindGroupEntry } from "../../WebGPU/Pipeline/BindGroup/BindGroupEntry";
import { BindGroupLayoutDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutDescriptor";
import { BindGroupLayoutEntry } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutEntry";
import { BufferBinding } from "../../WebGPU/Buffer/BufferBinding";
import { BufferBindingLayout } from "../../WebGPU/Buffer/BufferBindingLayout";
import { BufferDescriptor } from "../../WebGPU/Buffer/BufferDescriptor";
import { Camera } from "../Camera";
import { Canvas } from "../Canvas/Canvas";
import { BlendComponent } from "../../WebGPU/Pipeline/State/Fragment/BlendComponent";
import { BlendState } from "../../WebGPU/Pipeline/State/Fragment/BlendState";
import { ColorTargetState } from "../../WebGPU/Pipeline/State/Fragment/ColorTargetState";
import { FragmentState } from "../../WebGPU/Pipeline/State/Fragment/FragmentState";
import { GameMap } from "../Map/GameMap";
import { MapConfig } from "../Map/MapConfig";
import { PipelineLayoutDescriptor } from "../../WebGPU/Pipeline/PipelineLayoutDescriptor";
import { RenderPipelineDescriptor } from "../../WebGPU/Pipeline/RenderPipelineDescriptor";
import { SamplerBindingLayout } from "../../WebGPU/Sampler/SamplerBindingLayout";
import { ShaderModuleDescriptor } from "../../WebGPU/Pipeline/ShaderModuleDescriptor";
import { SquareConfig } from "../Config/SquareConfig";
import { Cell } from "../Map/Cell";
import { ObjectRegistry } from "../Map/ObjectRegistry";
import { TileRegistry } from "../Map/TileRegistry";
import { TileTextureAtlas } from "./TileTextureAtlas";
import { TextureBindingLayout } from "../../WebGPU/Texture/TextureBindingLayout";
import { VertexState } from "../../WebGPU/Pipeline/State/Vertex/VertexState";

/**
 * Rysuje kafle widocznej części mapy - jedna instancja kwadratu na kafel, jeden draw call.
 *
 * Z mapy czytany jest tylko prostokąt pokrywający ekran, więc koszt zależy od rozmiaru okna,
 * a nie od rozmiaru świata. Bufor instancji przebudowuje się dopiero, gdy coś się zmieni
 * (kamera, zoom, warstwa albo zawartość mapy), a nie co klatkę.
 */
export class TilePass
{
    private static readonly VERTEX_COUNT: uint = 6;
    private static readonly FLOATS_PER_TILE: uint = 4; // world.xy + texture_slot + reserved
    private static readonly MAX_TILES: uint = 65536;

    private readonly device: GPUDevice;
    private readonly atlas: TileTextureAtlas;
    private readonly pipeline: GPURenderPipeline;
    private readonly bindGroup: GPUBindGroup;
    private readonly tileBuffer: GPUBuffer;
    private readonly tileData: Float32Array<ArrayBuffer>;
    private readonly tileLayers: Uint32Array<ArrayBuffer>;

    private tileCount: uint = 0;
    private builtFor: string = '';

    private constructor(
        device: GPUDevice,
        atlas: TileTextureAtlas,
        pipeline: GPURenderPipeline,
        bindGroup: GPUBindGroup,
        tileBuffer: GPUBuffer,
    ) {
        this.device = device;
        this.atlas = atlas;
        this.pipeline = pipeline;
        this.bindGroup = bindGroup;
        this.tileBuffer = tileBuffer;

        const buffer: ArrayBuffer = new ArrayBuffer(TilePass.MAX_TILES * TilePass.FLOATS_PER_TILE * 4);

        // ten sam bufor widziany jako float (pozycja) i jako u32 (indeks warstwy tekstury)
        this.tileData = new Float32Array(buffer);
        this.tileLayers = new Uint32Array(buffer);
    }

    public static async create(
        device: GPUDevice,
        format: GPUTextureFormat,
        frameBindGroupLayout: GPUBindGroupLayout,
        textures: TileTextureAtlas,
    ): Promise<TilePass> {
        const tileBuffer: GPUBuffer = device.createBuffer(new BufferDescriptor(
            'buffer_tile_instances',
            TilePass.MAX_TILES * TilePass.FLOATS_PER_TILE * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            false,
        ));

        const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout(new BindGroupLayoutDescriptor(
            'bind_group_layout_tiles',
            [
                new BindGroupLayoutEntry(0, GPUShaderStage.VERTEX, new BufferBindingLayout('read-only-storage')),
                new BindGroupLayoutEntry(1, GPUShaderStage.FRAGMENT, undefined, undefined, new TextureBindingLayout('float', '2d')),
                new BindGroupLayoutEntry(2, GPUShaderStage.FRAGMENT, undefined, new SamplerBindingLayout('filtering')),
            ],
        ));

        const bindGroup: GPUBindGroup = device.createBindGroup(new BindGroupDescriptor(
            'bind_group_tiles',
            bindGroupLayout,
            [
                new BindGroupEntry(0, new BufferBinding(tileBuffer)),
                new BindGroupEntry(1, textures.getView()),
                new BindGroupEntry(2, textures.getSampler()),
            ],
        ));

        const pipeline: GPURenderPipeline = await device.createRenderPipelineAsync(new RenderPipelineDescriptor(
            'pipeline_tiles',
            device.createPipelineLayout(
                new PipelineLayoutDescriptor('pipeline_layout_tiles', [frameBindGroupLayout, bindGroupLayout])
            ),
            new VertexState(device.createShaderModule(new ShaderModuleDescriptor('vs_module_tiles', tile_vert)), 'main'),
            new FragmentState(
                device.createShaderModule(new ShaderModuleDescriptor('fs_module_tiles', tile_frag)),
                'main',
                // bez mieszania przezroczyste piksele tekstury wychodza czarne, bo pipeline
                // wpisuje je wprost do celu razem z zerowa alfa
                [new ColorTargetState(format, new BlendState(
                    new BlendComponent('add', 'src-alpha', 'one-minus-src-alpha'),
                    new BlendComponent('add', 'one', 'one-minus-src-alpha'),
                ))],
            ),
        ));

        return new TilePass(device, textures, pipeline, bindGroup, tileBuffer);
    }

    /** Przebudowuje bufor instancji tylko wtedy, gdy zmieniło się cokolwiek, co wpływa na widok. */
    public update(
        map: GameMap,
        tiles: TileRegistry,
        objects: ObjectRegistry,
        camera: Camera,
        canvas: Canvas,
        layer: int,
    ): void {
        const key: string = `${camera.getX()}|${camera.getY()}|${camera.getZoom()}|${layer}`
            + `|${map.getVersion()}|${tiles.getVersion()}|${objects.getVersion()}`;

        if (key === this.builtFor) {
            return;
        }

        this.builtFor = key;
        this.tileCount = 0;

        const firstTileX: uint = Math.max(0, Math.floor(camera.getX() / SquareConfig.LENGTH));
        const firstTileY: uint = Math.max(0, Math.floor(camera.getY() / SquareConfig.LENGTH));
        const lastTileX: uint = Math.min(
            MapConfig.WORLD_TILES_X - 1,
            Math.floor((camera.getX() + camera.getVisibleWorldWidth()) / SquareConfig.LENGTH),
        );
        const lastTileY: uint = Math.min(
            MapConfig.WORLD_TILES_Y - 1,
            Math.floor((camera.getY() + camera.getVisibleWorldHeight()) / SquareConfig.LENGTH),
        );

        for (let tileY: uint = firstTileY; tileY <= lastTileY; tileY++) {
            for (let tileX: uint = firstTileX; tileX <= lastTileX; tileX++) {
                const cell: Cell|null = map.getCell(layer, tileX, tileY);

                if (cell === null) {
                    continue;
                }

                // kolejnosc instancji = kolejnosc rysowania: najpierw caly stos kafelkow,
                // potem caly stos obiektow, wiec obiekty zawsze zaslaniaja kafelki
                for (const tileId of cell.getTileStack()) {
                    const textureId: int = tiles.get(tileId)?.textureId ?? -1;

                    if (textureId >= 0) {
                        this.pushInstance(tileX, tileY, textureId);
                    }
                }

                for (const objectId of cell.getObjectStack()) {
                    const textureId: int = objects.get(objectId)?.textureId ?? -1;

                    if (textureId >= 0) {
                        this.pushInstance(tileX, tileY, textureId);
                    }
                }
            }
        }

        if (this.tileCount > 0) {
            this.device.queue.writeBuffer(this.tileBuffer, 0, this.tileData, 0, this.tileCount * TilePass.FLOATS_PER_TILE);
        }
    }

    private pushInstance(tileX: uint, tileY: uint, textureId: uint): void
    {
        const slot: int = this.atlas.getSlot(textureId);

        if (this.tileCount >= TilePass.MAX_TILES || slot === -1) {
            return;
        }

        const offset: uint = this.tileCount * TilePass.FLOATS_PER_TILE;

        this.tileData[offset] = tileX * SquareConfig.LENGTH;
        this.tileData[offset + 1] = tileY * SquareConfig.LENGTH;
        this.tileLayers[offset + 2] = slot;
        this.tileLayers[offset + 3] = 0;

        this.tileCount++;
    }

    public draw(renderPass: GPURenderPassEncoder, frameBindGroup: GPUBindGroup): void
    {
        if (this.tileCount === 0) {
            return;
        }

        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, frameBindGroup);
        renderPass.setBindGroup(1, this.bindGroup);
        renderPass.draw(TilePass.VERTEX_COUNT, this.tileCount);
    }

    public getVisibleTileCount(): uint
    {
        return this.tileCount;
    }
}
