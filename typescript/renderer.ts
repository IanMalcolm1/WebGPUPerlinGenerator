import { mat4, vec3 } from "gl-matrix";
import * as utils from "./utils";

export interface PerspectiveSettings {
    fovY: number,
    translation: vec3,
    rotation: vec3,
    buffer: GPUBuffer,
    matrix: mat4
}

export class Renderer {
    device: GPUDevice;
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    pipeline: GPURenderPipeline;
    vertexBuffer: GPUBuffer;
    bindGroup: GPUBindGroup;
    indexBuffer: GPUBuffer;
    numIndices: number;
    mapLengthTriangles: number;
    triangleUnitLength: number;
    perspective: PerspectiveSettings;

    constructor(device: GPUDevice, canvas: HTMLCanvasElement, context: GPUCanvasContext) {
        this.device = device;
        this.canvas = canvas;
        this.context = context;
        this.triangleUnitLength = 32;
    }

    async init(mapLengthTriangles: number, heightMapBuffer: GPUBuffer) {
        this.mapLengthTriangles = mapLengthTriangles;

        const dimensionsBuffer: GPUBuffer = this.makeDimensionsBuffer();
        const vertexBufferLayout: GPUVertexBufferLayout = this.makeVertexBuffer();
        this.makeIndexBuffer();
        this.makePerspectiveBuffer();
        const shaderModule = await utils.makeShaderModule(this.device, "./shaders/render.wgsl");

        // Render Bind Group
        const renderBindGroupLayout: GPUBindGroupLayout = this.device.createBindGroupLayout({
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
        this.bindGroup = this.device.createBindGroup({
            label: "Render Bind Group",
            layout: renderBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: dimensionsBuffer }
            }, {
                binding: 1,
                resource: { buffer: this.perspective.buffer }
            }, {
                binding: 2,
                resource: { buffer: heightMapBuffer }
            }]
        });


        // Render Pipeline
        const renderPipelineLayout: GPUPipelineLayout = this.device.createPipelineLayout({
            label: "Render Pipeline Layout",
            bindGroupLayouts: [renderBindGroupLayout]
        });

        this.pipeline = this.device.createRenderPipeline({
            label: "Render Pipeline",
            layout: renderPipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: "vert_entry",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: shaderModule,
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
    }

    private makeDimensionsBuffer(): GPUBuffer {
        const planeDimensionsUniform: GPUBuffer = this.device.createBuffer({
            label: "Plane Dimensions",
            size: 2 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const planeDimensions: Uint32Array = new Uint32Array([this.mapLengthTriangles, this.triangleUnitLength]);
        this.device.queue.writeBuffer(planeDimensionsUniform, 0, planeDimensions);

        return planeDimensionsUniform;
    }

    private makeVertexBuffer(): GPUVertexBufferLayout {
        const sqrt3UnitLength = this.triangleUnitLength * Math.sqrt(3);

        const vertexData: Float32Array = new Float32Array([
            0, 0, 2 * this.triangleUnitLength, 0,
            this.triangleUnitLength, sqrt3UnitLength, 3 * this.triangleUnitLength, sqrt3UnitLength,
            0, 2 * sqrt3UnitLength, 2 * this.triangleUnitLength, 2 * sqrt3UnitLength,
        ]);

        this.vertexBuffer = this.device.createBuffer({
            label: "Vertex Buffer",
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }]
        }

        return vertexBufferLayout;
    }

    private makeIndexBuffer() {
        const indexData: Uint16Array = new Uint16Array([
            0, 2, 1, 1, 2, 3, 2, 4, 5, 2, 5, 3
        ]);
        this.numIndices = indexData.length;
        this.indexBuffer = this.device.createBuffer({
            label: "Triangles Arrow Instance Buffer",
            size: indexData.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.indexBuffer, 0, indexData);
    }

    private makePerspectiveBuffer() {
        const perspectiveBuffer: GPUBuffer = this.device.createBuffer({
            label: "Perspective Matrix Buffer",
            size: 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const perpsectiveMatrix: mat4 = mat4.create();
        mat4.set(perpsectiveMatrix,
            2 / this.canvas.clientWidth, 0, 0, 0,
            0, -2 / this.canvas.clientHeight, 0, 0,
            0, 0, 1, 0,
            -1, 1, 0, 1
        );

        this.perspective = {
            fovY: Math.PI / 3,
            translation: vec3.create(),
            rotation: vec3.create(),
            buffer: perspectiveBuffer,
            matrix: perpsectiveMatrix
        }

        // TODO: change back to an actual perspective matrix
        // And update with gui (and later mouse controls)
        //this.fillPerspectiveMatrix();

        this.device.queue.writeBuffer(perspectiveBuffer, 0, new Float32Array(perpsectiveMatrix));
    }

    render() {
        //Pipeline
        const encoder: GPUCommandEncoder = this.device.createCommandEncoder({ label: "Command encoder" });
        const pass: GPURenderPassEncoder = encoder.beginRenderPass({
            label: "Render Pass Encoder",
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
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

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setIndexBuffer(this.indexBuffer, "uint16");
        pass.drawIndexed(this.numIndices, this.mapLengthTriangles * 4);
        pass.end()

        this.device.queue.submit([encoder.finish()]);
    }

    fillPerspectiveMatrix() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const zNear = -1;
        const zFar = -1500;
        const f = Math.tan((Math.PI - this.perspective.fovY) / 2);
        const zRangeInvrs = 1 / (zNear - zFar);
        mat4.set(this.perspective.matrix,
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, zFar * zRangeInvrs, -1,
            0, 0, zNear * zFar * zRangeInvrs, 1
        );
    }
}