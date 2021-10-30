import { ShaderModuleDescriptor } from "../object/shaderModuleDescriptor";

export class PipeLine {
    private device: GPUDevice;
    private shaderModuleDescriptorVertex: ShaderModuleDescriptor;
    private shaderModuleDescriptorFragment: ShaderModuleDescriptor;
    private textureFormat: GPUTextureFormat;

    constructor(
        device: GPUDevice,
        shaderModuleDescriptorVertex: ShaderModuleDescriptor,
        shaderModuleDescriptorFragment: ShaderModuleDescriptor,
        textureFormat: GPUTextureFormat
    ) {
        this.device = device;
        this.shaderModuleDescriptorVertex = shaderModuleDescriptorVertex;
        this.shaderModuleDescriptorFragment = shaderModuleDescriptorFragment;
        this.textureFormat = textureFormat;
    }

    configure(entryPoint: string, primitiveTopology: GPUPrimitiveTopology): GPURenderPipeline {
        return this.device.createRenderPipeline({
            vertex: {
                entryPoint: entryPoint,
                module: this.device.createShaderModule(this.shaderModuleDescriptorVertex)
            },

            fragment: {
                entryPoint: entryPoint,
                module: this.device.createShaderModule(this.shaderModuleDescriptorFragment),
                targets: [{
                    format: this.textureFormat,
                }]
            },

            primitive: {
                topology: primitiveTopology,
            }
        });
    }
}
