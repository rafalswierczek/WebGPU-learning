export class WebGPUException extends Error
{
	/**
	 * Creates new WebGPUException.
	 * @param {string} messageType Defines category of error (e.g., `"Shader compile error"`)
	 * @param {string} [messageData] Presents precise output information related to `messageType` (e.g., `todo`)
	 */
	constructor(message: string = "")
	{
		super(message);
		this.name = "WebGPUException";
	}
}