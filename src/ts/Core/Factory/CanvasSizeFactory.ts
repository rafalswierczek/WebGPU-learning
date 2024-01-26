import { CanvasSize } from "../Canvas/CanvasSize";
import { CanvasConfig } from "../../WebGPU/Config/CanvasConfig";

export class CanvasSizeFactory
{
    public static create(): CanvasSize
    {
        return new CanvasSize(
            CanvasConfig.WIDTH * window.devicePixelRatio,
            CanvasConfig.HEIGHT * window.devicePixelRatio
        );
    }
}
