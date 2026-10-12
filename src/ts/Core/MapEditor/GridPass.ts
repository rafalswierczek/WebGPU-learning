import grid_vert from "../../WGSL/VertexShader/grid.vert.wgsl";
import grid_frag from "../../WGSL/FragmentShader/grid.frag.wgsl";
import { ColorTargetState } from "../../WebGPU/Pipeline/State/Fragment/ColorTargetState";
import { FragmentState } from "../../WebGPU/Pipeline/State/Fragment/FragmentState";
import { PipelineLayoutDescriptor } from "../../WebGPU/Pipeline/PipelineLayoutDescriptor";
import { RenderPipelineDescriptor } from "../../WebGPU/Pipeline/RenderPipelineDescriptor";
import { ShaderModuleDescriptor } from "../../WebGPU/Pipeline/ShaderModuleDescriptor";
import { VertexState } from "../../WebGPU/Pipeline/State/Vertex/VertexState";

/**
 * Siatka kafli rysowana w całości we fragment shaderze.
 *
 * Nie ma tu żadnej geometrii siatki - jeden trójkąt pokrywa ekran, a shader dla każdego piksela
 * liczy jego pozycję w świecie i sprawdza, czy wypada na linii. Dzięki temu siatka jest darmowa
 * niezależnie od rozmiaru mapy i widać ją także tam, gdzie nie ma jeszcze żadnych kafli.
 */
export class GridPass
{
    private static readonly VERTEX_COUNT: uint = 3;

    private readonly pipeline: GPURenderPipeline;

    private constructor(pipeline: GPURenderPipeline)
    {
        this.pipeline = pipeline;
    }

    public static async create(
        device: GPUDevice,
        format: GPUTextureFormat,
        frameBindGroupLayout: GPUBindGroupLayout,
    ): Promise<GridPass> {
        const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout(
            new PipelineLayoutDescriptor('pipeline_layout_grid', [frameBindGroupLayout])
        );

        const vertexModule: GPUShaderModule = device.createShaderModule(
            new ShaderModuleDescriptor('vs_module_grid', grid_vert)
        );
        const fragmentModule: GPUShaderModule = device.createShaderModule(
            new ShaderModuleDescriptor('fs_module_grid', grid_frag)
        );

        const pipeline: GPURenderPipeline = await device.createRenderPipelineAsync(new RenderPipelineDescriptor(
            'pipeline_grid',
            pipelineLayout,
            new VertexState(vertexModule, 'main'),
            new FragmentState(fragmentModule, 'main', [new ColorTargetState(format)]),
        ));

        return new GridPass(pipeline);
    }

    public draw(renderPass: GPURenderPassEncoder, frameBindGroup: GPUBindGroup): void
    {
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, frameBindGroup);
        renderPass.draw(GridPass.VERTEX_COUNT);
    }
}
