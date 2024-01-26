import { Canvas } from "../Canvas/Canvas";
import { CanvasSize } from "../Canvas/CanvasSize";
import { CanvasConfig } from "../../WebGPU/Config/CanvasConfig";
import { InvalidCanvasContextException } from "../Exception/InvalidCanvasContextException";
import { CanvasSizeFactory } from "./CanvasSizeFactory";

export class CanvasFactory
{
    /**
     * @throws {InvalidCanvasContextException}
     */
    public static create(): Canvas
    {
        const canvasSize: CanvasSize = CanvasSizeFactory.create();

        return (new Canvas(canvasSize)).setStyle(CanvasConfig.STYLE);
    }
}
