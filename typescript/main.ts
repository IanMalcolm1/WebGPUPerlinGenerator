import * as utils from "./utils";
import { Renderer } from "./renderer";
import { PerlinGenerator, PerlinSettings } from "./perlinGenerator";
import { SettingsManager } from "./settingsManager";


var intervalId: NodeJS.Timer;
var device: GPUDevice;
var canvas: HTMLCanvasElement;
var context: GPUCanvasContext;

async function main() {
    const mapHeightSections = 200;
    const mapLengthSections = Math.floor(mapHeightSections*Math.sqrt(3)); //sections are taller than they are wide
    const triangleUnitLength = 32;

    const mapDimensions: utils.MapDimensions = {
        lengthInSections: mapLengthSections,
        heightInSections: mapHeightSections,
        triangleSideLength: triangleUnitLength
    }

    {
        let temp = await utils.initWebGPU();
        [device, canvas, context] = [temp.device, temp.canvas, temp.context];
    }
    const settingsManager: SettingsManager = new SettingsManager();
    
    const perlinGenerator: PerlinGenerator = new PerlinGenerator(device, mapDimensions, settingsManager.getSettings());
    const renderer: Renderer = new Renderer(device, canvas, context);


    await perlinGenerator.init();
    await perlinGenerator.run();

    const heightMap = perlinGenerator.getHeightMap();
    await renderer.init(mapDimensions, heightMap, settingsManager.getFullAmplitude());

    settingsManager.setUpdateFunction(async function() { await remakeTerrain(renderer, perlinGenerator, settingsManager); })
    

    document.addEventListener("keydown", function(event) {
        renderer.handleKeyPress(event);
    });
    document.querySelector("canvas").addEventListener("mousemove", function(event) {
        renderer.handleMouseMove(event);
    });

    intervalId = setInterval(function() { renderer.render() }, 17);
   
}


async function remakeTerrain(renderer: Renderer, generator: PerlinGenerator, settingsManager: SettingsManager) {
    clearInterval(intervalId);
    
    await generator.changeSettings(settingsManager.getSettings());
    await generator.run();

    const heightMap = generator.getHeightMap();
    const amplitude = settingsManager.getFullAmplitude();

    await renderer.updateHeightMap(heightMap, amplitude);

    intervalId = setInterval(function() { renderer.render() }, 17);
} 

main();