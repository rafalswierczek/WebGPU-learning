/**
 * Byte length of data is too big for a buffer
 */
export class DataLengthException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "DataLengthException";
	}
}
