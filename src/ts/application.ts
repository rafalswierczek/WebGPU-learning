import { WebGPUFactory } from './webgpu/webgpuFactory';
import { WebGPUAnimation } from './webgpu/webgpuAnimation';

export class Application {
    static async run() {
        const webGPUFactory = new WebGPUFactory();

        const adapter: GPUAdapter|null = await webGPUFactory.getAdapter();

        const device: GPUDevice|undefined = await webGPUFactory.getDevice();

        WebGPUAnimation.startAnimation();
    }
}