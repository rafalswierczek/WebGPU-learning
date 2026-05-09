import { DataLengthForBufferException } from "./Exception/DataLengthForBufferException";
import { BufferDescriptor } from "../WebGPU/Buffer/BufferDescriptor";
import { MasterBufferDescriptor } from "../WebGPU/Buffer/MasterBufferDescriptor";

export class StagedBuffer
{
    public readonly name: string;
    public readonly masterBuffer: GPUBuffer;
    private readonly stagingBuffer: GPUBuffer;
    private isMapped: boolean;

    public constructor(name: string, device: GPUDevice, masterBufferDescriptor: MasterBufferDescriptor)
    {
        this.name = name;
        this.masterBuffer = device.createBuffer(masterBufferDescriptor);
        this.isMapped = true;
        this.stagingBuffer = device.createBuffer(new BufferDescriptor(
            `Staging buffer | ${this.masterBuffer.label}`,
            this.masterBuffer.size,
            GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
            this.isMapped,
        ));
    }

    public async update(masterBufferNewData: Float32Array|Uint32Array, commandEncoder: GPUCommandEncoder): Promise<void>
    {
        if (masterBufferNewData.byteLength !== this.masterBuffer.size) {
            throw new DataLengthForBufferException(this.masterBuffer, masterBufferNewData);
        }

        if (this.isMapped === false) {
            await this.stagingBuffer.mapAsync(GPUMapMode.WRITE);
        }

        if (masterBufferNewData instanceof Float32Array) {
            (new Float32Array(this.stagingBuffer.getMappedRange())).set(masterBufferNewData);
        } else if (masterBufferNewData instanceof Uint32Array) {
            (new Uint32Array(this.stagingBuffer.getMappedRange())).set(masterBufferNewData);
        }

        commandEncoder.copyBufferToBuffer(this.stagingBuffer, 0, this.masterBuffer, 0, this.stagingBuffer.size);

        this.stagingBuffer.unmap();
        this.isMapped = false;
    }

    public destroy(): void
    {
        this.stagingBuffer.destroy();
        this.masterBuffer.destroy();
    }
}
