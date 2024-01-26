import { CanvasConfiguration } from "../Canvas/CanvasConfiguration";
import { CanvasConfig } from "../../WebGPU/Config/CanvasConfig";

export class CanvasConfigurationFactory
{
    public static create(device: GPUDevice): CanvasConfiguration
    {
        return new CanvasConfiguration(
            device,
            CanvasConfig.TEXTURE_FORMAT,
            CanvasConfig.USAGE,
            CanvasConfig.VIEW_FORMATS,
            CanvasConfig.COLOR_SPACE,
            CanvasConfig.ALPHA_MODE
        );
    }
}
