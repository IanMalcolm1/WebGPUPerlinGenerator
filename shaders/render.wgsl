struct VertIn {
    @builtin(instance_index) instance_index: u32,
    @location(0) pos: vec2f
};

struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) color: vec4f
}

struct Dimension {
    map_length_triangles: u32,
    triangle_unit_length: u32
}

@group(0) @binding(0) var<uniform> dimension: Dimension;
@group(0) @binding(1) var<uniform> perpective_matrix: mat4x4f;
@group(0) @binding(2) var<storage> height_map: array<f32>;

@vertex
fn vert_entry(in: VertIn) -> VertOut {
    var out: VertOut;
    out.pos = vec4f(
        in.pos.x+128+f32(dimension.triangle_unit_length*(in.instance_index%dimension.map_length_triangles)),
        in.pos.y+128+sqrt(3)*f32(2*dimension.triangle_unit_length*(in.instance_index/dimension.map_length_triangles)),
        0, 1
    );

    out.pos = perpective_matrix*out.pos;

    out.color = vec4f(0,1,1,1);
    return out;
}

@fragment
fn frag_entry(input: VertOut) -> @location(0) vec4f {
    return input.color;
}