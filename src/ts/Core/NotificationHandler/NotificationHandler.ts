import { Notification } from './Notification';
import { NotificationException } from '../Exception/NotificationException';
import { ErrorNotification } from './ErrorNotification';
import { NoticeNotification } from './NoticeNotification';
import { SuccessNotification } from './SuccessNotification';

class NotificationHandler
{
    private errorNotifications: ErrorNotification[] = [];

    private noticeNotifications: NoticeNotification[] = [];
    
    private successNotifications: SuccessNotification[] = [];

    public addErrorNotification(message: string) {
        this.errorNotifications.push(new ErrorNotification(message));
    }

    public getErrorNotifications(): ErrorNotification[] {
        return this.errorNotifications;
    }

    public addNoticeNotification(message: string) {
        this.noticeNotifications.push(new NoticeNotification(message));
    }

    public getNoticeNotifications(): NoticeNotification[] {
        return this.noticeNotifications;
    }

    public addSuccessNotification(message: string) {
        this.successNotifications.push(new SuccessNotification(message));
    }

    public getSuccessNotifications(): SuccessNotification[] {
        return this.successNotifications;
    }

    public getAllNotifications(): Notification[]
    {
        const notifications: Notification[] = [];

        this.errorNotifications.forEach(errorNotification => {notifications.push(errorNotification)});
        this.noticeNotifications.forEach(noticeNotification => {notifications.push(noticeNotification)});
        this.successNotifications.forEach(successNotification => {notifications.push(successNotification)});

        return notifications;
    }

    public displayInConsole()
    {
        for (const errorNotification of this.errorNotifications) {
            console.error(errorNotification.getMessage());
        }

        for (const noticeNotification of this.noticeNotifications) {
            console.warn(noticeNotification.getMessage());
        }

        for (const successNotification of this.successNotifications) {
            console.log('%c'+successNotification.getMessage(), 'color: green');
        }
    }

    public hasErrors(): boolean
    {
        return this.errorNotifications.length > 0;
    }

    public throwIfError()
    {
        if (this.hasErrors()) {
            throw new NotificationException(this.errorNotifications);
        }
    }
}

export default new NotificationHandler();
