/**
 * Should be thrown when NotificationHandler contains errors
 */
export class NotificationException extends Error
{
	constructor(message: string = "")
	{
		super(message);
		this.name = "NotificationException";
	}
}
