import * as utils from "./utils";
import { mat4 } from "gl-matrix";

async function main() {
    const { device, canvas, context } = await utils.init();

    // Plane Dimensions (or Dimension, really)
    const mapLengthTriangles: number = 18;
    const unitLength: number = 32; //for triangle spacing
    const planeDimensionsUniform: GPUBuffer = device.createBuffer({
        label: "Plane Dimensions",
        size: 2 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const planeDimensions: Uint32Array = new Uint32Array([mapLengthTriangles, unitLength]);
    device.queue.writeBuffer(planeDimensionsUniform, 0, planeDimensions);


    // Vertex Buffer (just an equilateral triangle)
    const vertexData: Float32Array = new Float32Array([
        0, 0,   2*unitLength, 0,
        unitLength, unitLength*Math.sqrt(3),   3*unitLength, unitLength*Math.sqrt(3),
        0, 2*unitLength*Math.sqrt(3),   2*unitLength, 2*unitLength*Math.sqrt(3),
    ]);
    const vertexBuffer: GPUBuffer = device.createBuffer({
        label: "Vertex Buffer",
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);

    const vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 8,
        attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }]
    }


    // Index Buffer
    const indexData: Uint16Array = new Uint16Array([
        0,2,1,  1,2,3,  2,4,5,  2,5,3
    ]);
    const indexBuffer: GPUBuffer = device.createBuffer({
        label: "Triangles Arrow Instance Buffer",
        size: indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(indexBuffer, 0, indexData);


    // Height Map Buffer
    const heightMapBuffer: GPUBuffer = device.createBuffer({
        label: "Height Map",
        size: mapLengthTriangles * mapLengthTriangles * 4,
        usage: GPUBufferUsage.STORAGE
    });
    //TODO: test if compute shaders can write to vertex buffers
    //TODO: either way, get this populated in a compute shader


    //Perspective Matrix
    const perspectiveBuffer: GPUBuffer = device.createBuffer({
        label: "Perspective Matrix Buffer",
        size: 16 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const perpsectiveMatrix: mat4 = mat4.create();
    mat4.set(perpsectiveMatrix,
        2 / canvas.clientWidth, 0, 0, 0,
        0, -2 / canvas.clientHeight, 0, 0,
        0, 0, 1, 0,
        -1, 1, 0, 1
    );
    // TODO: change back to an actual perspective matrix
    /*
    utils.fillPerspectiveMatrix(
        perpsectiveMatrix,
        Math.PI / 3,
        canvas.clientWidth / canvas.clientHeight,
        -1, -1500
    ); */
    device.queue.writeBuffer(perspectiveBuffer, 0, new Float32Array(perpsectiveMatrix));


    // Render Bind Group
    const renderBindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
        label: "Render Bind Group Layout",
        entries: [{
            //dimensions
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "uniform" }
        }, {
            //perspective matrix
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "uniform" }
        }, {
            //height map
            binding: 2,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "read-only-storage" }
        }]
    });
    const renderBindGroup: GPUBindGroup = device.createBindGroup({
        label: "Render Bind Group",
        layout: renderBindGroupLayout,
        entries: [{
            binding: 0,
            resource: { buffer: planeDimensionsUniform }
        }, {
            binding: 1,
            resource: { buffer: perspectiveBuffer }
        }, {
            binding: 2,
            resource: { buffer: heightMapBuffer }
        }]
    });


    // Render Module
    const renderShadersFile = await fetch("./shaders/render.wgsl");
    const renderShaders = await renderShadersFile.text();
    const renderModule: GPUShaderModule = device.createShaderModule({
        label: "F shader module",
        code: renderShaders
    });


    // Render Pipeline
    const renderPipelineLayout: GPUPipelineLayout = device.createPipelineLayout({
        label: "Render Pipeline Layout",
        bindGroupLayouts: [renderBindGroupLayout]
    });

    const renderPipeline: GPURenderPipeline = device.createRenderPipeline({
        label: "Render Pipeline",
        layout: renderPipelineLayout,
        vertex: {
            module: renderModule,
            entryPoint: "vert_entry",
            buffers: [vertexBufferLayout]
        },
        fragment: {
            module: renderModule,
            entryPoint: "frag_entry",
            targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
        },
        primitive: {
            //cullMode: "back",
        },
        /*
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        }*/
    });


    //Pipeline
    const encoder: GPUCommandEncoder = device.createCommandEncoder({ label: "Command encoder" });
    const pass: GPURenderPassEncoder = encoder.beginRenderPass({
        label: "Render Pass Encoder",
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 1, a: 1 },
            loadOp: "clear",
            storeOp: "store"
        }],
        /*
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        }, */
    });

    pass.setPipeline(renderPipeline);
    pass.setBindGroup(0, renderBindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");
    pass.drawIndexed(indexData.length, mapLengthTriangles*4);
    pass.end()

    device.queue.submit([encoder.finish()]);
}

main();