struct VerticesInfo {
    width: u32,
    height: u32,
    sideLength: f32
};

@group(0) @binding(0) var<uniform> allVertices: VerticesInfo;
@group(0) @binding(1) var<uniform> gradVertices: VerticesInfo;
@group(0) @binding(2) var<storage> gradients: array<vec2f>;
@group(0) @binding(3) var<storage, read_write> heights: array<f32>;

@compute @workgroup_size(8,8)
fn generate_dots(@builtin(global_invocation_id) index: vec3u) {
    let coords = map_coords(index);
    let ulGradCoords = vec2u(
        u32(floor(coords.x/gradVertices.sideLength)),
        u32(floor(coords.y/gradVertices.sideLength))
    );

    let offset = vec2f(
        (coords.x-f32(ulGradCoords.x)*gradVertices.sideLength)/gradVertices.sideLength,
        (coords.y-f32(ulGradCoords.y)*gradVertices.sideLength)/gradVertices.sideLength
    );
    let urVec = vec2f(1-offset.x, offset.y);
    let blVec = vec2f(offset.x, 1-offset.y);
    let brVec = vec2f(1-offset.x, 1-offset.y);

    let ulDot = dot(offset, gradients[grad_1d_index(ulGradCoords)]);
    let urDot = dot(urVec, gradients[grad_1d_index(vec2u(ulGradCoords.x+1, ulGradCoords.y))]);
    let blDot = dot(blVec, gradients[grad_1d_index(vec2u(ulGradCoords.x, ulGradCoords.y+1))]);
    let brDot = dot(brVec, gradients[grad_1d_index(vec2u(ulGradCoords.x+1, ulGradCoords.y+1))]);

    let fadeX = fade(offset.x);
    let fadeY = fade(offset.y);

    heights[map_1d_index(index)] = 100*interpolate(
        fadeY,
        interpolate(fadeX, ulDot, urDot),
        interpolate(fadeX, blDot, brDot)
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
    return index.x+index.y*gradVertices.width;
}

fn map_1d_index(index: vec3u) -> u32 {
    return index.x + index.y*allVertices.width;
}