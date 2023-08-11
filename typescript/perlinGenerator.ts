import { MapDimensions, makeShaderModule } from "./utils";

export interface PerlinSettings {
    seed: number,
    iAmplitude: number,
    iGranularity: number,
    layers: number,
    granularityRatio: number,
    amplitudeRatio: number,
    returnMap: boolean
};

interface VerticesInfo {
    length: number,
    height: number,
    triangleSideLength: number
};

interface GradientDimensions {
    widthVertices: number,
    heightVertices: number,
    sideLenth: number
}

interface PerlinBindGroups {
    gradGen?: GPUBindGroup,
    dotProduct?: GPUBindGroup
};

interface PerlinPipelines {
    gradGen?: GPUComputePipeline,
    dotProduct?: GPUComputePipeline
};

export class PerlinGenerator {
    device: GPUDevice;
    settings: PerlinSettings;
    pipelines: PerlinPipelines;
    bindGroups: PerlinBindGroups;
    heightMap: GPUBuffer;
    gradientBuffer: GPUBuffer;
    allVerticesDimensionsBuffer: GPUBuffer;
    gradientsDimensionsBuffer: GPUBuffer;
    amplitudeBuffer: GPUBuffer;
    allVertices: VerticesInfo;
    gradientDimensions: GradientDimensions;
    heightsReadBuffer: GPUBuffer;
    seedBuffer: GPUBuffer;

    constructor(device: GPUDevice, mapDimensions: MapDimensions, settings: PerlinSettings) {
        this.settings = settings;
        this.device = device;

        this.allVertices = {
            length: mapDimensions.lengthInSections + 1,
            height: 1 + 2 * mapDimensions.heightInSections,
            triangleSideLength: mapDimensions.triangleSideLength
        };

        this.bindGroups = {
            gradGen: null,
            dotProduct: null
        }

        this.pipelines = {
            gradGen: null,
            dotProduct: null
        }
    }

    async init() {
        this.makeSeedBuffer();
        this.makeAllVerticesDimensionsBuffer();
        this.makeGradientDimensionsBuffers();
        this.makeAmplitudeBuffer();
        this.makeHeightMapBuffer();
        this.makeGradientBuffer();
        await this.makeGradGenPipeline();
        await this.makeDotProductPipeline();
    }



    private makeSeedBuffer() {
        this.seedBuffer = this.device.createBuffer({
            label: "Seed buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.seedBuffer, 0, new Uint32Array([this.settings.seed]));
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
        const gradGenModule = await makeShaderModule(this.device, "./shaders/perlin_main.wgsl");

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

    private makeAllVerticesDimensionsBuffer() {
        const allVerticesDimensions: Uint32Array = new Uint32Array([
            this.allVertices.length, this.allVertices.height
        ]);
        const triangleSides: Float32Array = new Float32Array([
            this.allVertices.triangleSideLength
        ]);
        this.allVerticesDimensionsBuffer = this.device.createBuffer({
            label: "All Vertices Dimensions",
            size: allVerticesDimensions.byteLength + triangleSides.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.allVerticesDimensionsBuffer, 0, allVerticesDimensions);
        this.device.queue.writeBuffer(this.allVerticesDimensionsBuffer, allVerticesDimensions.byteLength, triangleSides);
    }

    private makeGradientDimensionsBuffers() {
        this.gradientsDimensionsBuffer = this.device.createBuffer({
            label: "Gradient Vertices Dimensions",
            size: 4 * 3,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    private calcGradientsDimensions(granularity: number) {
        let perlinSquareSideLength = Math.floor(this.allVertices.triangleSideLength * granularity);

        let mapHeight = this.allVertices.height * (this.allVertices.triangleSideLength * Math.sqrt(3) / 2);
        let mapWidth = this.allVertices.length * this.allVertices.triangleSideLength;

        let vecsVertical = Math.floor(mapHeight / perlinSquareSideLength);
        if (vecsVertical * this.allVertices.height <= mapHeight) {
            vecsVertical++;
        }
        let vecsHorizontal = Math.floor(mapWidth / perlinSquareSideLength);
        if (vecsHorizontal * this.allVertices.length <= mapWidth) {
            vecsHorizontal++;
        }

        this.gradientDimensions = {
            widthVertices: vecsHorizontal,
            heightVertices: vecsVertical,
            sideLenth: perlinSquareSideLength
        }
    }


    private makeAmplitudeBuffer() {
        this.amplitudeBuffer = this.device.createBuffer({
            label: "Amplitude buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }


    //an f32 for each vertex in the map
    private makeHeightMapBuffer() {
        this.heightMap = this.device.createBuffer({
            label: "Height Map",
            size: this.allVertices.length * this.allVertices.height * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        this.heightsReadBuffer = this.device.createBuffer({
            label: "Height map reading buffer",
            size: this.allVertices.length * this.allVertices.height * 4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });


    }

    //a vec2f for each gradient vertex
    private makeGradientBuffer() {
        this.calcGradientsDimensions(this.settings.iGranularity);

        this.gradientBuffer = this.device.createBuffer({
            label: "Gradient buffer",
            size: 8 * this.gradientDimensions.heightVertices * this.gradientDimensions.widthVertices,
            usage: GPUBufferUsage.STORAGE
        });
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
                buffer: { type: "uniform" }
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        this.bindGroups.gradGen = this.device.createBindGroup({
            label: "Gradient gen bind group",
            layout: bindLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.gradientsDimensionsBuffer }
            }, {
                binding: 1,
                resource: { buffer: this.seedBuffer }
            }, {
                binding: 2,
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
                buffer: { type: "uniform" }
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "uniform" }
            }, {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" }
            }, {
                binding: 4,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" }
            }]
        });

        this.bindGroups.dotProduct = this.device.createBindGroup({
            label: "Dot product bind group",
            layout: bindLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.allVerticesDimensionsBuffer }
            }, {
                binding: 1,
                resource: { buffer: this.gradientsDimensionsBuffer }
            }, {
                binding: 2,
                resource: { buffer: this.amplitudeBuffer }
            }, {
                binding: 3,
                resource: { buffer: this.gradientBuffer }
            }, {
                binding: 4,
                resource: { buffer: this.heightMap }
            }]
        });

        return bindLayout;
    }


    private setSeed(seed: number) {
        this.device.queue.writeBuffer(this.seedBuffer, 0, new Uint32Array([seed]));
    }

    private setAmplitude(amplitude: number) {
        this.device.queue.writeBuffer(this.amplitudeBuffer, 0, new Float32Array([amplitude]));
    }

    private setGranularity(granularity: number) {
        this.calcGradientsDimensions(granularity);

        const vecsDimensions: Uint32Array = new Uint32Array([
            this.gradientDimensions.widthVertices, this.gradientDimensions.heightVertices
        ]);
        const vecsSideLength: Float32Array = new Float32Array([
            this.gradientDimensions.sideLenth
        ]);

        this.device.queue.writeBuffer(this.gradientsDimensionsBuffer, 0, vecsDimensions);
        this.device.queue.writeBuffer(this.gradientsDimensionsBuffer, vecsDimensions.byteLength, vecsSideLength);
    }

    getHeightMap(): GPUBuffer {
        return this.heightMap;
    }

    getFullAmplitude(): number {
        let val = 0;
        let curr = this.settings.iAmplitude;
        for (let i = 0; i < this.settings.layers - 1; i++) {
            val += curr;
            curr *= this.settings.amplitudeRatio;
        }

        return val;
    }


    async run() {
        let amplitude = this.settings.iAmplitude;
        let granularity = this.settings.iGranularity;

        for (let i = 0; i < this.settings.layers; i++) {
            this.setAmplitude(amplitude);
            this.setGranularity(granularity);

            const encoder: GPUCommandEncoder = this.device.createCommandEncoder();
            const gradientGenPass: GPUComputePassEncoder = encoder.beginComputePass();

            gradientGenPass.setPipeline(this.pipelines.gradGen);
            gradientGenPass.setBindGroup(0, this.bindGroups.gradGen);
            gradientGenPass.dispatchWorkgroups(this.gradientDimensions.widthVertices, this.gradientDimensions.heightVertices);
            gradientGenPass.end();

            const dotProductPass: GPUComputePassEncoder = encoder.beginComputePass();
            dotProductPass.setPipeline(this.pipelines.dotProduct);
            dotProductPass.setBindGroup(0, this.bindGroups.dotProduct);
            dotProductPass.dispatchWorkgroups(this.allVertices.length, this.allVertices.height);
            dotProductPass.end();

            this.device.queue.submit([encoder.finish()]);

            amplitude *= this.settings.amplitudeRatio;
            granularity *= this.settings.granularityRatio;
        }

        if (this.settings.returnMap == true) {
            const encoder: GPUCommandEncoder = this.device.createCommandEncoder();
            encoder.copyBufferToBuffer(this.heightMap, 0, this.heightsReadBuffer, 0, this.heightMap.size);
            this.device.queue.submit([encoder.finish()]);

            await this.heightsReadBuffer.mapAsync(GPUMapMode.READ, 0, this.heightsReadBuffer.size);
            let blob = this.heightsReadBuffer.getMappedRange(0, this.heightsReadBuffer.size);
            return new Float32Array(blob);
        }
    }
}