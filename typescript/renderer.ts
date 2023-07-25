import { mat4, vec3 } from "gl-matrix";
import * as utils from "./utils";

export interface PerspectiveSettings {
    fovY: number,
    translation: vec3,
    rotation: vec3,
    buffer: GPUBuffer,
    camera: mat4
}

interface AmplitudeStuff {
    value: number,
    buffer: GPUBuffer
};

export class Renderer {
    private device: GPUDevice;
    private canvas: HTMLCanvasElement;
    private context: GPUCanvasContext;
    private pipeline: GPURenderPipeline;
    private depthTex: GPUTexture;
    private vertexBuffer: GPUBuffer;
    private bindGroup: GPUBindGroup;
    private indexBuffer: GPUBuffer;
    private indicesPerSection: number;
    private dimensions: utils.MapDimensions;
    private perspective: PerspectiveSettings;
    private amplitude: AmplitudeStuff;

    constructor(device: GPUDevice, canvas: HTMLCanvasElement, context: GPUCanvasContext) {
        this.device = device;
        this.canvas = canvas;
        this.context = context;
    }

    async init(mapDimensions: utils.MapDimensions, heightMapBuffer: GPUBuffer, amplitude: number) {
        this.dimensions = mapDimensions;

        const dimensionsBuffer: GPUBuffer = this.makeDimensionsBuffer();
        const vertexBufferLayout: GPUVertexBufferLayout = this.makeVertexBuffer();
        this.makeAmplitudeBuffer(amplitude);
        this.makeDepthTexture();
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
                //amplitude
                binding: 2,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }
            }, {
                //height map
                binding: 3,
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
                resource: { buffer: this.amplitude.buffer }
            }, {
                binding: 3,
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
                cullMode: "back"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            }
        });
    }

    private makeDepthTexture() {
        this.depthTex = this.device.createTexture({
            size: [this.context.getCurrentTexture().width, this.context.getCurrentTexture().height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    private makeDimensionsBuffer(): GPUBuffer {
        const planeDimensions: Uint32Array = new Uint32Array([
            this.dimensions.lengthInSections, this.dimensions.triangleSideLength
        ]);
        const planeDimensionsUniform: GPUBuffer = this.device.createBuffer({
            label: "Plane Dimensions",
            size: planeDimensions.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(planeDimensionsUniform, 0, planeDimensions);

        return planeDimensionsUniform;
    }

    private makeVertexBuffer(): GPUVertexBufferLayout {
        const sqrt3UnitLength = this.dimensions.triangleSideLength/2 * Math.sqrt(3);

        const vertexData: Float32Array = new Float32Array([
            0, 0, this.dimensions.triangleSideLength, 0,
            this.dimensions.triangleSideLength/2, sqrt3UnitLength, 3*this.dimensions.triangleSideLength/2, sqrt3UnitLength,
            0, 2 * sqrt3UnitLength, this.dimensions.triangleSideLength, 2 * sqrt3UnitLength,
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
            0, 1, 2, 1, 3, 2, 2, 5, 4, 2, 3, 5
        ]);
        this.indicesPerSection = indexData.length;
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

        this.perspective = {
            fovY: Math.PI / 3,
            translation: vec3.create(),
            rotation: vec3.create(),
            buffer: perspectiveBuffer,
            camera: mat4.create()
        }

        this.perspective.translation[0] = this.dimensions.lengthInSections * this.dimensions.triangleSideLength / 2;
        this.perspective.translation[1] = this.dimensions.heightInSections * this.dimensions.triangleSideLength/2 * Math.sqrt(3);
        this.perspective.translation[2] = this.amplitude.value;

        mat4.translate(this.perspective.camera, this.perspective.camera, this.perspective.translation);
        mat4.rotateX(this.perspective.camera, this.perspective.camera, Math.PI / 2);

        this.perspective.translation.fill(0);
    }

    private makeAmplitudeBuffer(value: number) {
        let buffer = this.device.createBuffer({
            label: "Amplitude buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.amplitude = {
            value: value,
            buffer: buffer
        };

        this.device.queue.writeBuffer(this.amplitude.buffer, 0, new Float32Array([this.amplitude.value]));
    }

    private printStats() {
        let stats: string =
            "Translation: " + this.perspective.translation[0] + ", " +
            this.perspective.translation[1] + ", " + this.perspective.translation[2] +
            "\nRotation: " + this.perspective.rotation[0] + ", " + this.perspective.rotation[1] +
            ", " + this.perspective.rotation[2];

        document.getElementById("stats").textContent = stats;
    }

    handleKeyPress(event: KeyboardEvent) {
        if (event.code === "KeyW") {
            this.perspective.translation[2] = -100;
        }
        if (event.code === "KeyS") {
            this.perspective.translation[2] = 100;
        }
        if (event.code === "KeyA") {
            this.perspective.translation[0] = -100;
        }
        if (event.code === "KeyD") {
            this.perspective.translation[0] = 100;
        }
        if (event.code === "Space") {
            this.perspective.translation[1] = 100;
        }
        if (event.code === "ShiftLeft") {
            this.perspective.translation[1] = -100;
        }

        mat4.translate(this.perspective.camera, this.perspective.camera, this.perspective.translation);
        this.perspective.translation.fill(0);
    }

    handleMouseMove(event: MouseEvent) {
        const rotationY = (3 * (-event.movementX / this.canvas.clientWidth) * (2 * Math.PI)) % (2 * Math.PI);
        const rotationX = (3 * (-event.movementY / this.canvas.clientWidth) * (2 * Math.PI)) % (2 * Math.PI);

        mat4.rotateX(this.perspective.camera, this.perspective.camera, rotationX);
        mat4.rotateY(this.perspective.camera, this.perspective.camera, rotationY);
    }

    render() {
        //Pipeline
        const encoder: GPUCommandEncoder = this.device.createCommandEncoder({ label: "Command encoder" });
        const pass: GPURenderPassEncoder = encoder.beginRenderPass({
            label: "Render Pass Encoder",
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: {
                view: this.depthTex.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        });

        const view: mat4 = mat4.invert(mat4.create(), this.perspective.camera);
        const perspective: mat4 = this.fillPerspectiveMatrix(mat4.create());
        mat4.multiply(view, perspective, view);

        this.device.queue.writeBuffer(this.perspective.buffer, 0, new Float32Array(view));

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.setVertexBuffer(0, this.vertexBuffer);
        pass.setIndexBuffer(this.indexBuffer, "uint16");
        pass.drawIndexed(this.indicesPerSection, this.dimensions.lengthInSections * this.dimensions.heightInSections);
        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }

    fillPerspectiveMatrix(matrix: mat4): mat4 {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const zNear = 1;
        const zFar = 200000;
        const f = Math.tan((Math.PI - this.perspective.fovY) / 2);
        const zRangeInvrs = 1 / (zNear - zFar);
        mat4.set(matrix,
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, zFar * zRangeInvrs, -1,
            0, 0, zNear * zFar * zRangeInvrs, 1
        );

        return matrix;
    }
}