import * as utils from "./utils";
import { mat4 } from "gl-matrix";
import { Renderer } from "./renderer";

async function main() {
    const mapLengthTriangles = 18;
    const { device, canvas, context } = await utils.initWebGPU();

    //this particular buffer is used by both the Renderer and PerlinGenerator
    const heightMapBuffer: GPUBuffer = device.createBuffer({
        label: "Height Map",
        size: mapLengthTriangles * mapLengthTriangles * 4,
        usage: GPUBufferUsage.STORAGE
    });
    //TODO: test if compute shaders can write to vertex buffers
    //TODO: either way, get this populated in a compute shader

    const renderer: Renderer = new Renderer(device, canvas, context);
    await renderer.init(mapLengthTriangles, heightMapBuffer);

    renderer.render();
}

main();