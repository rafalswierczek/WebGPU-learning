import { CanvasSize } from "./CanvasSize";
import { InvalidCanvasContextException } from "../Exception/InvalidCanvasContextException";

export class Canvas
{
    private canvas: HTMLCanvasElement;

    private context: GPUCanvasContext;
    
    private parentElement: HTMLElement|null = null;

    private canvasSize: CanvasSize;

    /**
     * @throws {InvalidCanvasContextException}
     */
    constructor(canvasSize: CanvasSize)
    {
        this.canvas = document.createElement('canvas');
        this.canvas.width = canvasSize.getWidth();
        this.canvas.height = canvasSize.getHeight();
        this.canvasSize = canvasSize;
        this.context = this.getContextFromCanvas(this.canvas);
    }

    public getCanvasSize(): CanvasSize
    {
        return this.canvasSize;
    }

    public getCanvasElement(): HTMLCanvasElement
    {
        return this.canvas;
    }

    public getContext(): GPUCanvasContext
    {
        return this.context;
    }

    public getParentElement(): HTMLElement|null
    {
        return this.parentElement;
    }

    public appendTo(element: HTMLElement): this
    {
        element.appendChild(this.canvas);

        this.parentElement = element;

        return this;
    }

    public setStyle(cssStyle: string): this
    {
        this.canvas.style.cssText = cssStyle;

        return this;
    }

    /**
     * @throws {InvalidCanvasContextException}
     */
    private getContextFromCanvas(canvas: HTMLCanvasElement): GPUCanvasContext
    {
        const context = canvas.getContext('webgpu');

        if (!context) {
            throw new InvalidCanvasContextException();
        }

        return context;
    }
}
