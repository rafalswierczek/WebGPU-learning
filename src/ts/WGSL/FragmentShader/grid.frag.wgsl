struct Frame
{
    /** pozycja lewego dolnego rogu kamery w pikselach świata */
    camera: vec2f,
    canvas_size: vec2f,
    /** bok kafla w pikselach świata */
    cell_size: f32,
    /** bok chunka w pikselach świata */
    chunk_size: f32,
    /** ile pikseli ekranu przypada na piksel świata; osobno na oś, bo kafel nie musi być kwadratem */
    scale: vec2f,
    /** siatka atlasu tekstur: kolumny, wiersze - siatka jej nie używa, ale uniform jest wspólny */
    atlas: vec2f,
}

@group(0) @binding(0) var<uniform> frame: Frame;

const BACKGROUND: vec4f = vec4f(0.07, 0.07, 0.09, 1.0);
const GRID_LINE: vec4f = vec4f(0.20, 0.20, 0.24, 1.0);
const CHUNK_LINE: vec4f = vec4f(0.28, 0.42, 0.55, 1.0);
const ORIGIN_LINE: vec4f = vec4f(0.55, 0.35, 0.25, 1.0);
const LINE_PX: f32 = 1.0;
const MIN_GRID_PX: f32 = 4.0;

@fragment
fn main(@builtin(position) frag_position: vec4f) -> @location(0) vec4f
{
    // frag_position ma origin w lewym GÓRNYM rogu i rośnie w dół, świat rośnie w górę
    let canvas_coord: vec2f = vec2f(frag_position.x, frame.canvas_size.y - frag_position.y);
    let world_coord: vec2f = frame.camera + canvas_coord / frame.scale;

    // odległości liczone w pikselach EKRANU, więc linia ma 1 px przy każdym przybliżeniu
    let origin_px: vec2f = world_coord * frame.scale;

    if (min(origin_px.x, origin_px.y) < LINE_PX) {
        return ORIGIN_LINE;
    }

    let chunk_px: vec2f = frame.chunk_size * frame.scale;

    if (min(chunk_px.x, chunk_px.y) >= MIN_GRID_PX) {
        let chunk_offset: vec2f = (world_coord % vec2f(frame.chunk_size)) * frame.scale;

        if (min(chunk_offset.x, chunk_offset.y) < LINE_PX) {
            return CHUNK_LINE;
        }
    }

    // przy dużym oddaleniu kafle schodzą poniżej piksela - siatka zlałaby się w jednolitą szarość
    let cell_px: vec2f = frame.cell_size * frame.scale;

    if (min(cell_px.x, cell_px.y) >= MIN_GRID_PX) {
        let cell_offset: vec2f = (world_coord % vec2f(frame.cell_size)) * frame.scale;

        if (min(cell_offset.x, cell_offset.y) < LINE_PX) {
            return GRID_LINE;
        }
    }

    return BACKGROUND;
}
