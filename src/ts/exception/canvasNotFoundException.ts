/**
 * HTMLCanvasElement is missing
 */
export class CanvasNotFoundException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "CanvasNotFoundException";
	}
}
