/**
 * Cannot get GPUDevice from navigator.gpu
 */
export class InvalidDeviceException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "InvalidDeviceException";
	}
}
