import {Notification} from './Notification';

class NotificationHandler
{
    private notifications: Notification[] = [];

    public addNotification(type: string, message: string)
    {
        this.notifications.push(new  Notification(type, message));
    }

    public getNotifications(type: string|null): Notification[]
    {
        if(type)
        {
            let typedNotifications: Notification[] = [];
            
            this.notifications.forEach(notification => {
                if(notification.getType() === type)
                    typedNotifications.push(notification);
            });

            return typedNotifications;
        }

        return this.notifications;
    }

    public displayInConsole()
    {
        for(const notification of this.notifications)
        {
            switch(notification.getType())
            {
                case 'ERROR':
                    console.error(notification.getMessage());
                    break;
                case 'NOTICE':
                    console.warn(notification.getMessage());
                    break;
                case 'SUCCESS':
                    console.log(notification.getMessage());
                    break;
            }
        }
    }

    public hasErrors(): boolean
    {
        for(const notification of this.notifications)
        {
            if(notification.getType() === 'ERROR')
                return true;
        }

        return false;
    }

    public throwIfError()
    {
        if(this.hasErrors())
            throw new Error();
    }
}

export default new NotificationHandler();