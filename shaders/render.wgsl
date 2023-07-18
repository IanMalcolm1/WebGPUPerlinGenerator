struct VertIn {
    @builtin(instance_index) instance_index: u32,
    @builtin(vertex_index) vert_index: u32,
    @location(0) pos: vec2f
};

struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) color: vec4f
};

struct Dimension {
    map_len_sections: u32,
    triangle_unit_len: u32
};

@group(0) @binding(0) var<uniform> dim: Dimension;
@group(0) @binding(1) var<uniform> perpective_matrix: mat4x4f;
@group(0) @binding(2) var<storage> height_map: array<f32>;



fn get_height_map_index(in: VertIn) -> u32 {
    let rowIndex: u32 = in.instance_index%dim.map_len_sections + (in.vert_index/2)*(dim.map_len_sections+1)+(in.vert_index%2);
    let globalIndex: u32 = rowIndex + (in.instance_index/dim.map_len_sections)*(dim.map_len_sections*2+2);
    return globalIndex;
}

@vertex
fn vert_entry(in: VertIn) -> VertOut {
    var out: VertOut;
    out.pos = vec4f(
        in.pos.x+f32(dim.triangle_unit_len*(in.instance_index%dim.map_len_sections)),
        in.pos.y+sqrt(3)*f32(dim.triangle_unit_len*(in.instance_index/dim.map_len_sections)),
        height_map[get_height_map_index(in)],
        1
    );

    out.pos = perpective_matrix*out.pos;

    out.color = vec4f(
        f32(in.instance_index)/(f32(dim.map_len_sections*dim.map_len_sections)/3.5),
        0,
        1-f32(in.instance_index)/(f32(dim.map_len_sections*dim.map_len_sections)/3.5),
        1
    );
    return out;
}


@fragment
fn frag_entry(input: VertOut) -> @location(0) vec4f {
    return input.color;
}