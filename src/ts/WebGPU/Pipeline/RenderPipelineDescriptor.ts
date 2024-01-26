export class RenderPipelineDescriptor implements GPURenderPipelineDescriptor
{
    public label: string;
    
    public layout: GPUPipelineLayout|GPUAutoLayoutMode;
    
    public vertex: GPUVertexState;

    public fragment?: GPUFragmentState;

    public primitive?: GPUPrimitiveState;

    public depthStencil?: GPUDepthStencilState;

    public multisample?: GPUMultisampleState;
    
    public constructor (
        label: string,
        layout: GPUPipelineLayout|GPUAutoLayoutMode,
        vertex: GPUVertexState,
        fragment?: GPUFragmentState,
        primitive?: GPUPrimitiveState,
        depthStencil?: GPUDepthStencilState,
        multisample?: GPUMultisampleState
        
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
