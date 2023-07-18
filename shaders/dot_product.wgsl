struct VerticesInfo {
    width: u32,
    height: u32,
    triangleSideLength: u32
};

@group(0) @binding(0) var<uniform> vertices: VerticesInfo;
@group(0) @binding(1) var<storage> gradients: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> upLeft: array<vec2f>;
@group(0) @binding(3) var<storage, read_write> upRight: array<vec2f>;
@group(0) @binding(4) var<storage, read_write> bottomLeft: array<vec2f>;
@group(0) @binding(5) var<storage, read_write> bottomRight: array<vec2f>;

@compute @workgroup_size(8,8)
fn generate_dots(@builtin(global_invocation_id) index: vec3u) {
    //position relative to gradients box
    var position: vec2f;
    if ((index.y/vertices.width)%2==0) {
        position = vec2f(
            f32(vertices.triangleSideLength/2),
            sqrt(3)*f32(vertices.triangleSideLength)
        );
    }
    else {
        position = vec2f(
            f32(index.x%2*vertices.triangleSideLength),
            f32((index.y/vertices.width)%3*vertices.triangleSideLength/2)*sqrt(3)
        );
    }


}