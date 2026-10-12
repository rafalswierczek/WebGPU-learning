@group(1) @binding(1) var atlas: texture_2d<f32>;
@group(1) @binding(2) var atlas_sampler: sampler;

// Atlas niesie tylko pokrycie w kanale alpha - kolor bierzemy z instancji,
// dzięki czemu ten sam glif da się narysować w dowolnym kolorze bez drugiej tekstury.
@fragment
fn main(@location(0) uv: vec2f, @location(1) color: vec4f) -> @location(0) vec4f
{
    let coverage: f32 = textureSample(atlas, atlas_sampler, uv).a;

    return vec4f(color.rgb, color.a * coverage);
}
