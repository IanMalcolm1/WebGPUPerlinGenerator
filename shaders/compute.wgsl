struct VerticesInfo {
    length: u32,
    height: u32
};

@group(0) @binding(0) var<uniform> vertices: VerticesInfo;
@group(0) @binding(1) var<storage, read_write> heights: array<f32>;
@group(0) @binding(2) var<storage, read_write> gradients: array<vec2f>;
@group(0) @binding(3) var<storage, read_write> upLeft: array<f32>;
@group(0) @binding(4) var<storage, read_write> upRight: array<f32>;
@group(0) @binding(5) var<storage, read_write> lowLeft: array<f32>;
@group(0) @binding(6) var<storage, read_write> lowRight: array<f32>;

@compute @workgroup_size(8, 8)
fn perlin_entry(@builtin(global_invocation_id) coords: vec3u) {
    if (coords.x>=vertices.length || coords.y >= vertices.height) {
        return;
    }
    let index: u32 = coords.x + (coords.y*vertices.length);
    heights[index] = f32(pcg(index));
    /*
    if (coords.y==0) {
        heights[index] = 100;
    }
    else if (coords.x==0) {
        heights[index] = 200;
    }
    else {
        heights[index] = 0;
    }*/
}

//Taken from https://www.shadertoy.com/view/XlGcRh
fn pcg(v: u32) -> u32 {
    let state: u32 = v * 747796405u + 2891336453u;
	let word: u32 = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return ((word >> 22u) ^ word)%500;

    /* 2D Version (probably necessary)
    v is a vec2u

    v = v * 1664525u + 1013904223u;

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>16u);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>16u);

    return v;
    */
}