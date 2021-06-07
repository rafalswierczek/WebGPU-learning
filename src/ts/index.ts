import notificationHandler from './utils/NotificationHandler';
import {isWebGPUSupported} from './utils/helper';

isWebGPUSupported();

if(notificationHandler.hasErrors())
    alert("There is a problem with application. Check console (F12 > Console) for more information");

notificationHandler.displayInConsole();