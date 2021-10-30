/**
 * Cannot find parent HTMLElement for canvas
 */
export class MissingCanvasParentElementException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "MissingCanvasParentElementException";
	}
}
