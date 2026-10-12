struct Frame
{
    camera: vec2f,
    canvas_size: vec2f,
    cell_size: f32,
    chunk_size: f32,
    scale: vec2f,
    /** siatka atlasu tekstur: kolumny, wiersze */
    atlas: vec2f,
}

/** Jedna miniatura: prostokąt w pikselach canvasa i slot w atlasie tekstur */
struct Thumbnail
{
    /** x, y, szerokość, wysokość w pikselach canvasa; origin w lewym górnym rogu */
    rect: vec4f,
    texture_slot: u32,
    reserved_a: u32,
    reserved_b: u32,
    reserved_c: u32,
}

struct Output
{
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(1) @binding(0) var<storage, read> thumbnails: array<Thumbnail>;

@vertex
fn main(@builtin(vertex_index) vertex_index: u32, @builtin(instance_index) instance_index: u32) -> Output
{
    // kwadrat = 2 trójkąty; rogi liczone z indeksu wierzchołka, bez żadnych buforów
    var corners = array<vec2f, 6>(
        vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
        vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),
    );

    let thumbnail: Thumbnail = thumbnails[instance_index];
    let corner: vec2f = corners[vertex_index];
    let pixel: vec2f = thumbnail.rect.xy + corner * thumbnail.rect.zw;

    // piksele canvasa (origin lewy górny) -> clip space
    let ndc: vec2f = vec2f(
        pixel.x / frame.canvas_size.x * 2.0 - 1.0,
        1.0 - pixel.y / frame.canvas_size.y * 2.0,
    );

    // tekstura i prostokąt UI mają origin w tym samym rogu, więc wnętrze komórki idzie wprost z rogu
    let slot: f32 = f32(thumbnail.texture_slot);
    let cell: vec2f = vec2f(slot % frame.atlas.x, floor(slot / frame.atlas.x));

    var output: Output;

    output.position = vec4f(ndc, 0.0, 1.0);
    output.uv = (cell + corner) / frame.atlas;

    return output;
}
