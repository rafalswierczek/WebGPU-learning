import { BindGroupLayoutDescriptor } from "../../../WebGPU/Pipeline/BindGroupLayoutDescriptor";
import { BindGroupLayoutEntry } from "../../../WebGPU/Pipeline/BindGroupLayoutEntry";
import { BufferBindingLayout } from "../../../WebGPU/Pipeline/BufferBindingLayout";
import { FragmentState } from "../../../WebGPU/Pipeline/FragmentState";
import { PipelineLayoutDescriptor } from "../../../WebGPU/Pipeline/PipelineLayoutDescriptor";
import { RenderPipelineDescriptor } from "../../../WebGPU/Pipeline/RenderPipelineDescriptor";
import { ShaderModuleDescriptor } from "../../../WebGPU/Pipeline/ShaderModuleDescriptor";
import { VertexAttribute } from "../../../WebGPU/Pipeline/VertexAttribute";
import { VertexBufferLayout } from "../../../WebGPU/Pipeline/VertexBufferLayout";
import { VertexState } from "../../../WebGPU/Pipeline/VertexState";
import square_vert from "../../../WGSL/VertexShader/square.vert.wgsl";
import square_frag from "../../../WGSL/FragmentShader/square.frag.wgsl";

export class GridPipeline
{
    private device: GPUDevice;

    public constructor(device: GPUDevice)
    {
        this.device = device;
    }

    public async create(): Promise<GPURenderPipeline>
    {
        const pipelineLayout: GPUPipelineLayout = this.createPipelineLayout();

        const vertexState: GPUVertexState = this.createVertexState();

        const fragmentState: GPUFragmentState = this.createFragmentState();

        const renderPipelineDescriptor: GPURenderPipelineDescriptor = new RenderPipelineDescriptor(
            'pipeline_descriptor_1',
            pipelineLayout,
            vertexState,
            fragmentState
        );

        return await this.device.createRenderPipelineAsync(renderPipelineDescriptor);
    }

    private createPipelineLayout(): GPUPipelineLayout
    {
        const bindGroupLayout: GPUBindGroupLayout = this.createBindGroupLayout();

        const pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor = new PipelineLayoutDescriptor(
            'pipeline_layout_descriptor_1',
            [bindGroupLayout]
        );

        return this.device.createPipelineLayout(pipelineLayoutDescriptor);
    }

    private createBindGroupLayout(): GPUBindGroupLayout
    {
        const bufferBindingLayout: GPUBufferBindingLayout = new BufferBindingLayout("uniform");

        const bindGroupLayoutEntry: GPUBindGroupLayoutEntry = new BindGroupLayoutEntry(
            0,
            GPUShaderStage.VERTEX,
            bufferBindingLayout
        );

        const bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor = new BindGroupLayoutDescriptor(
            'bind_group_layout_descriptor_1',
            [bindGroupLayoutEntry]
        );

        return this.device.createBindGroupLayout(bindGroupLayoutDescriptor);
    }

    private createVertexState(): GPUVertexState
    {
        const vertexShaderModuleDescriptor: GPUShaderModuleDescriptor = new ShaderModuleDescriptor(
            'vertex_shader_module_descriptor_1',
            square_vert
        );

        const vertexShaderModule: GPUShaderModule = this.device.createShaderModule(vertexShaderModuleDescriptor);

        const vertexAttribute: GPUVertexAttribute = new VertexAttribute("float32x2", 0, 0);

        const vertexBufferLayout: GPUVertexBufferLayout = new VertexBufferLayout(8, [vertexAttribute]);

        return new VertexState(
            vertexShaderModule,
            'main',
            [vertexBufferLayout]
        );
    }

    private createFragmentState(): GPUFragmentState
    {
        const fragmentShaderModuleDescriptor: GPUShaderModuleDescriptor = new ShaderModuleDescriptor(
            'fragment_shader_module_descriptor_1',
            square_frag
        );

        const fragmentShaderModule: GPUShaderModule = this.device.createShaderModule(fragmentShaderModuleDescriptor);

        return new FragmentState(
            fragmentShaderModule,
            'main',
            []
        );
    }
}
