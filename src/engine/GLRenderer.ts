import { compileShaderProgram } from './compile';
import { QUALITY_LEVELS } from './quality';
import type { QualityTier, UniformSchema } from './types';

type GL = WebGL2RenderingContext | WebGLRenderingContext;
type ContextEventKind = 'lost' | 'restored';

const FULLSCREEN_VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const QUAD_VERTICES = new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1, -1, 1, 1, -1]);

export interface GLRendererOptions {
  initialTier?: QualityTier;
}

export class GLRenderer {
  private gl: GL | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private readonly uniformLocations = new Map<string, WebGLUniformLocation>();
  private customUniforms: UniformSchema = {};
  private video: HTMLVideoElement | null = null;
  private mouse = { x: 0.5, y: 0.5 };
  private maxDpr: number;
  private resolutionScale: number;
  private fragmentSource: string | null = null;
  private lost = false;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly canvas: HTMLCanvasElement;
  private readonly listeners: Record<ContextEventKind, Set<() => void>> = {
    lost: new Set(),
    restored: new Set(),
  };

  constructor(canvas: HTMLCanvasElement, opts: GLRendererOptions = {}) {
    this.canvas = canvas;
    const level = QUALITY_LEVELS[opts.initialTier ?? 'high'];
    this.maxDpr = level.maxDpr;
    this.resolutionScale = level.resolutionScale;
  }

  init(): boolean {
    if (this.gl) return true;
    const gl = (this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    }) ??
      this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
      })) as GL | null;
    if (!gl) return false;
    this.gl = gl;
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
    }
    this.resize();
    return true;
  }

  setFragmentShader(source: string): void {
    const gl = this.requireGL();
    this.fragmentSource = source;
    const program = compileShaderProgram(gl, FULLSCREEN_VERTEX_SHADER, source);
    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    gl.useProgram(program);
    this.discoverUniforms();
    this.setupGeometry();
  }

  setUniforms(uniforms: Partial<UniformSchema>): void {
    const next: UniformSchema = { ...this.customUniforms };
    for (const [key, value] of Object.entries(uniforms)) {
      if (value !== undefined) {
        next[key] = value;
      }
    }
    this.customUniforms = next;
  }

  setVideoTexture(video: HTMLVideoElement | null): void {
    this.video = video;
    const gl = this.gl;
    if (video && gl && !this.texture) {
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  setMouse(x: number, y: number): void {
    this.mouse = { x, y };
  }

  setQuality(tier: QualityTier): void {
    const level = QUALITY_LEVELS[tier];
    this.maxDpr = level.maxDpr;
    this.resolutionScale = level.resolutionScale;
    this.resize();
  }

  resize(): void {
    const gl = this.gl;
    if (!gl) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio, this.maxDpr) * this.resolutionScale;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(timeMs: number): void {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program || this.lost || this.disposed) return;
    gl.useProgram(program);
    const t = timeMs * 0.001;
    for (const [name, location] of this.uniformLocations) {
      switch (name) {
        case 'u_time':
          gl.uniform1f(location, t);
          break;
        case 'u_resolution':
          gl.uniform2f(location, this.canvas.width, this.canvas.height);
          break;
        case 'u_mouse':
          gl.uniform2f(location, this.mouse.x, this.mouse.y);
          break;
        case 'u_texture':
          this.uploadVideoFrame(gl, location);
          break;
        case 'u_videoSize':
          this.uploadVideoSize(gl, location);
          break;
        default:
          this.applyCustomUniform(gl, name, location);
      }
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  onContextChange(kind: ContextEventKind, fn: () => void): void {
    this.listeners[kind].add(fn);
  }

  dispose(): void {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    const gl = this.gl;
    if (gl) {
      try {
        if (this.program) gl.deleteProgram(this.program);
      } catch {
        /* ignore */
      }
      try {
        if (this.buffer) gl.deleteBuffer(this.buffer);
      } catch {
        /* ignore */
      }
      try {
        if (this.texture) gl.deleteTexture(this.texture);
      } catch {
        /* ignore */
      }
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* ignore */
      }
    }
    this.program = null;
    this.buffer = null;
    this.texture = null;
    this.gl = null;
  }

  // ── internal ──

  private requireGL(): GL {
    const gl = this.gl;
    if (!gl) throw new Error('GLRenderer: init() must succeed before use');
    return gl;
  }

  private discoverUniforms(): void {
    const gl = this.requireGL();
    const program = this.program;
    if (!program) return;
    this.uniformLocations.clear();
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const location = gl.getUniformLocation(program, info.name);
      if (!location) continue;
      this.uniformLocations.set(info.name, location);
    }
  }

  private setupGeometry(): void {
    const gl = this.requireGL();
    const program = this.program;
    if (!program) return;
    if (this.buffer) gl.deleteBuffer(this.buffer);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  }

  private uploadVideoFrame(gl: GL, location: WebGLUniformLocation): void {
    const video = this.video;
    if (!this.texture || !video || video.readyState < video.HAVE_CURRENT_DATA) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.uniform1i(location, 0);
  }

  private uploadVideoSize(gl: GL, location: WebGLUniformLocation): void {
    const video = this.video;
    if (video && video.videoWidth > 0) {
      gl.uniform2f(location, video.videoWidth, video.videoHeight);
    } else {
      gl.uniform2f(location, 640, 480);
    }
  }

  private applyCustomUniform(gl: GL, name: string, location: WebGLUniformLocation): void {
    const value = this.customUniforms[name];
    if (value === undefined) return;
    if (typeof value === 'number') {
      gl.uniform1f(location, value);
      return;
    }
    switch (value.length) {
      case 2: {
        const [x, y] = value;
        gl.uniform2f(location, x, y);
        break;
      }
      case 3: {
        const [x, y, z] = value;
        gl.uniform3f(location, x, y, z);
        break;
      }
      case 4: {
        const [x, y, z, w] = value;
        gl.uniform4f(location, x, y, z, w);
        break;
      }
    }
  }

  private emit(kind: ContextEventKind): void {
    for (const fn of this.listeners[kind]) fn();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.lost = true;
    this.emit('lost');
  };

  private handleContextRestored = (): void => {
    this.lost = false;
    try {
      if (this.fragmentSource) this.setFragmentShader(this.fragmentSource);
      this.resize();
    } catch {
      /* 重建失败时保持无 program，render 空转 */
    }
    this.emit('restored');
  };
}
