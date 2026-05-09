import { API } from './API';
import { Camera } from './Camera';
import { Controller } from './Controller/Controller';
import { MapEditorController } from './Controller/MapEditorController';
import { Database } from './Database';
import { MapGenerator } from './MapEditor/MapGenerator';
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

        const database: Database = Database.getInstance();

        const resourceLoader: ResourceLoader = new ResourceLoader(database);

        const controller: Controller = new Controller(renderer);

        const mapGenerator: MapGenerator = new MapGenerator();

        const mapEditorcontroller: MapEditorController = new MapEditorController(webGPU.canvas.getCanvasElement(), mapGenerator, database);

        const api: API = new API(controller, mapEditorcontroller);

        controller.init();
        
        api.init();
    }
}
