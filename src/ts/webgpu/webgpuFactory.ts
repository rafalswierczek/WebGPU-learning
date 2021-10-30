import { ContextConfig } from '../config/contextConfig';
import { Canvas } from '../startup/canvas';
import { InvalidAdapterException } from '../exception/InvalidAdapterException';
import { InvalidDeviceException } from '../exception/InvalidDeviceException';
import { MissingCanvasParentElementException } from '../exception/MissingCanvasParentElementException'

export class WebGPUFactory {
    public async getAdapter(): Promise<GPUAdapter|null> {
        return await navigator.gpu.requestAdapter();
    }

    public async getDevice(adapter: GPUAdapter|null): Promise<GPUDevice|undefined> {
        return await adapter?.requestDevice();
    }

    /**
     * Create canvas element and configure context
     * 
     * @returns CanvasConfiguration
     * @throws InvalidAdapterException
     * @throws InvalidDeviceException
     * @throws MissingCanvasParentElementException
     */
    public async prepare() {
        const adapter = await this.getAdapter();

        if (!adapter) {
            throw new InvalidAdapterException();
        }

        const device = await this.getDevice(adapter);

        if (!device) {
            throw new InvalidDeviceException();
        }

        const body = document.querySelector('body');

        if (!body) {
            throw new MissingCanvasParentElementException();
        }

        const canvas = (new Canvas(600, 600))
            .setStyle('border: 1px solid black;')
            .appendTo(body)
        ;

        const contextConfig = new ContextConfig(
            adapter,
            device,
            canvas.getCanvas(),
            canvas.getContext()
        );

        contextConfig.configure();

        return contextConfig.getCanvasConfiguration();
    }
}
