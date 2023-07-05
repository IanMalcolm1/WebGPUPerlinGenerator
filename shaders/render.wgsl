struct VertIn {
    @builtin(instance_index) instanceInd: u32,
    @builtin(vertex_index) vertInd: u32,
    @location(0) pos: vec2f
};

struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) color: vec4f
}

@vertex
fn vert_entry(input: VertIn) -> VertOut {
    var out: VertOut;
    out.pos = vec4f(input.pos, 0, 1);
    out.color = vec4f(0,0,1,1);
    return out;
}

@fragment
fn frag_entry(input: VertOut) -> @location(0) vec4f {
    return input.color;
}