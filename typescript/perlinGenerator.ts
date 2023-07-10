import { MapDimensions, makeShaderModule } from "./utils";

interface VerticesInfo {
    length: number,
    height: number,
    total: number
};

export class PerlinGenerator {
    device: GPUDevice;
    pipeline: GPUComputePipeline;
    bindGroup: GPUBindGroup;
    heightMap: GPUBuffer;
    dimensions: GPUBuffer;
    vertices: VerticesInfo;
    workgroupSize: number;

    constructor(device: GPUDevice) {
        this.device = device;
        this.workgroupSize = 8;
    }

    async init(mapDimensions: MapDimensions) {
        this.vertices = {
            length: mapDimensions.lengthInSections+1,
            height: 1+2*mapDimensions.heightInSections,
            total: (1+2*mapDimensions.heightInSections)*(mapDimensions.lengthInSections+1)
        };

        this.makeDimensionsBuffer();
        this.makeHeightMapBuffer();
        const bindLayout = this.makeBindGroup();
        const shaderModule = await makeShaderModule(this.device, "./shaders/compute.wgsl");

        const pipelineLayout: GPUPipelineLayout = this.device.createPipelineLayout({
            label: "Perline pipeline layout",
            bindGroupLayouts: [bindLayout]
        });

        this.pipeline = this.device.createComputePipeline({
            label: "Perlin pipeline",
            layout: pipelineLayout,
            compute: {
                module: shaderModule,
                entryPoint: "perlin_entry"
            }
        })
    }

    private makeDimensionsBuffer() {
        const planeDimensions: Uint32Array = new Uint32Array([this.vertices.length, this.vertices.height]);
        this.dimensions = this.device.createBuffer({
            label: "Plane Dimensions",
            size: planeDimensions.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.dimensions, 0, planeDimensions);
    }

    private makeHeightMapBuffer() {
        this.heightMap = this.device.createBuffer({
            label: "Height Map",
            size: this.vertices.total * 4,
            usage: GPUBufferUsage.STORAGE
        });
    }

    private makeBindGroup() {
        const bindLayout: GPUBindGroupLayout = this.device.createBindGroupLayout({
            label: "Perlin bind group layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "uniform" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        this.bindGroup = this.device.createBindGroup({
            label: "Perlin bind group",
            layout: bindLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.dimensions }
            }, {
                binding: 1,
                resource: { buffer: this.heightMap }
            }]
        });

        return bindLayout;
    }

    getHeightMap(): GPUBuffer {
        return this.heightMap;
    }


    run() {
        const encoder: GPUCommandEncoder = this.device.createCommandEncoder();
        const pass: GPUComputePassEncoder = encoder.beginComputePass();

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup);
        pass.dispatchWorkgroups(this.vertices.length, this.vertices.height);
        pass.end();

        this.device.queue.submit([encoder.finish()]);
    }
}