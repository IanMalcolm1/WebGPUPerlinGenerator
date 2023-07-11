import * as utils from "./utils";
import { Renderer } from "./renderer";
import { PerlinGenerator } from "./perlinGenerator";

async function main() {
    const mapHeightSections = 32;
    const mapLengthSections = Math.floor(mapHeightSections*2*Math.sqrt(3)); //to account for triangles being taller than they are wide
    const triangleUnitLength = 32;

    const mapDimensions: utils.MapDimensions = {
        lengthInSections: mapLengthSections,
        heightInSections: mapHeightSections,
        triangleSideLength: triangleUnitLength
    }

    const { device, canvas, context } = await utils.initWebGPU();

    const perlinGenerator: PerlinGenerator = new PerlinGenerator(device);
    await perlinGenerator.init(mapDimensions);
    const heightMapBuffer: GPUBuffer =  perlinGenerator.getHeightMap();

    const renderer: Renderer = new Renderer(device, canvas, context);
    await renderer.init(mapDimensions, heightMapBuffer);
    
    document.addEventListener("keydown", function(event) {
        renderer.handleKeyPress(event);
    });
    document.querySelector("canvas").addEventListener("mousemove", function(event) {
        renderer.handleMouseMove(event);
    });
    
    perlinGenerator.run();
    setInterval(function() { run(renderer) }, 17);
}

function run(renderer: Renderer) {
    renderer.render();
}

main();