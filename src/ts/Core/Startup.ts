import notificationHandler from './NotificationHandler/NotificationHandler';

/**
 * @throws {NotificationException}
 */
export class Startup
{
    public static checkWebGPUSupport(): void
    {
        if (!navigator.gpu) {
            notificationHandler.addErrorNotification(`Your current browser does not support WebGPU! See https://github.com/gpuweb/gpuweb/wiki/Implementation-Status for more details.`);
            notificationHandler.throwIfError();
        }
    }
} 
