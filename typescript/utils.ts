import {mat4} from "gl-matrix";

export async function init() {
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

export function fillPerspectiveMatrix(matrix: mat4, fovY: number, aspect: number, zNear: number, zFar: number) {
    const f = Math.tan((Math.PI - fovY) / 2);
    const zRangeInvrs = 1 / (zNear - zFar);
    mat4.set(matrix,
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, zFar * zRangeInvrs, -1,
        0, 0, zNear * zFar * zRangeInvrs, 1
    );
}