/**
 * Base exception for WebGPU application
 */
export class WebGPUException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "WebGPUException";
	}
}
