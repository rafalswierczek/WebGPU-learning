import { InvalidCanvasContextException } from "../Exception/InvalidCanvasContextException";

export class Canvas
{
    private readonly canvas: HTMLCanvasElement;
    private readonly context: GPUCanvasContext;

    /** @throws {InvalidCanvasContextException} */
    constructor(width: uint, height: uint, cssStyle: string)
    {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = cssStyle;
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.getContextFromCanvas(this.canvas);
    }

    public getCanvasElement(): HTMLCanvasElement
    {
        return this.canvas;
    }

    public getContext(): GPUCanvasContext
    {
        return this.context;
    }

    /** @throws {InvalidCanvasContextException} */
    private getContextFromCanvas(canvas: HTMLCanvasElement): GPUCanvasContext
    {
        const context = canvas.getContext('webgpu');

        if (!context) {
            throw new InvalidCanvasContextException();
        }

        return context;
    }
}
