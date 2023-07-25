struct VerticesInfo {
    width: u32,
    height: u32,
    sideLength: u32
};

@group(0) @binding(0) var<uniform> vertices: VerticesInfo;
@group(0) @binding(1) var<uniform> seed: u32;
@group(0) @binding(2) var<storage, read_write> gradients: array<vec2f>;

const PI = 3.141592654;

@compute @workgroup_size(8,8)
fn generate_gradients(@builtin(global_invocation_id) index: vec3u) {
    if (index.x >= vertices.width || index.y >= vertices.height) {
        return;
    }
    let base = pcg2d(vec2u(index.x, index.y));
    let base_f = vec2f(f32(base.x%1000000)/1000000, f32(base.y%1000000)/1000000);

    let theta = acos(2*base_f.x-1);
    let phi = 2*base_f.y*PI;

    let grad = vec2f(
        cos(phi) * sin(theta),
        sin(phi) * sin(theta)
    );

    gradients[index.x+index.y*vertices.width] = grad;
}


fn pcg2d(in: vec2u) -> vec2u {
    let num = seed + in.x*2 + in.y*vertices.width*2;
    return vec2u(pcg1d(num), pcg1d(num+1));
}

fn pcg1d(in: u32) -> u32 {
    let state: u32 = in*747796405+2891336453;
    let word: u32 = ((state >> ((state>>28) + 4u)) ^ state) * 277803737;
    return (word >> 22) ^ word;
}