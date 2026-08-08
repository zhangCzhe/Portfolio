import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GLRenderer } from '../../src/engine/GLRenderer';
import { ShaderCompileError } from '../../src/engine/compile';
import { FakeGL, makeFakeCanvas } from '../helpers/fakeGL';

let gl: FakeGL;

beforeEach(() => {
  gl = new FakeGL();
  vi.stubGlobal('devicePixelRatio', 2);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GLRenderer', () => {
  it('init acquires context and sizes canvas by DPR', () => {
    const canvas = makeFakeCanvas(gl, 300, 200);
    const renderer = new GLRenderer(canvas);
    expect(renderer.init()).toBe(true);
    expect(canvas.width).toBe(600); // 300 * dpr2 * scale1
    expect(canvas.height).toBe(400);
    expect(gl.viewportArgs).toEqual([0, 0, 600, 400]);
    renderer.dispose();
  });

  it('init returns false when WebGL is unavailable', () => {
    const canvas = document.createElement('canvas');
    const renderer = new GLRenderer(canvas);
    expect(renderer.init()).toBe(false);
  });

  it('setFragmentShader throws ShaderCompileError on bad source', () => {
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    gl.failNextCompile = true;
    expect(() => renderer.setFragmentShader('bad')).toThrow(ShaderCompileError);
    renderer.dispose();
  });

  it('render feeds built-in uniforms and draws', () => {
    gl.activeUniforms = [
      { name: 'u_time', type: 0x1406 },
      { name: 'u_resolution', type: 0x8b50 },
    ];
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    renderer.render(2000);
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform1f', args: [2] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform2f', args: [600, 400] });
    expect(gl.drawCallCount).toBe(1);
    renderer.dispose();
  });

  it('setUniforms dispatches by value shape', () => {
    gl.activeUniforms = [
      { name: 'u_a', type: 0x1406 },
      { name: 'u_b', type: 0x8b50 },
      { name: 'u_c', type: 0x8b51 },
      { name: 'u_d', type: 0x8b52 },
    ];
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    renderer.setUniforms({ u_a: 1, u_b: [1, 2], u_c: [1, 2, 3], u_d: [1, 2, 3, 4], u_unknown: 9 });
    renderer.render(0);
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform1f', args: [1] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform2f', args: [1, 2] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform3f', args: [1, 2, 3] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform4f', args: [1, 2, 3, 4] });
    // u_unknown 不在 activeUniforms 中，不应产生第 5 个 1f 调用
    expect(gl.uniformCalls.filter((c) => c.method === 'uniform1f')).toHaveLength(1);
    renderer.dispose();
  });

  it('setQuality low shrinks canvas resolution', () => {
    const canvas = makeFakeCanvas(gl, 300, 200);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setQuality('low'); // dpr min(2,1)=1, scale 0.75
    expect(canvas.width).toBe(225); // 300 * 1 * 0.75
    expect(canvas.height).toBe(150);
    renderer.dispose();
  });

  it('context lost stops rendering, restored recompiles', () => {
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    const events: string[] = [];
    renderer.onContextChange('lost', () => events.push('lost'));
    renderer.onContextChange('restored', () => events.push('restored'));
    canvas.dispatchEvent(new Event('webglcontextlost'));
    renderer.render(16);
    expect(gl.drawCallCount).toBe(0);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(events).toEqual(['lost', 'restored']);
    renderer.render(16);
    expect(gl.drawCallCount).toBe(1);
    renderer.dispose();
  });

  it('dispose releases GL resources and loses context', () => {
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    renderer.dispose();
    expect(gl.deletedPrograms).toBe(1);
    expect(gl.deletedBuffers).toBe(1);
    expect(gl.loseContextCalled).toBe(true);
  });

  it('dispose removes canvas context-lost/restored event listeners', () => {
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    const events: string[] = [];
    renderer.onContextChange('lost', () => events.push('lost'));
    renderer.onContextChange('restored', () => events.push('restored'));
    renderer.dispose();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(events).toEqual([]);
  });

  it('setVideoTexture uploads video frame and sets u_texture/u_videoSize uniforms', () => {
    gl.activeUniforms = [
      { name: 'u_texture', type: 0x8b5e },
      { name: 'u_videoSize', type: 0x8b50 },
    ];
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');

    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 3, writable: true });
    Object.defineProperty(video, 'videoWidth', { value: 1280, writable: true });
    Object.defineProperty(video, 'videoHeight', { value: 720, writable: true });

    renderer.setVideoTexture(video);
    expect(gl.createdTextures).toBe(1);
    expect(gl.calls).toContainEqual({
      method: 'bindTexture',
      args: [gl.TEXTURE_2D, expect.any(Object)],
    });
    expect(gl.calls).toContainEqual({
      method: 'texParameteri',
      args: [gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR],
    });

    renderer.render(16);
    expect(gl.calls).toContainEqual({
      method: 'texImage2D',
      args: [gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video],
    });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform1i', args: [0] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform2f', args: [1280, 720] });
    renderer.dispose();
  });

  it('setVideoTexture(null) clears video and falls back to default video size', () => {
    gl.activeUniforms = [
      { name: 'u_texture', type: 0x8b5e },
      { name: 'u_videoSize', type: 0x8b50 },
    ];
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');

    const video = document.createElement('video');
    Object.defineProperty(video, 'readyState', { value: 3, writable: true });
    Object.defineProperty(video, 'videoWidth', { value: 1280, writable: true });
    Object.defineProperty(video, 'videoHeight', { value: 720, writable: true });

    renderer.setVideoTexture(video);
    renderer.setVideoTexture(null);
    renderer.render(16);

    expect(gl.calls.filter((c) => c.method === 'texImage2D')).toHaveLength(0);
    expect(gl.uniformCalls.filter((c) => c.method === 'uniform1i')).toHaveLength(0);
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform2f', args: [640, 480] });
    renderer.dispose();
  });

  it('setMouse updates u_mouse uniform as rendered', () => {
    gl.activeUniforms = [{ name: 'u_mouse', type: 0x8b50 }];
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    renderer.setMouse(0.25, 0.75);
    renderer.render(16);
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform2f', args: [0.25, 0.75] });
    renderer.dispose();
  });

  it('constructor with initialTier option starts at that tier quality', () => {
    const canvas = makeFakeCanvas(gl, 300, 200);
    const renderer = new GLRenderer(canvas, { initialTier: 'low' });
    renderer.init();
    expect(canvas.width).toBe(225);
    expect(canvas.height).toBe(150);
    renderer.dispose();
  });
});
