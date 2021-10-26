/**
 * Application cannot run after this exception is thrown
 */
export class FatalException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "FatalException";
	}
}
