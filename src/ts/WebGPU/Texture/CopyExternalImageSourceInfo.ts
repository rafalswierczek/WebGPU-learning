export class CopyExternalImageSourceInfo implements GPUCopyExternalImageSourceInfo
{
    public readonly source: GPUCopyExternalImageSource;
    public readonly origin?: GPUOrigin2D;
    public readonly flipY?: boolean;

    public constructor(
        source: GPUCopyExternalImageSource,
        origin?: GPUOrigin2D, // {}
        flipY?: boolean, // false
    ) {
        this.source = source;
        this.origin = origin;
        this.flipY = flipY;
    }
}
