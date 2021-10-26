import notificationHandler from './utils/notificationHandler';
import {checkWebGPUSupport} from './startup/checkWebgpuSupport';

try {
    checkWebGPUSupport();
} catch (exception) {
    notificationHandler.displayInConsole();
    alert("There is a problem with application. Check console (F12 > Console) for more information");
}

console.log('It works');
