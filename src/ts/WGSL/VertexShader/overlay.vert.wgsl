struct Frame
{
    camera: vec2f,
    canvas_size: vec2f,
    cell_size: f32,
    chunk_size: f32,
    scale: vec2f,
    atlas: vec2f,
}

/** Jeden prostokąt HUD: tło panelu albo pojedynczy znak */
struct Quad
{
    /** x, y, szerokość, wysokość w pikselach canvasa; origin w lewym górnym rogu */
    rect: vec4f,
    /** u0, v0, u1, v1 w atlasie */
    uv_rect: vec4f,
    color: vec4f,
}

struct Output
{
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(1) @binding(0) var<storage, read> quads: array<Quad>;

@vertex
fn main(@builtin(vertex_index) vertex_index: u32, @builtin(instance_index) instance_index: u32) -> Output
{
    // kwadrat = 2 trójkąty; rogi liczone z indeksu wierzchołka, bez żadnych buforów
    var corners = array<vec2f, 6>(
        vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
        vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),
    );

    let quad: Quad = quads[instance_index];
    let corner: vec2f = corners[vertex_index];
    let pixel: vec2f = quad.rect.xy + corner * quad.rect.zw;

    // piksele canvasa (origin lewy górny) -> clip space
    let ndc: vec2f = vec2f(
        pixel.x / frame.canvas_size.x * 2.0 - 1.0,
        1.0 - pixel.y / frame.canvas_size.y * 2.0,
    );

    var output: Output;

    output.position = vec4f(ndc, 0.0, 1.0);
    output.uv = mix(quad.uv_rect.xy, quad.uv_rect.zw, corner);
    output.color = quad.color;

    return output;
}
