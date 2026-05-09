import { DataLengthForBufferException } from "../Exception/DataLengthForBufferException";
import { BufferDescriptor } from "../../WebGPU/Buffer/BufferDescriptor";
import { MasterBufferDescriptor } from "./MasterBufferDescriptor";

/**
 * Used for adding data from CPU do GPU fast without much overhead.
 * stagingBuffers field holds mapped source buffers used as a way to transport data to the master buffers. Master buffers are meant to be used by GPU.
 * 
 * Usage: let's say there are 3 buffers to update, vertex and index and one helper storage buffer.
 * Pass an array of 3 master buffer descriptors into the constructor. Labels: M1, M2, M3.
 * Call update method to update these master buffers by passing a Record of 3 data elements with keys: M1, M2, M3 (to match master buffers).
 * 
 * The flow is like this
 * 1. Fast loop (increasingly more new staging buffers that will never be reused):
 * - call update many times very fast
 * - first call: stagingBuffers empty, create new staging buffers, copy data, map async
 * - second call: stagingBuffers empty, create new staging buffers, copy data, map async
 * - stagingBuffers has 1 mapped staging buffer because first call finished
 * - third call: take from stagingBuffers, copy data, map async
 * 2. Slow loop (perfect scenario when each update call can expect 1 staging buffer ready to be used):
 * - call update many times slowly
 * - first call: stagingBuffers empty, create new staging buffers, copy data, map async
 * - stagingBuffers has 1 mapped staging buffer because first call finished
 * - second call: take from stagingBuffers, copy data, map async
 * - stagingBuffers has 1 mapped staging buffer because second call finished
 * - third call: take from stagingBuffers, copy data, map async
 */
export class StagingBufferRing
{
    public readonly name: string;

    /** List of buffers to be updated at once in update function */
    public readonly masterBuffers: Record<string, GPUBuffer> = {}

    /** List of records. One staging record will match one master record. String in Record is label from MasterBufferDescriptor passed in the constructor */
    private readonly stagingBuffersList: Array<Record<string, GPUBuffer>> = []

    private readonly device: GPUDevice;

    /** If there are more than threshold staging buffers the program will stop because it means the loop is too fast and there will be too many idle staging buffers */
    private readonly threshold: number = 5;

    /** If update method was called more than maxQueuedUpdates and all of them are still pending throw an error */
    private readonly maxQueuedUpdates: number = 3;

    /**
     * Promise chain of pending updates. Each update() call appends to this chain. Chain is when update is called fast.
     * call 1: resolved → doUpdate1 → finally
     * call 2: resolved → doUpdate1 → finally → doUpdate2 → finally
     * call 3: resolved → doUpdate1 → finally → doUpdate2 → finally → doUpdate3 → finally
     * resolved, all doUpdates are done and all finally are executed
     * call 4: resolved → doUpdate4 → finally
     * ...
     */
    private pendingUpdate: Promise<void> = Promise.resolve();

    private queuedUpdates: number = 0;

    public constructor(name: string, device: GPUDevice, masterBuffers: MasterBufferDescriptor[])
    {
        this.name = name;
        this.device = device;

        for (const masterBufferDescriptor of masterBuffers) {
            this.masterBuffers[masterBufferDescriptor.label] = device.createBuffer(masterBufferDescriptor);
        }
    }

    /** Returns a promise chain. Record key must match master buffer label. */
    public update(masterBufferDataRecord: Record<string, Float32Array|Uint32Array>): Promise<void>
    {
        if (this.queuedUpdates >= this.maxQueuedUpdates) {
            throw new Error(`StagingBufferRing "${this.name}": update queue is full`);
        }

        this.queuedUpdates++;
        this.pendingUpdate = this.pendingUpdate.then(() => this.doUpdate(masterBufferDataRecord)).finally(() => {
            this.queuedUpdates--;
        });

        return this.pendingUpdate;
    }

    /**
     * Update one record of master buffers.
     * 
     * @param masterBufferDataRecord string in record is label from MasterBufferDescriptor passed in the constructor
     * */
    private async doUpdate(masterBufferDataRecord: Record<string, Float32Array|Uint32Array>): Promise<void>
    {
        for (const [masterBufferName, masterBufferNewData] of Object.entries(masterBufferDataRecord)) {
            if ((masterBufferName in this.masterBuffers) === false) {
                throw new Error(`Master buffer "${masterBufferName}" does not exist in StagingBufferRing "${this.name}"`);
            }

            if (masterBufferNewData.byteLength > this.masterBuffers[masterBufferName].size) {
                throw new DataLengthForBufferException(this.masterBuffers[masterBufferName], masterBufferNewData);
            }
        }

        if (this.stagingBuffersList.length > this.threshold) {
            throw new Error(`There are ${this.stagingBuffersList.length} staging buffers in StagingBufferRing with name "${this.name}". Max ${this.threshold} are allowed`);
        }
        
        const stagingBuffers: Record<string, GPUBuffer> = this.getStagingBuffers(masterBufferDataRecord);
        const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder();
        let totalDataSet = 0;

        for (const [stagingBufferName, stagingBuffer] of Object.entries(stagingBuffers)) {
            const 
            const masterBufferData = masterBufferDataRecord[stagingBufferName];

            if (masterBufferData instanceof Float32Array) {
                (new Float32Array(stagingBuffer.getMappedRange())).set(masterBufferData);
            } else if (masterBufferData instanceof Uint32Array) {
                (new Uint32Array(stagingBuffer.getMappedRange())).set(masterBufferData);
            }

            commandEncoder.copyBufferToBuffer(stagingBuffer, 0, this.masterBuffers[stagingBufferName], 0, stagingBuffer.size);

            stagingBuffer.unmap();

            totalDataSet++;
        }

        const masterBuffersLength = Object.keys(this.masterBuffers).length;

        if (totalDataSet !== masterBuffersLength) {
            throw new Error(`Could not update all new master buffer data. Updated: ${totalDataSet}, Expected: ${masterBuffersLength}`);
        }

        this.device.queue.submit([commandEncoder.finish()]);

        await this.mapAndAddToStage(stagingBuffers);
    }

    private getStagingBuffers(masterBufferDataRecord: Record<string, Float32Array|Uint32Array>): Record<string, GPUBuffer>
    {
        let stagingBuffers: Record<string, GPUBuffer> = {};

        if (this.stagingBuffersList.length > 0) {
            stagingBuffers = this.stagingBuffersList.pop() as Record<string, GPUBuffer>;
        } else {
            for (const [masterBufferName, masterBufferData] of Object.entries(masterBufferDataRecord)) {
                stagingBuffers[masterBufferName] = this.device.createBuffer(new BufferDescriptor(
                    `Staging buffer | ${masterBufferName}`,
                    this.masterBuffers[masterBufferName].size,
                    GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
                    true,
                ));
            }
        }

        return stagingBuffers;
    }

    private async mapAndAddToStage(stagingBuffers: Record<string, GPUBuffer>): Promise<void>
    {
        await Promise.all(
            // map buffers because they can be taken by getStagingBuffers with unmapped state causing getMappedRange to fail
            Object.values(stagingBuffers).map(buffer => buffer.mapAsync(GPUMapMode.WRITE))
        );

        this.stagingBuffersList.push(stagingBuffers);
    }
}
