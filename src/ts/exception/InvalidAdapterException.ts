/**
 * Cannot get GPUAdapter from navigator.gpu
 */
export class InvalidAdapterException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "InvalidAdapterException";
	}
}
