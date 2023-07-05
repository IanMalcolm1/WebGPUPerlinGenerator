struct VertIn {
    @builtin(instance_index) instanceInd: u32,
    @builtin(vertex_index) vertInd: u32
};

struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) color: vec4f
}

@vertex
fn (input: VertIn) -> VertOut {

}

@fragment
fn (input: VertOut) -> @location(0) color: vec4f {
    
}