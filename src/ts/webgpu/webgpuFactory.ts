export class WebGPUFactory {
    async getAdapter(): Promise<GPUAdapter|null> {
        return await navigator.gpu?.requestAdapter() as GPUAdapter|null;
    }

    async getDevice(): Promise<GPUDevice|undefined> {
        return await this.getAdapter().then(adapter => {
            return adapter?.requestDevice() as GPUDevice|undefined
        });
    }
}
