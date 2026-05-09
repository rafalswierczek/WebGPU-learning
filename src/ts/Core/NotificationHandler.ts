class NotificationHandler
{
    private errorNotifications: string[] = [];
    private noticeNotifications: string[] = [];
    private successNotifications: string[] = [];

    public addErrorNotification(message: string)
    {
        this.errorNotifications.push(message);
    }

    public addNoticeNotification(message: string)
    {
        this.noticeNotifications.push(message);
    }

    public addSuccessNotification(message: string)
    {
        this.successNotifications.push(message);
    }

    public displayInConsole()
    {
        for (const errorNotification of this.errorNotifications) {
            console.error(errorNotification);
        }

        for (const noticeNotification of this.noticeNotifications) {
            console.warn(noticeNotification);
        }

        for (const successNotification of this.successNotifications) {
            console.log('%c'+successNotification, 'color: green');
        }

        this.errorNotifications = [];
        this.noticeNotifications = [];
        this.successNotifications = [];
    }

    public hasErrors(): boolean
    {
        return this.errorNotifications.length > 0;
    }

    public throwIfError()
    {
        if (this.hasErrors()) {
            throw new Error('NotificationHandler.throwIfError');
        }
    }
}

// this makes all imports to get always the same instance of NotificationHandler  
export default new NotificationHandler();
