import { API } from './API';
import { Camera } from './Camera';
import { Controller } from './Controller';
import { Renderer } from './Renderer';
import { ResourceLoader } from './ResourceLoader';
import { WebGPU } from './WebGPU';

export class Application
{
    static async run(): Promise<void>
    {
        const webGPU: WebGPU = await WebGPU.init();

        const camera: Camera = Camera.getInstance();

        const renderer: Renderer = new Renderer(webGPU, camera);

        const resourceLoader: ResourceLoader = new ResourceLoader(webGPU.device);

        const controller: Controller = new Controller(renderer);

        const api: API = new API(controller);

        controller.init();
        
        api.init();
    }
}
