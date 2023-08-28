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
    private maxAmplitude: number;

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
            returnMap: false
        };

        this.maxAmplitude = 8000;
    }

    public setUpdateFunction(updateFunc: () => void) {
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
            updateFunc();
        });

        iAmpInput.addEventListener("input", () => {
            this.settings.iAmplitude = iAmpInput.valueAsNumber;
            iAmpInputNum.textContent = "("+iAmpInput.value+")";
            if (this.getFullAmplitude()<this.maxAmplitude) {
                warning.hidden = true;
                updateFunc();
            }
            else {
                warning.hidden = false;
            }
        });

        ampRatioInput.addEventListener("input", () => {
            this.settings.amplitudeRatio = ampRatioInput.valueAsNumber;
            ampRatioNum.textContent = "("+ampRatioInput.value+")";
            if (this.getFullAmplitude()<this.maxAmplitude) {
                warning.hidden = true;
                updateFunc();
            }
            else {
                warning.hidden = false;
            }
        });

        iGranInput.addEventListener("input", () => {
            this.settings.iGranularity = iGranInput.valueAsNumber;
            iGranInputNum.textContent = "("+iGranInput.value+")";
            updateFunc();
        });

        granRatioInput.addEventListener("input", () => {
            this.settings.granularityRatio = granRatioInput.valueAsNumber;
            granRatioInputNum.textContent = "("+granRatioInput.value+")";
            updateFunc();
        });

        layersInput.addEventListener("input", () => {
            this.settings.layers = layersInput.valueAsNumber;
            layersInputNum.textContent = "("+layersInput.value+")";
            if (this.getFullAmplitude()<this.maxAmplitude) {
                warning.hidden = true;
                updateFunc();
            }
            else {
                warning.hidden = false;
            }
        });
    }

    public getSettings(): PerlinSettings {
        return this.settings;
    }

    
    public getFullAmplitude(): number {
        let val = 0;
        let curr = this.settings.iAmplitude;
        for (let i = 0; i < this.settings.layers - 1; i++) {
            val += curr;
            curr *= this.settings.amplitudeRatio;
        }

        return val;
    }
};