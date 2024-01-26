import { ErrorNotification } from "../NotificationHandler/ErrorNotification";

/**
 * Should be thrown when NotificationHandler contains errors
 */
export class NotificationException extends Error
{
	private errorNotifications: ErrorNotification[];

	constructor(errorNotifications: ErrorNotification[], message: string = "")
	{
		super(message);

		this.name = "NotificationException";
		this.errorNotifications = errorNotifications;
	}

	public getErrorNotifications(): ErrorNotification[]
	{
		return this.errorNotifications;
	}
}
