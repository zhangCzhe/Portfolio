export interface FakeActiveUniform {
  name: string;
  type: number;
}

/** 最小 WebGL2 替身：只实现 GLRenderer 用到的方法，全部调用可断言 */
export class FakeGL {
  readonly VERTEX_SHADER = 0x8b31;
  readonly FRAGMENT_SHADER = 0x8b30;
  readonly COMPILE_STATUS = 0x8b81;
  readonly LINK_STATUS = 0x8b82;
  readonly ACTIVE_UNIFORMS = 0x8b86;
  readonly ARRAY_BUFFER = 0x8892;
  readonly STATIC_DRAW = 0x88e4;
  readonly FLOAT = 0x1406;
  readonly TRIANGLES = 0x0004;
  readonly TEXTURE_2D = 0x0de1;
  readonly TEXTURE0 = 0x84c0;
  readonly TEXTURE_MIN_FILTER = 0x2801;
  readonly TEXTURE_MAG_FILTER = 0x2800;
  readonly TEXTURE_WRAP_S = 0x2802;
  readonly TEXTURE_WRAP_T = 0x2803;
  readonly CLAMP_TO_EDGE = 0x812f;
  readonly LINEAR = 0x2601;
  readonly RGBA = 0x1908;
  readonly UNSIGNED_BYTE = 0x1401;
  readonly UNPACK_FLIP_Y_WEBGL = 0x9240;

  activeUniforms: FakeActiveUniform[] = [];
  failNextCompile = false;
  drawCallCount = 0;
  viewportArgs: number[] = [];
  loseContextCalled = false;
  deletedPrograms = 0;
  deletedBuffers = 0;
  deletedTextures = 0;
  createdTextures = 0;
  readonly uniformCalls: { method: string; args: unknown[] }[] = [];
  readonly calls: { method: string; args: unknown[] }[] = [];
  private failCompileFlag = false;

  createShader(): object {
    return {};
  }
  shaderSource(): void {}
  compileShader(): void {
    this.failCompileFlag = this.failNextCompile;
    this.failNextCompile = false;
  }
  getShaderParameter(): boolean {
    return !this.failCompileFlag;
  }
  getShaderInfoLog(): string {
    return "ERROR: 0:4: 'x' : syntax error";
  }
  deleteShader(): void {}
  createProgram(): object {
    return {};
  }
  attachShader(): void {}
  linkProgram(): void {}
  getProgramParameter(_p: unknown, pname: number): unknown {
    if (pname === this.LINK_STATUS) return true;
    if (pname === this.ACTIVE_UNIFORMS) return this.activeUniforms.length;
    return null;
  }
  getProgramInfoLog(): string {
    return 'link error';
  }
  deleteProgram(): void {
    this.deletedPrograms++;
  }
  useProgram(): void {}
  createBuffer(): object {
    return {};
  }
  bindBuffer(): void {}
  bufferData(): void {}
  deleteBuffer(): void {
    this.deletedBuffers++;
  }
  getAttribLocation(): number {
    return 0;
  }
  enableVertexAttribArray(): void {}
  vertexAttribPointer(): void {}
  createTexture(): object {
    this.createdTextures++;
    this.calls.push({ method: 'createTexture', args: [] });
    return {};
  }
  bindTexture(target: number, texture: unknown): void {
    this.calls.push({ method: 'bindTexture', args: [target, texture] });
  }
  texParameteri(target: number, pname: number, param: number): void {
    this.calls.push({ method: 'texParameteri', args: [target, pname, param] });
  }
  texImage2D(
    target: number,
    level: number,
    internalformat: number,
    widthOrFormat: number,
    heightOrType: number,
    borderOrSrc: unknown,
    format?: number,
    type?: number,
    src?: unknown,
  ): void {
    const args =
      format === undefined
        ? [target, level, internalformat, widthOrFormat, heightOrType, borderOrSrc]
        : [
            target,
            level,
            internalformat,
            widthOrFormat,
            heightOrType,
            borderOrSrc,
            format,
            type,
            src,
          ];
    this.calls.push({ method: 'texImage2D', args });
  }
  deleteTexture(): void {
    this.deletedTextures++;
    this.calls.push({ method: 'deleteTexture', args: [] });
  }
  activeTexture(unit: number): void {
    this.calls.push({ method: 'activeTexture', args: [unit] });
  }
  pixelStorei(pname: number, param: number): void {
    this.calls.push({ method: 'pixelStorei', args: [pname, param] });
  }
  getActiveUniform(_p: unknown, index: number): FakeActiveUniform | null {
    return this.activeUniforms[index] ?? null;
  }
  getUniformLocation(_p: unknown, name: string): object | null {
    return { name };
  }
  uniform1f(_loc: unknown, x: number): void {
    this.uniformCalls.push({ method: 'uniform1f', args: [x] });
  }
  uniform2f(_loc: unknown, x: number, y: number): void {
    this.uniformCalls.push({ method: 'uniform2f', args: [x, y] });
  }
  uniform3f(_loc: unknown, x: number, y: number, z: number): void {
    this.uniformCalls.push({ method: 'uniform3f', args: [x, y, z] });
  }
  uniform4f(_loc: unknown, x: number, y: number, z: number, w: number): void {
    this.uniformCalls.push({ method: 'uniform4f', args: [x, y, z, w] });
  }
  uniform1i(_loc: unknown, x: number): void {
    this.uniformCalls.push({ method: 'uniform1i', args: [x] });
  }
  viewport(x: number, y: number, w: number, h: number): void {
    this.viewportArgs = [x, y, w, h];
  }
  drawArrays(): void {
    this.drawCallCount++;
  }
  getExtension(name: string): object | null {
    if (name === 'WEBGL_lose_context') {
      return {
        loseContext: () => {
          this.loseContextCalled = true;
        },
      };
    }
    return null;
  }
}

export function makeFakeCanvas(gl: FakeGL, rectWidth = 300, rectHeight = 200): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getContext', {
    value: (type: string) => (type.startsWith('webgl') ? gl : null),
  });
  canvas.getBoundingClientRect = () =>
    ({
      width: rectWidth,
      height: rectHeight,
      top: 0,
      left: 0,
      right: rectWidth,
      bottom: rectHeight,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return canvas;
}
