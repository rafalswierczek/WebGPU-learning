struct Camera // coords from the left bottom border of the world space
{
    offset_x: f32,
    offset_y: f32,
}

struct Triangle
{
    a: vec2f,
    b: vec2f,
    c: vec2f,
}

struct Output
{
    @builtin(position) pos: vec4f,
}

// uniform buffer store data constant for every iteration of the vertex shader
@group(0) @binding(0) var<uniform> camera: vec2f;
@group(0) @binding(1) var<uniform> canvas_size: vec2f;
@group(1) @binding(0) var<storage, read> objects: array<Triangle>;

@vertex
fn main(@builtin(instance_index) instance: u32) -> Output
{
    let cs_vertex_a: vec2f = world_space_to_clip_space(objects[instance].a, camera, canvas_size);
    let cs_vertex_b: vec2f = world_space_to_clip_space(objects[instance].b camera, canvas_size);
    let cs_vertex_c: vec2f = world_space_to_clip_space(objects[instance].c, camera, canvas_size);

    var output: SquareOutput;

    output.pos = vec4f(1.0, 1.0, 0.0, 1.0);

    return output;
}

fn world_space_to_clip_space(ws_coord: vec2f, camera: vec2f, canvas_size: vec2f) -> vec2f
{
    const viewport: vec2f = vec2f(800, 600);

    const canvas_to_viewport_ratio: vec2f = vec2f(canvas_size[0] / viewport[0], canvas_size[1] / viewport[1]);
  
    // just in case if the viewport is smaller or bigger than canvas; if ws_coord was used instead of ws_coord_real, everything would be deformed
  	const ws_coord_real: vec2f = vec2f(canvas_to_viewport_ratio[0] * ws_coord[0], canvas_to_viewport_ratio[1] * ws_coord[1]);
  
    // how far from the camera origin is the coord inside the viewport
  	const coord_in_viewport: vec2f = vec2f(ws_coord_real[0] - camera[0], ws_coord_real[1] - camera[1]);

    return viewport_to_clip_space(coord_in_viewport, canvas_size);
}

fn viewport_to_clip_space(coord_in_viewport: vec2f, canvas_size: vec2f) -> vec2f
{  
    // from 0 to 1, how far (in percent) from the camera origin is the coord inside the viewport; if less than 0 or greater than 1, NDC will be out of bounds
  	const coord_in_viewport_to_canvas_ratio: vec2f = vec2f(coord_in_viewport[0] / canvas_size[0], coord_in_viewport[1] / canvas_size[1]);
  
    // NDC, can be out of bounds (GPU should ignore it)
  	return vec2f(2 * coord_in_viewport_to_canvas_ratio[0] - 1, 2 * coord_in_viewport_to_canvas_ratio[1] - 1);
}
