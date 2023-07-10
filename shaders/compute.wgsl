struct VerticesInfo {
    length: u32,
    height: u32
};

@group(0) @binding(0) var<uniform> vertices: VerticesInfo;
@group(0) @binding(1) var<storage, read_write> heights: array<f32>;

@compute @workgroup_size(8, 8)
fn perlin_entry(@builtin(global_invocation_id) coords: vec3u) {
    if (coords.x>=vertices.length || coords.y >= vertices.height) {
        return;
    }
    let index: u32 = coords.x + (coords.y*vertices.length);
    if (coords.y==0) {
        heights[index] = 100;
    }
    else if (coords.x==0) {
        heights[index] = 200;
    }
    else {
        heights[index] = 0;
    }
}