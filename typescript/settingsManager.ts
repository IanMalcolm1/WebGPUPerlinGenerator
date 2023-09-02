import { PerlinSettings } from "./perlinGenerator";
import { getFullAmplitude } from "./utils";

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
    private shouldUpdate: boolean;

    constructor() {
        const seedInput = <HTMLInputElement> document.getElementById("seed_input");
        const iAmpInput = <HTMLInputElement> document.getElementById("iamp_input");
        const ampRatioInput = <HTMLInputElement> document.getElementById("amp_ratio_input");
        const iGranInput = <HTMLInputElement> document.getElementById("igran_input");
        const granRatioInput = <HTMLInputElement> document.getElementById("gran_ratio_input");
        const layersInput = <HTMLInputElement> document.getElementById("layers_input");

        this.settings = {
            seed: seedInput.valueAsNumber,
            iAmplitude: iAmpInput.valueAsNumber,
            amplitudeRatio: ampRatioInput.valueAsNumber,
            iGranularity: iGranInput.valueAsNumber,
            granularityRatio: granRatioInput.valueAsNumber,
            layers: layersInput.valueAsNumber,
            returnMap: true
        };
        
        this.setUpdateFunction();
    }

    public setUpdateFunction() {
        const seedInput = <HTMLInputElement> document.getElementById("seed_input");

        const iAmpInput = <HTMLInputElement> document.getElementById("iamp_input");
        const iAmpInputNum = <HTMLLabelElement> document.getElementById("iamp_input_number");

        const ampRatioInput = <HTMLInputElement> document.getElementById("amp_ratio_input");
        const ampRatioNum = <HTMLLabelElement> document.getElementById("amp_ratio_input_number");

        const iGranInput = <HTMLInputElement> document.getElementById("igran_input");
        const iGranInputNum = <HTMLLabelElement> document.getElementById("igran_input_number");

        const granRatioInput = <HTMLInputElement> document.getElementById("gran_ratio_input");
        const granRatioInputNum = <HTMLLabelElement> document.getElementById("gran_ratio_input_number");

        const layersInput = <HTMLInputElement> document.getElementById("layers_input");
        const layersInputNum = <HTMLLabelElement> document.getElementById("layers_input_number");

        const warning = <HTMLParagraphElement> document.getElementById("settings_warning");

        seedInput.addEventListener("input", () => {
            this.settings.seed = seedInput.valueAsNumber;
            this.shouldUpdate = true;
        });

        iAmpInput.addEventListener("input", () => {
            this.settings.iAmplitude = iAmpInput.valueAsNumber;
            iAmpInputNum.textContent = "("+iAmpInput.value+")";
            this.shouldUpdate = true;
        });

        ampRatioInput.addEventListener("input", () => {
            this.settings.amplitudeRatio = ampRatioInput.valueAsNumber;
            ampRatioNum.textContent = "("+ampRatioInput.value+")";
            this.shouldUpdate = true;
        });

        iGranInput.addEventListener("input", () => {
            this.settings.iGranularity = iGranInput.valueAsNumber;
            iGranInputNum.textContent = "("+iGranInput.value+")";
            this.shouldUpdate = true;
        });

        granRatioInput.addEventListener("input", () => {
            this.settings.granularityRatio = granRatioInput.valueAsNumber;
            granRatioInputNum.textContent = "("+granRatioInput.value+")";
            this.shouldUpdate = true;
        });

        layersInput.addEventListener("input", () => {
            this.settings.layers = layersInput.valueAsNumber;
            layersInputNum.textContent = "("+layersInput.value+")";
            this.shouldUpdate = true;
        });
    }

    public getSettings(): PerlinSettings {
        const currSettings: PerlinSettings = {
            seed: this.settings.seed,
            iAmplitude: this.settings.iAmplitude,
            amplitudeRatio: this.settings.amplitudeRatio,
            iGranularity: this.settings.iGranularity,
            granularityRatio: this.settings.granularityRatio,
            layers: this.settings.layers,
            returnMap: this.settings.returnMap
        };
        return currSettings;
    }

    
    public shouldUpdateTerrain(): boolean {
        if (this.shouldUpdate) {
            this.shouldUpdate = false;
            return true;
        }
        return false;
    }

    public enableVerticesOutput() {
        this.settings.returnMap = true;
    }
};