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

struct HeightColor {
    height: f32,
    r: f32,
    g: f32,
    b: f32
};

@group(0) @binding(0) var<uniform> dim: Dimension;
@group(0) @binding(1) var<uniform> perpective_matrix: mat4x4f;
@group(0) @binding(2) var<storage> colors: array<HeightColor>;
@group(0) @binding(3) var<storage> height_map: array<f32>;



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

    out.color = get_color(out.pos.z);

    out.pos = perpective_matrix*out.pos;

    return out;
}

fn get_color(height: f32) -> vec4f {
    var i: u32 = 1;
    while (colors[i].height < height) {
        i++;
    }

    let lerpFrac: f32 = (height-colors[i-1].height)/(colors[i].height-colors[i-1].height);

    return vec4f(
        interpolate(lerpFrac, colors[i-1].r, colors[i].r),
        interpolate(lerpFrac, colors[i-1].g, colors[i].g),
        interpolate(lerpFrac, colors[i-1].b, colors[i].b),
        1
    );
}

fn interpolate(frac: f32, val1: f32, val2: f32) -> f32 {
    return val1 + (val2-val1)*frac;
}


@fragment
fn frag_entry(input: VertOut) -> @location(0) vec4f {
    return input.color;
}