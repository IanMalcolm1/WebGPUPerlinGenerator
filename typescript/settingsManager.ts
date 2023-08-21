import { PerlinSettings } from "./perlinGenerator";

interface SettingsInputs {
    seed: HTMLInputElement,
    iAmp: HTMLInputElement,
    ampRatio: HTMLInputElement,
    iGran: HTMLInputElement,
    granRatio: HTMLInputElement,
    layers: HTMLInputElement,
    returnMap: HTMLInputElement
};

export class SettingsManager {
    private settings: PerlinSettings;

    constructor() {
        const seedInput = <HTMLInputElement> document.getElementById("seed_input");
        const iAmpInput = <HTMLInputElement> document.getElementById("iamp_input");
        const ampRatioInput = <HTMLInputElement> document.getElementById("amp_ratio_input");
        const iGranInput = <HTMLInputElement> document.getElementById("igran_input");
        const granRatioInput = <HTMLInputElement> document.getElementById("gran_ratio_input");
        const layersInput = <HTMLInputElement> document.getElementById("layers_input");
        const returnMapInput = <HTMLInputElement> document.getElementById("return_map_input");

        this.settings = {
            seed: seedInput.valueAsNumber,
            iAmplitude: iAmpInput.valueAsNumber,
            amplitudeRatio: ampRatioInput.valueAsNumber,
            iGranularity: iGranInput.valueAsNumber,
            granularityRatio: granRatioInput.valueAsNumber,
            layers: layersInput.valueAsNumber,
            returnMap: returnMapInput.checked
        };

        seedInput.addEventListener("input", () => {
            this.settings.seed = seedInput.valueAsNumber;
            console.log(this.settings);
        });

        iAmpInput.addEventListener("input", () => {
            this.settings.iAmplitude = iAmpInput.valueAsNumber;
        });

        ampRatioInput.addEventListener("input", () => {
            this.settings.amplitudeRatio = ampRatioInput.valueAsNumber;
        });

        iGranInput.addEventListener("input", () => {
            this.settings.iGranularity = iGranInput.valueAsNumber;
        });

        granRatioInput.addEventListener("input", () => {
            this.settings.granularityRatio = granRatioInput.valueAsNumber;
        });

        layersInput.addEventListener("input", () => {
            this.settings.layers = layersInput.valueAsNumber;
        });

        returnMapInput.addEventListener("input", () => {
            this.settings.returnMap = returnMapInput.checked;
        });
    }

    public getSettings(): PerlinSettings {
        return this.settings;
    }
};