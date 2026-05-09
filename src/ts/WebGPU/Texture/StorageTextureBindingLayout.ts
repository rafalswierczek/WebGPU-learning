export class StorageTextureBindingLayout implements GPUStorageTextureBindingLayout
{
    public readonly format: GPUTextureFormat;
    public readonly access?: GPUStorageTextureAccess;
    public readonly viewDimension?: GPUTextureViewDimension;

    public constructor (
        format: GPUTextureFormat,
        access?: GPUStorageTextureAccess, // "write-only"
        viewDimension?: GPUTextureViewDimension, // "2d"
    ) {
        this.format = format;
        this.access = access;
        this.viewDimension = viewDimension;
    }
}
