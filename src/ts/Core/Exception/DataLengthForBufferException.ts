export class DataLengthForBufferException extends Error
{
	constructor(buffer: GPUBuffer, dataForBuffer: Float32Array|Uint32Array)
	{
		super(`Size of new data for buffer is different than buffer size. Buffer: ${buffer.label}, Buffer size: ${buffer.size}, New data size: ${dataForBuffer.byteLength}`);
		this.name = "DataLengthException";
	}
}
