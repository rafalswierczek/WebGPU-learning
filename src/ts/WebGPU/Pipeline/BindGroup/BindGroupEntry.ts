export class BindGroupEntry implements GPUBindGroupEntry
{
    public readonly binding: GPUIndex32;
    public readonly resource: GPUBindingResource;

    public constructor (
        binding: GPUIndex32,
        resource: GPUBindingResource,
    ) {
        this.binding = binding;
        this.resource = resource;
    }
}
