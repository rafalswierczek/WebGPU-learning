/**
 * Cannot get webgpu GPUCanvasContext from canvas element
 */
export class InvalidCanvasContextException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "InvalidCanvasContextException";
	}
}
