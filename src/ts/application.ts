import { WebGPUFactory } from './webgpu/webgpuFactory';
import { WebGPUAnimation } from './webgpu/webgpuAnimation';

export class Application {
    static async run() {
        const webGPUFactory = new WebGPUFactory();

        try {
            webGPUFactory.prepare();
        } catch (ex) {
            alert('Application crashed')
            console.error(ex);
        }

        WebGPUAnimation.startAnimation();
    }
}