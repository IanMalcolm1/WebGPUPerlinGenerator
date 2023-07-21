import { MapDimensions, makeShaderModule } from "./utils";

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

interface DimensionsBuffers {
    gradVertices: GPUBuffer,
    allVertices: GPUBuffer
}

export class PerlinGenerator {
    device: GPUDevice;
    pipelines: PerlinPipelines;
    bindGroups: PerlinBindGroups;
    heightMap: GPUBuffer;
    gradientBuffer: GPUBuffer;
    dimensions: DimensionsBuffers;
    allVertices: VerticesInfo; //all vertices
    gradientDimensions: GradientDimensions; //ignores odd rows of vertices, but adds extra column
    heightsReadBuffer: GPUBuffer;

    constructor(device: GPUDevice, mapDimensions: MapDimensions) {
        this.device = device;

        this.allVertices = {
            length: mapDimensions.lengthInSections+1,
            height: 1+2*mapDimensions.heightInSections,
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
        let granularity = 8;
        
        this.makeDimensionsBuffers(granularity);
        this.makeHeightMapBuffer();
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

    private makeDimensionsBuffers(granularity: number) {
        let perlinSquareSideLength = Math.floor(this.allVertices.triangleSideLength*granularity);

        let mapHeight = this.allVertices.height*this.allVertices.triangleSideLength*Math.sqrt(3);
        let mapWidth = this.allVertices.length*this.allVertices.triangleSideLength;

        let vecsVertical = Math.floor(mapHeight/perlinSquareSideLength);
        if (vecsVertical*this.allVertices.height<=mapHeight) {
            vecsVertical++;
        }
        let vecsHorizontal = Math.floor(mapWidth/perlinSquareSideLength);
        if (vecsHorizontal*this.allVertices.length<=mapWidth) {
            vecsHorizontal++;
        }

        const vecsDimensions: Uint32Array = new Uint32Array([
            vecsHorizontal, vecsVertical
        ]);
        const vecsSideLength: Float32Array = new Float32Array([
            perlinSquareSideLength
        ]);
        let vecsDimensionsBuffer: GPUBuffer = this.device.createBuffer({
            label: "Gradient Vertices Dimensions",
            size: vecsDimensions.byteLength + vecsSideLength.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const allVerticesDimensions: Uint32Array = new Uint32Array([
            this.allVertices.length, this.allVertices.height
        ]);
        const triangleSides: Float32Array = new Float32Array([
            this.allVertices.triangleSideLength
        ]);
        let allVerticesBuffer: GPUBuffer = this.device.createBuffer({
            label: "All Vertices Dimensions",
            size: allVerticesDimensions.byteLength + triangleSides.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.gradientDimensions = {
            widthVertices: vecsHorizontal,
            heightVertices: vecsVertical,
            sideLenth: perlinSquareSideLength
        }

        this.dimensions = {
            gradVertices: vecsDimensionsBuffer,
            allVertices: allVerticesBuffer
        };
        
        this.device.queue.writeBuffer(this.dimensions.gradVertices, 0, vecsDimensions);
        this.device.queue.writeBuffer(this.dimensions.gradVertices, vecsDimensions.byteLength, vecsSideLength);
        this.device.queue.writeBuffer(this.dimensions.allVertices, 0, allVerticesDimensions);
        this.device.queue.writeBuffer(this.dimensions.allVertices, allVerticesDimensions.byteLength, triangleSides);
    }

    //am f32 for each vertex in the map
    private makeHeightMapBuffer() {
        this.heightMap = this.device.createBuffer({
            label: "Height Map",
            size: this.allVertices.length*this.allVertices.height * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        this.heightsReadBuffer = this.device.createBuffer({
            label: "Height map reading buffer",
            size: this.allVertices.length*this.allVertices.height*4,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });


    }

    //a vec2f for each gradient vertex
    private makeGradientBuffer() {
        this.gradientBuffer = this.device.createBuffer({
            label: "Gradient buffer",
            size: 8*this.gradientDimensions.heightVertices*this.gradientDimensions.widthVertices,
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
                buffer: { type: "storage" }
            }]
        });

        this.bindGroups.gradGen = this.device.createBindGroup({
            label: "Gradient gen bind group",
            layout: bindLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.dimensions.gradVertices }
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
                buffer: { type: "uniform" }
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" }
            }, {
                binding: 3,
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
                resource: { buffer: this.dimensions.gradVertices }
            }, {
                binding: 2,
                resource: { buffer: this.gradientBuffer }
            }, {
                binding: 3,
                resource: { buffer: this.heightMap }
            }]
        });

        return bindLayout;
    }

    getHeightMap(): GPUBuffer {
        return this.heightMap;
    }


    async run() {
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

        encoder.copyBufferToBuffer(this.heightMap, 0, this.heightsReadBuffer, 0, this.heightMap.size);

        this.device.queue.submit([encoder.finish()]);

        await this.heightsReadBuffer.mapAsync(GPUMapMode.READ);
        let heightsBlob = this.heightsReadBuffer.getMappedRange();
        let heightsArray = new Float32Array(heightsBlob);
        
        let bigString: string = heightsArray.byteLength+"\n";
        for (let x=0; x<this.allVertices.length; x++) {
            for (let y=0; y<this.allVertices.height; y++) {
                bigString += heightsArray[x+this.allVertices.length*y]+", ";
            }
            bigString += "\n";
        }
        document.getElementById("stuff").textContent = heightsArray.toString();;
        this.heightsReadBuffer.unmap();
    }
}