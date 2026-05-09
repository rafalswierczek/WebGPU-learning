export class Startup
{
    public static checkWebGPUSupport(): void
    {
        if (!navigator.gpu) {
            throw new Error(`Your current browser does not support WebGPU! See https://github.com/gpuweb/gpuweb/wiki/Implementation-Status for more details.`);
        }
    }
} 
