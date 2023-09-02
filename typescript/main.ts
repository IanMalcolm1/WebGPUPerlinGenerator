import * as utils from "./utils";
import { Renderer } from "./renderer";
import { PerlinGenerator, PerlinSettings } from "./perlinGenerator";
import { SettingsManager } from "./settingsManager";

var inputOn: boolean = false;

async function main() {
    const mapHeightSections = 400;
    const mapLengthSections = Math.floor(mapHeightSections*Math.sqrt(3)); //sections are taller than they are wide
    const triangleUnitLength = 32;

    const mapDimensions: utils.MapDimensions = {
        lengthInSections: mapLengthSections,
        heightInSections: mapHeightSections,
        triangleSideLength: triangleUnitLength
    }

    const {device, canvas, context} = await utils.initWebGPU();
    const settingsManager: SettingsManager = new SettingsManager();
    
    const perlinGenerator: PerlinGenerator = new PerlinGenerator(device, mapDimensions, settingsManager.getSettings());
    const renderer: Renderer = new Renderer(device, canvas, context);


    await perlinGenerator.init();
    await perlinGenerator.run();

    const heightMap = perlinGenerator.getHeightMap();
    await renderer.init(mapDimensions, heightMap, perlinGenerator.getAmplitude());

    

    document.addEventListener("keydown", (event) => { processKeypress(event, renderer) });

    document.querySelector("canvas").addEventListener("mousemove", function(event) {
        if (inputOn) {
            renderer.handleMouseMove(event);
        }
    });

    while (true) {
        const lastTime = Date.now();

        await update(renderer, perlinGenerator, settingsManager);

        await sleep(Math.max(16-Date.now()-lastTime, 0));
    }
   
}


async function sleep(time: number) {
    return new Promise((resolve) => { setTimeout(resolve, time) });
}


async function update(renderer: Renderer, generator: PerlinGenerator, settingsManager: SettingsManager) {
    if (settingsManager.shouldUpdateTerrain()) {
        await remakeTerrain(renderer, generator, settingsManager);
    }
    await renderer.render();
}


async function remakeTerrain(renderer: Renderer, generator: PerlinGenerator, settingsManager: SettingsManager) {
    await generator.changeSettings(settingsManager.getSettings());
    await generator.run();

    const heightMap = generator.getHeightMap();
    const amplitude = generator.getAmplitude();

    await renderer.updateHeightMap(heightMap, amplitude);
}

function processKeypress(event: KeyboardEvent, renderer: Renderer) {
    if (event.key == "Escape") {
        inputOn = !inputOn;
    }
    else {
        renderer.handleKeyPress(event);
    }
}

main();