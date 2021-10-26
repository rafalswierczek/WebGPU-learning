import notificationHandler from './utils/notificationHandler';
import { checkWebGPUSupport } from './startup/checkWebgpuSupport';
import { Application } from './application';
import { FatalException } from './exception/fatalException';

try {
    checkWebGPUSupport();

    Application.run();
} catch (exception) {
    notificationHandler.displayInConsole();
    alert("There is a problem with application. Check console (F12 > Console) for more information");

    throw new FatalException("Cannot process application due to fatal error");
}

console.log('%cGame started!', 'color: green; font-weight: bold;');