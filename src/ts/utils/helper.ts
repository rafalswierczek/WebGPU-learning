import notificationHandler from './NotificationHandler';

export function isWebGPUSupported(): boolean
{
    if(!navigator.gpu)
    {
        notificationHandler.addNotification('ERROR',
            `Your current browser does not support WebGPU!
            Make sure you are on a environment with WebGPU enabled.
            Currently, SPIR-V WebGPU is only supported in
            https://www.google.com/chrome/canary/ with the flag "enable-unsafe-webgpu" enabled.
            See https://github.com/gpuweb/gpuweb/wiki/Implementation-Status page for more details.`
       );
       
       return false;
    }
    
    return true;
}