export class RenderPipelineDescriptor implements GPURenderPipelineDescriptor
{
    public readonly label: string;
    public readonly layout: GPUPipelineLayout|GPUAutoLayoutMode;
    public readonly vertex: GPUVertexState;
    public readonly fragment?: GPUFragmentState;
    public readonly primitive?: GPUPrimitiveState;
    public readonly depthStencil?: GPUDepthStencilState;
    public readonly multisample?: GPUMultisampleState;
    
    public constructor (
        label: string,
        layout: GPUPipelineLayout|GPUAutoLayoutMode,
        vertex: GPUVertexState,
        fragment?: GPUFragmentState,
        primitive?: GPUPrimitiveState, // {}
        depthStencil?: GPUDepthStencilState,
        multisample?: GPUMultisampleState, // {}
        
    ) {
        this.label = label;
        this.layout = layout;
        this.vertex = vertex;
        this.fragment = fragment;
        this.primitive = primitive;
        this.depthStencil = depthStencil;
        this.multisample = multisample;
    }
}
