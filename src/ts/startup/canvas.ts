export class Canvas {
    private canvas: HTMLCanvasElement;
    private context: GPUCanvasContext;

    constructor(width: number, height: number) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    public getContext(): GPUCanvasContext {
        return this.context;
    }

    public appendTo(element: HTMLElement): this {
        element.appendChild(this.canvas);

        return this;
    }

    public setStyle(cssStyle: string): this {
        this.canvas.style.cssText = cssStyle;

        return this;
    }
}