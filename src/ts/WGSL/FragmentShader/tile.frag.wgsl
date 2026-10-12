@group(1) @binding(1) var tile_atlas: texture_2d<f32>;
@group(1) @binding(2) var tile_sampler: sampler;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f
{
    return textureSample(tile_atlas, tile_sampler, uv);
}
