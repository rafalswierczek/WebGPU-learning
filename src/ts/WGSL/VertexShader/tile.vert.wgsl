struct Frame
{
    camera: vec2f,
    canvas_size: vec2f,
    cell_size: f32,
    chunk_size: f32,
    /** piksele canvasa na piksel świata, osobno na oś */
    scale: vec2f,
    /** siatka atlasu tekstur: kolumny, wiersze */
    atlas: vec2f,
}

/** Jeden kafel na instancję: pozycja w świecie + slot w atlasie tekstur */
struct TileInstance
{
    world: vec2f,
    texture_slot: u32,
    reserved: u32,
}

struct Output
{
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(1) @binding(0) var<storage, read> tiles: array<TileInstance>;

@vertex
fn main(@builtin(vertex_index) vertex_index: u32, @builtin(instance_index) instance_index: u32) -> Output
{
    // kwadrat = 2 trójkąty; rogi liczone z indeksu wierzchołka, bez vertex i index buffera
    var corners = array<vec2f, 6>(
        vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
        vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0),
    );

    let tile: TileInstance = tiles[instance_index];
    let corner: vec2f = corners[vertex_index];
    let world: vec2f = tile.world + corner * frame.cell_size;

    // świat -> piksele canvasa (oś Y w górę) -> clip space
    let canvas_coord: vec2f = (world - frame.camera) * frame.scale;
    let ndc: vec2f = canvas_coord / frame.canvas_size * 2.0 - vec2f(1.0);

    // slot -> komórka atlasu; tekstura ma początek w lewym górnym rogu, a kafel w lewym dolnym
    let slot: f32 = f32(tile.texture_slot);
    let cell: vec2f = vec2f(slot % frame.atlas.x, floor(slot / frame.atlas.x));
    let inside: vec2f = vec2f(corner.x, 1.0 - corner.y);

    var output: Output;

    output.position = vec4f(ndc, 0.0, 1.0);
    output.uv = (cell + inside) / frame.atlas;

    return output;
}
