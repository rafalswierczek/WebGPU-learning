import { BindGroupDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupDescriptor";
import { BindGroupEntry } from "../../WebGPU/Pipeline/BindGroup/BindGroupEntry";
import { BindGroupLayoutDescriptor } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutDescriptor";
import { BindGroupLayoutEntry } from "../../WebGPU/Pipeline/BindGroup/BindGroupLayoutEntry";
import { BufferBinding } from "../../WebGPU/Buffer/BufferBinding";
import { BufferBindingLayout } from "../../WebGPU/Buffer/BufferBindingLayout";
import { MasterBufferDescriptor } from "../../WebGPU/Buffer/MasterBufferDescriptor";
import { OverlayPass } from "../MapEditor/OverlayPass";

/**
 * Wspólna baza rysowania dla wszystkich ekranów: uniform klatki i malarz interfejsu.
 *
 * Powstaje raz na całą aplikację, więc atlas fontu, pipeline UI i bufor uniformu istnieją
 * pojedynczo - menu główne, opcje i edytor mapy dzielą dokładnie te same zasoby GPU.
 */
export class UiContext
{
    /** camera + canvas_size + cell_size + chunk_size + scale + atlas = 40 B, dopelnione do 48 */
    private static readonly FRAME_FLOATS: uint = 12;

    public readonly painter: OverlayPass;

    private readonly device: GPUDevice;
    private readonly frameBuffer: GPUBuffer;
    private readonly frameBindGroupLayout: GPUBindGroupLayout;
    private readonly frameBindGroup: GPUBindGroup;
    private readonly frameData: Float32Array<ArrayBuffer>;

    private constructor(
        device: GPUDevice,
        frameBuffer: GPUBuffer,
        frameBindGroupLayout: GPUBindGroupLayout,
        frameBindGroup: GPUBindGroup,
        painter: OverlayPass,
    ) {
        this.device = device;
        this.frameBuffer = frameBuffer;
        this.frameBindGroupLayout = frameBindGroupLayout;
        this.frameBindGroup = frameBindGroup;
        this.painter = painter;
        this.frameData = new Float32Array(UiContext.FRAME_FLOATS);
    }

    public static async create(device: GPUDevice, format: GPUTextureFormat): Promise<UiContext>
    {
        const frameBuffer: GPUBuffer = device.createBuffer(new MasterBufferDescriptor(
            'buffer_frame',
            UiContext.FRAME_FLOATS * Float32Array.BYTES_PER_ELEMENT,
            GPUBufferUsage.UNIFORM,
        ));

        // jeden layout dla wszystkich pipeline'ów, więc ta sama bind group działa w siatce, kaflach i UI
        const frameBindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout(new BindGroupLayoutDescriptor(
            'bind_group_layout_frame',
            [new BindGroupLayoutEntry(
                0,
                GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                new BufferBindingLayout('uniform'),
            )],
        ));

        const frameBindGroup: GPUBindGroup = device.createBindGroup(new BindGroupDescriptor(
            'bind_group_frame',
            frameBindGroupLayout,
            [new BindGroupEntry(0, new BufferBinding(frameBuffer))],
        ));

        return new UiContext(
            device,
            frameBuffer,
            frameBindGroupLayout,
            frameBindGroup,
            await OverlayPass.create(device, format, frameBindGroupLayout),
        );
    }

    public getFrameBindGroupLayout(): GPUBindGroupLayout
    {
        return this.frameBindGroupLayout;
    }

    public getFrameBindGroup(): GPUBindGroup
    {
        return this.frameBindGroup;
    }

    /**
     * Ekrany menu nie mają kamery ani siatki, więc podają zera i skalę 1.
     *
     * @param scaleX ile pikseli canvasa przypada na jeden piksel świata w poziomie
     * @param scaleY to samo w pionie; osobno, bo kafel nie musi być na ekranie kwadratem
     */
    public updateFrame(
        cameraX: float,
        cameraY: float,
        canvasWidth: uint,
        canvasHeight: uint,
        cellSize: float,
        chunkSize: float,
        scaleX: float,
        scaleY: float,
        atlasColumns: float = 1,
        atlasRows: float = 1,
    ): void {
        this.frameData[0] = cameraX;
        this.frameData[1] = cameraY;
        this.frameData[2] = canvasWidth;
        this.frameData[3] = canvasHeight;
        this.frameData[4] = cellSize;
        this.frameData[5] = chunkSize;
        this.frameData[6] = scaleX;
        this.frameData[7] = scaleY;
        this.frameData[8] = atlasColumns;
        this.frameData[9] = atlasRows;

        this.device.queue.writeBuffer(this.frameBuffer, 0, this.frameData);
    }
}
