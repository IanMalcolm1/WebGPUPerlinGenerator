import { mat4, vec3 } from "gl-matrix";
import {guify} from "guify";
import { PerspectiveSettings } from "./renderer";

export interface MapDimensions {
    lengthInSections: number,
    heightInSections: number,
    triangleSideLength: number
}

export async function initWebGPU() {
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!device) {
        throw new Error('need a browser that supports WebGPU');
    }

    // Get a WebGPU context from the canvas and configure it
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('webgpu');
    if (!canvas || !context) {
        throw new Error('no canvas or no context');
    }
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format: presentationFormat,
    });

    return { device, canvas, context }
}


export async function makeShaderModule(device: GPUDevice, filePath: string): Promise<GPUShaderModule> {
    const renderShadersFile = await fetch(filePath);
    const renderShaders: string = await renderShadersFile.text();
    const renderModule: GPUShaderModule = device.createShaderModule({
        label: "F shader module",
        code: renderShaders
    });

    return renderModule;
}