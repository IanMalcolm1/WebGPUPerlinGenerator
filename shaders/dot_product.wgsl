struct VerticesInfo {
    width: u32,
    height: u32,
    sideLength: f32
};

@group(0) @binding(0) var<uniform> allVertices: VerticesInfo;
@group(0) @binding(1) var<uniform> gradVertices: VerticesInfo;
@group(0) @binding(2) var<uniform> amplitude: f32;
@group(0) @binding(3) var<storage> gradients: array<vec2f>;
@group(0) @binding(4) var<storage, read_write> heights: array<f32>;

@compute @workgroup_size(8,8)
fn generate_dots(@builtin(global_invocation_id) index: vec3u) {
    if (index.x>=allVertices.width || index.y>=allVertices.height) {
        return;
    }

    let coords = map_coords(index);
    let ulGradVertex = vec2u(
        u32(floor(coords.x/gradVertices.sideLength)),
        u32(floor(coords.y/gradVertices.sideLength))
    );

    let offset = vec2f(
        (coords.x-f32(ulGradVertex.x)*gradVertices.sideLength)/gradVertices.sideLength,
        (coords.y-f32(ulGradVertex.y)*gradVertices.sideLength)/gradVertices.sideLength
    );
    let urVec = vec2f(offset.x-1, offset.y);
    let blVec = vec2f(offset.x, offset.y-1);
    let brVec = vec2f(offset.x-1, offset.y-1);

    let ulDot = dot(offset, gradients[grad_1d_index(ulGradVertex)]);
    let urDot = dot(urVec, gradients[grad_1d_index(vec2u(ulGradVertex.x+1, ulGradVertex.y))]);
    let blDot = dot(blVec, gradients[grad_1d_index(vec2u(ulGradVertex.x, ulGradVertex.y+1))]);
    let brDot = dot(brVec, gradients[grad_1d_index(vec2u(ulGradVertex.x+1, ulGradVertex.y+1))]);

    let fadeX = fade(offset.x);
    let fadeY = fade(offset.y);

    heights[map_1d_index(index)] += amplitude*interpolate(
        fadeX,
        interpolate(fadeY, ulDot, blDot),
        interpolate(fadeY, urDot, brDot)
    );
}

fn map_coords(index: vec3u) -> vec2f {
    let triangleHeight = sqrt(3)*allVertices.sideLength/2;
    return vec2f(
        allVertices.sideLength*f32(index.x) + f32(index.y%2)*allVertices.sideLength/2,
        triangleHeight*f32(index.y)
    );
}

fn fade(x: f32) -> f32 {
    return ((6*x-15)*x+10)*x*x*x;
}

fn interpolate(frac: f32, val1: f32, val2: f32) -> f32 {
    return val1 + (val2-val1)*frac;
}

fn grad_1d_index(index: vec2u) -> u32 {
    return index.x + index.y*gradVertices.width;
}

fn map_1d_index(index: vec3u) -> u32 {
    return index.x + index.y*allVertices.width;
}