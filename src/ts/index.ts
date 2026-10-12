import './globals';
import { Application } from './Core/Application';
import { Startup } from './Core/Startup';
import { TestRunner } from './Test/TestRunner';

try {
    Startup.checkWebGPUSupport();

    TestRunner.register();

    Application.run();
} catch (exception) {
    alert("There is a problem with application. Check console (F12 > Console) for more information");

    throw exception;
}
