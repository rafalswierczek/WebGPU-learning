import notificationHandler from '../utils/notificationHandler';

/**
 * @throws {NotificationException}
 */
export function checkWebGPUSupport(): void
{
    if(!navigator.gpu) {
        notificationHandler.addErrorNotification( `Your current browser does not support WebGPU! See https://github.com/gpuweb/gpuweb/wiki/Implementation-Status for more details.`);
        notificationHandler.throwIfError();
    }
}
