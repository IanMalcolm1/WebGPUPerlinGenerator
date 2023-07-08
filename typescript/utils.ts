import { mat4, vec3 } from "gl-matrix";
import {guify} from "guify";
import { PerspectiveSettings } from "./renderer";

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

export function makePerspectiveGUI(settings: PerspectiveSettings) {
    var gui = new guify({ title: "3D Stuff" });
    gui.Register([
        {
            type: 'range', label: 'FoV',
            min: 0, max: Math.PI, step: 0.1,
            object: settings, property: 'fovY'
        }, {
            type: 'range', label: 'Translation X',
            min: -600, max: 600, step: 10,
            object: settings.translation, property: '0'
        }, {
            type: 'range', label: 'Translation Y',
            min: -600, max: 600, step: 10,
            object: settings.translation, property: '1'
        }, {
            type: 'range', label: 'Translation Z',
            min: -3000, max: 100, step: 10,
            object: settings.translation, property: '2'
        }, {
            type: 'range', label: 'Rotation X',
            min: 0, max: 2 * Math.PI, step: 0.1,
            object: settings.rotation, property: '0'
        }, {
            type: 'range', label: 'Rotation Y',
            min: 0, max: 2 * Math.PI, step: 0.1,
            object: settings.rotation, property: '1'
        }, {
            type: 'range', label: 'Rotation Z',
            min: 0, max: 2 * Math.PI, step: 0.1,
            object: settings.rotation, property: '2'
        }
    ]);

    return gui;
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