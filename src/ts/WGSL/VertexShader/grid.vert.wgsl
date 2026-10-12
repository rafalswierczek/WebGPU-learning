// Trójkąt pokrywający cały ekran. Bez vertex buffera i bez index buffera -
// pozycje rogów są wyliczalne z indeksu wierzchołka.
@vertex
fn main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4f
{
    var corners = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f( 3.0, -1.0),
        vec2f(-1.0,  3.0),
    );

    return vec4f(corners[vertex_index], 0.0, 1.0);
}
