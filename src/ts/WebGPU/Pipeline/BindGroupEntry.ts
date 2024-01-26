export class BindGroupEntry implements GPUBindGroupEntry
{
    public binding: GPUIndex32;
    
    public resource: GPUBindingResource;

    public constructor (
        binding: GPUIndex32,
        resource: GPUBindingResource
    ) {
        this.binding = binding;
        this.resource = resource;
    }
}
