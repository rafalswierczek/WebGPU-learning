export class StorageTextureBindingLayout implements GPUStorageTextureBindingLayout
{
    public access: GPUStorageTextureAccess;

    public format: GPUTextureFormat;

    public viewDimension: GPUTextureViewDimension;

    public constructor (
        format: GPUTextureFormat,
        access: GPUStorageTextureAccess = "write-only",
        viewDimension: GPUTextureViewDimension = "2d"
    ) {
        this.format = format;
        this.access = access;
        this.viewDimension = viewDimension;
    }
}
