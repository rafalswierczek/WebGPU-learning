import notificationHandler from './Core/NotificationHandler/NotificationHandler';
import { Application } from './Core/Application';
import { Startup } from './Core/Startup';

try {
    Startup.checkWebGPUSupport();

    Application.run();
} catch (exception) {
    notificationHandler.displayInConsole();

    alert("There is a problem with application. Check console (F12 > Console) for more information");

    throw exception;
}
