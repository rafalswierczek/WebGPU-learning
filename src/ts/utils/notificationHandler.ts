import { Notification } from '../object/notification/notification';
import { NotificationException } from '../exception/notificationException';
import { ErrorNotification } from '../object/notification/errorNotification';
import { NoticeNotification } from '../object/notification/noticeNotification';
import { SuccessNotification } from '../object/notification/successNotification';

class NotificationHandler {
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
        let notifications: Notification[] = [];

        this.errorNotifications.forEach(errorNotification => {notifications.push(errorNotification)});
        this.noticeNotifications.forEach(noticeNotification => {notifications.push(noticeNotification)});
        this.successNotifications.forEach(successNotification => {notifications.push(successNotification)});

        return notifications;
    }

    public displayInConsole()
    {
        for (const errorNotification of this.errorNotifications) {
            console.error(errorNotification.message);
        }

        for (const noticeNotification of this.noticeNotifications) {
            console.warn(noticeNotification.message);
        }

        for (const successNotification of this.successNotifications) {
            console.log('%c'+successNotification.message, 'color: green');
        }
    }

    public hasErrors(): boolean
    {
        return this.errorNotifications !== [];
    }

    public throwIfError()
    {
        if(this.hasErrors())
            throw new NotificationException();
    }
}

export default new NotificationHandler();
