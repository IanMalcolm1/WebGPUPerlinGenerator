struct VerticesInfo {
    width: u32,
    height: u32,
    sideLength: u32
};

@group(0) @binding(0) var<uniform> vertices: VerticesInfo;
@group(0) @binding(1) var<storage, read_write> gradients: array<vec2f>;

@compute @workgroup_size(8,8)
fn generate_gradients(@builtin(global_invocation_id) index: vec3u) {
    if (index.x > vertices.width || index.y > vertices.height) {
        return;
    }
    let base = pcg2d(vec2u(index.x, index.y));
    let base_f = vec2f(f32(base.x), f32(base.y));
    let magnitude = sqrt(base_f.x*base_f.x + base_f.y*base_f.y);
    let unitVec = base_f/magnitude;

    gradients[index.x+index.y*vertices.width] = unitVec;
}

fn pcg2d(in: vec2u) -> vec2u {
    var v = in * 1664525u + 1013904223u;

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v.x = v.x ^ (in.x>>16u);
    v.y = v.y ^ (in.y>>16u);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v.x = v.x ^ (in.x>>16u);
    v.y = v.y ^ (in.y>>16u);

    return v;
}