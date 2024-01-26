import { Matrix } from '../Math/Matrix';
import { OrthographicProjectionMatrix } from '../Math/OrthographicProjectionMatrix';
import { NDC } from '../Math/NDC';
import { API } from './API';
import { Camera } from './Camera';
import { Controller } from './Controller';
import { Renderer } from './Renderer';
import { WebGPU } from './WebGPU';

export class Application
{
    static async run(): Promise<void>
    {
        const webGPU: WebGPU = new WebGPU();

        const camera: Camera = Camera.getInstance();

        const renderer: Renderer = new Renderer(webGPU, camera);

        const controller: Controller = new Controller(renderer);

        const api: API = new API(controller);
        
        api.init();
    }
}
