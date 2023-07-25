import * as utils from "./utils";
import { Renderer } from "./renderer";
import { PerlinGenerator, PerlinSettings } from "./perlinGenerator";

async function main() {
    const mapHeightSections = 1028;
    const mapLengthSections = Math.floor(mapHeightSections*Math.sqrt(3)); //sections are taller than they are wide
    const triangleUnitLength = 32;

    const mapDimensions: utils.MapDimensions = {
        lengthInSections: mapLengthSections,
        heightInSections: mapHeightSections,
        triangleSideLength: triangleUnitLength
    }

    let perlinSettings: PerlinSettings = {
        seed: 1562132,
        iAmplitude: 100,
        iGranularity: 5,
        layers: 8,
        granularityRatio: 2,
        amplitudeRatio: 2,
        returnMap: false
    };

    const { device, canvas, context } = await utils.initWebGPU();

    const perlinGenerator: PerlinGenerator = new PerlinGenerator(device, mapDimensions, perlinSettings);
    await perlinGenerator.init();
    await perlinGenerator.run();

    const heightMapBuffer: GPUBuffer =  perlinGenerator.getHeightMap();

    const renderer: Renderer = new Renderer(device, canvas, context);
    await renderer.init(mapDimensions, heightMapBuffer, perlinGenerator.getFullAmplitude());
    
    document.addEventListener("keydown", function(event) {
        renderer.handleKeyPress(event);
    });
    document.querySelector("canvas").addEventListener("mousemove", function(event) {
        renderer.handleMouseMove(event);
    });

    setInterval(function() { run(renderer) }, 17);
}

function run(renderer: Renderer) {
    renderer.render();
}

main();