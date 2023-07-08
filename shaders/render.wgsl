struct VertIn {
    @builtin(instance_index) instance_index: u32,
    @location(0) pos: vec2f
};

struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) color: vec4f
}

struct Dimension {
    map_len_triangles: u32,
    triangle_unit_len: u32
}

@group(0) @binding(0) var<uniform> dim: Dimension;
@group(0) @binding(1) var<uniform> perpective_matrix: mat4x4f;
@group(0) @binding(2) var<storage> height_map: array<f32>;

@vertex
fn vert_entry(in: VertIn) -> VertOut {
    var out: VertOut;
    out.pos = vec4f(
        in.pos.x+f32(dim.triangle_unit_len*(in.instance_index%dim.map_len_triangles)),
        in.pos.y+sqrt(3)*f32(2*dim.triangle_unit_len*(in.instance_index/(3*dim.map_len_triangles))),
        0, 1
    );

    out.pos = perpective_matrix*out.pos;

    out.color = vec4f(
        f32(in.instance_index)/f32(dim.map_len_triangles*dim.map_len_triangles),
        0,
        1-f32(in.instance_index)/f32(dim.map_len_triangles*dim.map_len_triangles),
        1
    );
    return out;
}

@fragment
fn frag_entry(input: VertOut) -> @location(0) vec4f {
    return input.color;
}