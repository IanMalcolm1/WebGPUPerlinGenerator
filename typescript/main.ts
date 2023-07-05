import * as utils from "./utils";

async function main() {
    const { device, canvas, context } = await utils.init();

    // Plane Dimensions (or Dimension, really)
    const mapLength: number = 128;
    const planeDimensionsUniform: GPUBuffer = device.createBuffer({
        label: "Plane Dimensions",
        size: 1 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const planeDimensions: Uint32Array = new Uint32Array([mapLength]);
    device.queue.writeBuffer(planeDimensionsUniform, 0, planeDimensions);


    // Height Map Buffer
    const heightMapBuffer: GPUBuffer = device.createBuffer({
        label: "Height Map",
        size: mapLength*mapLength * 4,
        usage: GPUBufferUsage.STORAGE
    });
    //TODO: test if compute shaders can write to vertex buffers
    //TODO: either way, get this populated in a compute shader


    // TODO: Remove?
    const vertexData: Float32Array = new Float32Array([
        -1, -1,
        1, -1,
        0, 1
    ]);
    const vertexBuffer: GPUBuffer = device.createBuffer({
        label: "Vertex Buffer",
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);
    const vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 8,
        attributes: [
            { format: "float32x2", offset: 0, shaderLocation: 0 }
        ]
    };


    // Render Bind Group
    const renderBindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
        label: "Render Bind Group Layout",
        entries: [{
            //dimensions
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: { type: "uniform" }
        }, {
            //height map
            binding: 1,
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
        /*
        primitive: {
            cullMode: "back"
        },
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
            clearValue: { r: 0.7, g: 0, b: 1, a: 1 },
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
    pass.draw(3, 1);
    pass.end()
    
    device.queue.submit([encoder.finish()]);
}

main();