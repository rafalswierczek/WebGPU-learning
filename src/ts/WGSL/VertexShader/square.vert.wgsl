struct WsToCanvas
{
    ratio_x: u32,
    ratio_y: u32,
}

struct Camera
{
    x: u32,
    y: u32,
}

struct BaseSquare
{
    left_top: vec2f,
    left_bottom: vec2f,
    right_bottom: vec2f,
    right_top: vec2f,
}

struct Square
{
    camera_offset_x: i32,
    camera_offset_y: i32,
}

struct SquareOutput
{
    @builtin(position) pos: vec4f,
}

// uniform buffer store data constant for every iteration of the vertex shader
@group(0) @binding(0) var<uniform> ws_to_canvas_ratio : WsToCanvas;
@group(0) @binding(1) var<uniform> cs_scaled_base_square: BaseSquare;
@group(1) @binding(0) var<storage, read> squares: array<Square>; // squares to render for current camera position

@vertex
fn main(@builtin(instance_index) instance: u32) -> SquareOutput
{
    let ws_square_pos_camera_offset: vec2f = vec2f(f32(squares[instance].camera_offset_x), f32(squares[instance].camera_offset_y));
    let ws_camera: vec2f = vec2f(f32(canvas.width), f32(canvas.height));

    let cs_square_left_bottom_point: vec2f = world_space_to_clip_space(ws_square_pos_camera_offset, ws_camera);

    let cs_distance_from_square_to_scaled_base_square: vec2f = abs(cs_scaled_base_square.left_bottom - cs_square_left_bottom_point);

    let cs_transformed_square: BaseSquare = translate_square(cs_scaled_base_square, cs_distance_from_square_to_scaled_base_square);

    var square_output: SquareOutput;

    square_output.pos = vec4f(1.0, 1.0, 0.0, 1.0);

    return square_output;
}

/*
 * 
 */
fn world_space_to_clip_space(ws_square_pos_camera_offset: vec2f, ws_to_canvas_ratio: f32) -> vec2f
{
    let ws_coord: vec2f = 
    let ws_square_pos_to_canvas_ratio: vec2f = ws_square_pos_camera_offset / ws_canvas;

    let ndc: vec2f = 2.0 * ws_square_pos_to_canvas_ratio - 1.0;

    return ndc;
}

fn translate_square(cs_scaled_base_square: BaseSquare, offset: vec2f) -> BaseSquare
{
    var output: BaseSquare = cs_scaled_base_square;

    if (output.left_bottom[0] < offset[0]) {
        output.left_top[0] -= offset[0];
        output.right_top[0] -= offset[0];
        output.right_bottom[0] -= offset[0];
    } else {
        output.left_top[0] += offset[0];
        output.right_top[0] += offset[0];
        output.right_bottom[0] += offset[0];
    }

    if (output.left_bottom[1] < offset[1]) {
        output.left_top[1] -= offset[1];
        output.right_top[1] -= offset[1];
        output.right_bottom[1] -= offset[1];
    } else {
        output.left_top[1] += offset[1];
        output.right_top[1] += offset[1];
        output.right_bottom[1] += offset[1];
    }

    return output;
}
