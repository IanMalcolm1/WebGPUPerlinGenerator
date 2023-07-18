import { MapDimensions, makeShaderModule } from "./utils";

interface VerticesInfo {
    length: number,
    height: number,
    total: number
};

interface PerlinBindGroups {
    gradGen?: GPUBindGroup,
    dotProduct?: GPUBindGroup,
    interpolation?: GPUBindGroup
};

interface PerlinPipelines {
    gradGen?: GPUComputePipeline,
    dotProduct?: GPUComputePipeline,
    interpolation?: GPUComputePipeline
};

interface DimensionsBuffers {
    gradientVertices: GPUBuffer,
    allVertices: GPUBuffer
}

export class PerlinGenerator {
    device: GPUDevice;
    pipelines: PerlinPipelines;
    bindGroups: PerlinBindGroups;
    heightMap: GPUBuffer;
    gradientBuffer: GPUBuffer;
    dotProductBuffers: Array<GPUBuffer>; //dot product buffers to interpolate between
    dimensions: DimensionsBuffers;
    allVertices: VerticesInfo; //all vertices
    gradientVertices: VerticesInfo; //ignores odd rows of vertices, but adds extra column
    triangleSideLength: number;

    constructor(device: GPUDevice, mapDimensions: MapDimensions) {
        this.device = device;
        this.triangleSideLength = mapDimensions.triangleSideLength;

        this.allVertices = {
            length: mapDimensions.lengthInSections+1,
            height: 1+2*mapDimensions.heightInSections,
            total: (1+2*mapDimensions.heightInSections)*(mapDimensions.lengthInSections+1)
        };

        //extends one past last section
        this.gradientVertices = {
            length: 2+mapDimensions.lengthInSections,
            height: 2+mapDimensions.heightInSections,
            total: (2+mapDimensions.heightInSections)*(2+mapDimensions.lengthInSections)
        };

        this.bindGroups = {
            gradGen: null,
            dotProduct: null,
            interpolation: null
        }

        this.pipelines = {
            gradGen: null,
            dotProduct: null,
            interpolation: null
        }
    }

    async init() {
        this.makeDimensionsBuffers();
        this.makeHeightMapBuffer();
        this.makeDotProductBuffers();
        this.makeGradientBuffer();

        await this.makeGradGenPipeline();
        await this.makeDotProductPipeline();
    }


    private async makeGradGenPipeline() {
        const bindLayout = this.makeGradGenBindGroup();
        const gradGenModule = await makeShaderModule(this.device, "./shaders/grad_generator.wgsl");

        const pipelineLayout: GPUPipelineLayout = this.device.createPipelineLayout({
            label: "Gradient gen pipeline layout",
            bindGroupLayouts: [bindLayout]
        });

        this.pipelines.gradGen = this.device.createComputePipeline({
            label: "Gradient gen pipeline",
            layout: pipelineLayout,
            compute: {
                module: gradGenModule,
                entryPoint: "generate_gradients"
            }
        });
    }

    private async makeDotProductPipeline() {
        const bindLayout = this.makeDotProdBindGroup();
        const gradGenModule = await makeShaderModule(this.device, "./shaders/dot_product.wgsl");

        const pipelineLayout: GPUPipelineLayout = this.device.createPipelineLayout({
            label: "Dot product pipeline layout",
            bindGroupLayouts: [bindLayout]
        });

        this.pipelines.dotProduct = this.device.createComputePipeline({
            label: "Dot product pipeline",
            layout: pipelineLayout,
            compute: {
                module: gradGenModule,
                entryPoint: "generate_dots"
            }
        });
    }

    //width/height of gradient vertices
    private makeDimensionsBuffers() {
        const gradientDimensions: Uint32Array = new Uint32Array([
            this.gradientVertices.length, this.gradientVertices.height
        ]);
        let gradientVerticesBuffer: GPUBuffer = this.device.createBuffer({
            label: "Gradient Vertices Dimensions",
            size: gradientDimensions.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const allVerticesDimensions: Uint32Array = new Uint32Array([
            this.allVertices.length, this.allVertices.height, this.triangleSideLength
        ]);
        let allVerticesBuffer: GPUBuffer = this.device.createBuffer({
            label: "All Vertices Dimensions",
            size: allVerticesDimensions.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.dimensions = {
            gradientVertices: gradientVerticesBuffer,
            allVertices: allVerticesBuffer
        };
        
        this.device.queue.writeBuffer(this.dimensions.gradientVertices, 0, gradientDimensions);
        this.device.queue.writeBuffer(this.dimensions.allVertices, 0, allVerticesDimensions);
    }

    //am f32 for each vertex in the map
    private makeHeightMapBuffer() {
        this.heightMap = this.device.createBuffer({
            label: "Height Map",
            size: this.allVertices.total * 4,
            usage: GPUBufferUsage.STORAGE
        });
    }

    //a vec2f for each gradient vertex
    private makeGradientBuffer() {
        this.gradientBuffer = this.device.createBuffer({
            label: "Gradient buffer",
            size: 8*this.gradientVertices.total,
            usage: GPUBufferUsage.STORAGE
        });
    }

    //4 sets of an f32 for each vertex in the map
    private makeDotProductBuffers() {
        this.dotProductBuffers = new Array<GPUBuffer>(4);
        for (let i=0; i<4; i++) {
            this.dotProductBuffers[i] = this.device.createBuffer({
                label: "Dot product buffer ${i}",
                size: 4*this.allVertices.total,
                usage: GPUBufferUsage.STORAGE
            });
        }
    }

    private makeGradGenBindGroup() {
        const bindLayout: GPUBindGroupLayout = this.device.createBindGroupLayout({
            label: "Gradient gen bind group layout",
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

        this.bindGroups.gradGen = this.device.createBindGroup({
            label: "Gradient gen bind group",
            layout: bindLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.dimensions.gradientVertices }
            }, {
                binding: 1,
                resource: { buffer: this.gradientBuffer }
            }]
        });

        return bindLayout;
    }

    private makeDotProdBindGroup() {
        const bindLayout: GPUBindGroupLayout = this.device.createBindGroupLayout({
            label: "Dot product bind group layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "uniform" }
            }, {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }, {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }, {
                binding: 4,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }, {
                binding: 5,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        this.bindGroups.dotProduct = this.device.createBindGroup({
            label: "Dot product bind group",
            layout: bindLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.dimensions.allVertices }
            }, {
                binding: 1,
                resource: { buffer: this.gradientBuffer }
            }, {
                binding: 2,
                resource: { buffer: this.dotProductBuffers[0] }
            }, {
                binding: 3,
                resource: { buffer: this.dotProductBuffers[1] }
            }, {
                binding: 4,
                resource: { buffer: this.dotProductBuffers[2] }
            }, {
                binding: 5,
                resource: { buffer: this.dotProductBuffers[3] }
            }]
        });

        return bindLayout;
    }

    getHeightMap(): GPUBuffer {
        return this.heightMap;
    }


    run() {
        const encoder: GPUCommandEncoder = this.device.createCommandEncoder();
        const gradientGenPass: GPUComputePassEncoder = encoder.beginComputePass();

        gradientGenPass.setPipeline(this.pipelines.gradGen);
        gradientGenPass.setBindGroup(0, this.bindGroups.gradGen);
        gradientGenPass.dispatchWorkgroups(this.gradientVertices.length, this.gradientVertices.height);
        gradientGenPass.end();

        const dotProductPass: GPUComputePassEncoder = encoder.beginComputePass();
        dotProductPass.setPipeline(this.pipelines.dotProduct);
        dotProductPass.setBindGroup(0, this.bindGroups.dotProduct);
        dotProductPass.dispatchWorkgroups(this.allVertices.length, this.allVertices.height);
        dotProductPass.end();

        //TODO: interpolation pass

        this.device.queue.submit([encoder.finish()]);
    }
}