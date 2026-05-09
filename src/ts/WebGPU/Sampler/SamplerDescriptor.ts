export class SamplerDescriptor implements GPUSamplerDescriptor
{
    public readonly label: string;
    public readonly addressModeU?: GPUAddressMode;
    public readonly addressModeV?: GPUAddressMode;
    public readonly addressModeW?: GPUAddressMode;
    public readonly magFilter?: GPUFilterMode;
    public readonly minFilter?: GPUFilterMode;
    public readonly mipmapFilter?: GPUMipmapFilterMode;
    public readonly lodMinClamp?: number;
    public readonly lodMaxClamp?: number;
    public readonly compare?: GPUCompareFunction;
    public readonly maxAnisotropy?: number;

    public constructor (
        label: string,
        addressModeU?: GPUAddressMode, // "clamp-to-edge"
        addressModeV?: GPUAddressMode, // "clamp-to-edge"
        addressModeW?: GPUAddressMode, // "clamp-to-edge"
        magFilter?: GPUFilterMode, // "nearest",
        minFilter?: GPUFilterMode, // "nearest",
        mipmapFilter?: GPUMipmapFilterMode, // "nearest"
        lodMinClamp?: number, // 0
        lodMaxClamp?: number, // 32
        compare?: GPUCompareFunction, 
        maxAnisotropy?: number, // 1
    ) {
        this.label = label;
        this.addressModeU = addressModeU;
        this.addressModeV = addressModeV;
        this.addressModeW = addressModeW;
        this.magFilter = magFilter;
        this.minFilter = minFilter;
        this.mipmapFilter = mipmapFilter;
        this.lodMinClamp = lodMinClamp;
        this.lodMaxClamp = lodMaxClamp;
        this.compare = compare;
        this.maxAnisotropy = maxAnisotropy;
    }
}
