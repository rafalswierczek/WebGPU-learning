export class CanvasConfig
{
    static readonly WIDTH: number = 800;
    static readonly HEIGHT: number = 600;
    static readonly SIZE_RATIO: number = this.WIDTH / this.HEIGHT;

    static readonly PARENT_SELECTOR: string = 'body';
    static readonly STYLE: string = 'border: 1px solid black;';

    static readonly TEXTURE_FORMAT: GPUTextureFormat = 'bgra8unorm';
    static readonly USAGE: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT;
    static readonly VIEW_FORMATS: GPUTextureFormat[] = [];
    static readonly COLOR_SPACE: PredefinedColorSpace = 'srgb';
    static readonly ALPHA_MODE: GPUCanvasAlphaMode = 'opaque';
}
