import { DataLengthException } from "../Exception/DataLengthException";
import { BufferDescriptor } from "../../WebGPU/Buffer/BufferDescriptor";
import { SquareBuffers } from "./SquareBuffers";

export class StagingBufferRing
{
    private device: GPUDevice;

    private stagingBuffers: Array<SquareBuffers> = [];

    private masterBuffers: SquareBuffers|null = null;

    public constructor(device: GPUDevice)
    {
        this.device = device;
    }

    public createMasterBuffers(vertexBufferSize: number, indexBufferSize: number): void
    {
        const vertexBuffer = this.device.createBuffer(new BufferDescriptor(
            'Master vertex buffer',
            vertexBufferSize,
            GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
            true,
        ));

        const indexBuffer = this.device.createBuffer(new BufferDescriptor(
            'Master index buffer',
            indexBufferSize,
            GPUBufferUsage.COPY_DST | GPUBufferUsage.INDEX,
            true,
        ));

        this.masterBuffers = new SquareBuffers(vertexBuffer, indexBuffer);
    }

    public update(vertexBufferData: Float32Array, indexBufferData: Uint32Array)
    {
        if (null === this.masterBuffers) {
            throw new Error('You have to create master buffers before updating staging buffer ring');
        }

        if (vertexBufferData.byteLength > this.masterBuffers.vertexBuffer.size) {
            throw new DataLengthException('Staging vertex buffer size cannot be bigger than vertex master buffer size');
        }

        if (indexBufferData.byteLength > this.masterBuffers.indexBuffer.size) {
            throw new DataLengthException('Staging index buffer size cannot be bigger than index master buffer size');
        }
        
        const stagingBuffers: SquareBuffers = this.getStagingBuffers(vertexBufferData.byteLength, indexBufferData.byteLength);
        const vertexBuffer: GPUBuffer = stagingBuffers.vertexBuffer;
        const indexBuffer: GPUBuffer = stagingBuffers.indexBuffer;

        (new Float32Array(vertexBuffer.getMappedRange())).set(vertexBufferData);
        (new Float32Array(indexBuffer.getMappedRange())).set(indexBufferData);

        vertexBuffer.unmap();
        indexBuffer.unmap();

        const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();

        commandEncoder.copyBufferToBuffer(vertexBuffer, 0, this.masterBuffers.vertexBuffer, 0, vertexBuffer.size);
        commandEncoder.copyBufferToBuffer(indexBuffer, 0, this.masterBuffers.indexBuffer, 0, indexBuffer.size);

        this.device.queue.submit([commandEncoder.finish()]);

        this.mapAndAddToStage(stagingBuffers);
    }

    private getStagingBuffers(vertexBufferSize: number, indexBufferSize: number): SquareBuffers
    {
        let stagingBuffers: SquareBuffers;

        if (this.stagingBuffers.length > 0) {
            stagingBuffers = this.stagingBuffers.pop() as SquareBuffers;
        } else {
            const vertexBuffer = this.device.createBuffer(new BufferDescriptor(
                'Staging vertex buffer',
                vertexBufferSize,
                GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
                true,
            ));

            const indexBuffer = this.device.createBuffer(new BufferDescriptor(
                'Staging index buffer',
                indexBufferSize,
                GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
                true,
            ));

            stagingBuffers = new SquareBuffers(vertexBuffer, indexBuffer);
        }

        return stagingBuffers;
    }

    private mapAndAddToStage(stagingBuffers: SquareBuffers): void
    {
        Promise.all([
            stagingBuffers.vertexBuffer.mapAsync(GPUMapMode.WRITE),
            stagingBuffers.indexBuffer.mapAsync(GPUMapMode.WRITE),
        ]).then(() => {
            this.stagingBuffers.push(stagingBuffers);
        });
    }
}
