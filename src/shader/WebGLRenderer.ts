import { createProgram, FULLSCREEN_VERTEX_SHADER, createFullscreenQuad } from '../utils/webgl';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  fragmentSource: string;
  interactive?: boolean;
  useTexture?: boolean;
  onError?: (msg: string | null) => void;
}

interface UniformInfo {
  location: WebGLUniformLocation;
  type: number;
  name: string;
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private uniforms: UniformInfo[] = [];
  private raf = 0;
  private startTime = 0;
  private lost = false;
  private disposed = false;
  private started = false;
  private resizeObserver: ResizeObserver | null = null;

  private fragmentSource: string;
  private interactive: boolean;
  private useTexture: boolean;
  private onError: (msg: string | null) => void;

  customValues: Record<string, number> = {};
  mouse = { x: 0.5, y: 0.5 };
  videoElement: HTMLVideoElement | null = null;

  constructor(opts: RendererOptions) {
    this.canvas = opts.canvas;
    this.fragmentSource = opts.fragmentSource;
    this.interactive = opts.interactive ?? false;
    this.useTexture = opts.useTexture ?? false;
    this.onError = opts.onError ?? (() => {});
  }

  start(): void {
    if (this.disposed) return;

    if (!this.started) {
      const raw = (this.canvas.getContext('webgl2', {
        alpha: true, antialias: false, powerPreference: 'high-performance',
      }) || this.canvas.getContext('webgl', {
        alpha: true, antialias: false,
      })) as WebGL2RenderingContext | null;

      if (!raw) {
        this.onError('WebGL not supported');
        return;
      }
      this.gl = raw;
      this.canvas.addEventListener('webglcontextlost', this.onContextLost);
      this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
      this.started = true;
    }

    const result = this.compile();
    if (!result.ok) return; // compile failed — onError already called

    this.setupGeometry();
    this.setupResizeObserver();
    this.resize();

    this.startTime = performance.now();
    this.lost = false;
    this.onError(null);
    this.render();
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  setSource(source: string): { ok: true } | { ok: false; error: string } {
    this.fragmentSource = source;
    if (!this.gl) return { ok: false, error: 'No GL context' };
    return this.compile();
  }

  setUniform(name: string, value: number): void {
    this.customValues[name] = value;
  }

  resize(): void {
    const gl = this.gl;
    const canvas = this.canvas;
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const rect = canvas.getBoundingClientRect();
    // Guard: canvas may be detached or not laid out yet
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.releaseGL();

    // Force GPU resource release
    const ext = this.gl?.getExtension('WEBGL_lose_context');
    if (ext) {
      try { ext.loseContext(); } catch { /* ignore */ }
    }
    this.gl = null;
  }

  // ── internal ──

  private compile(): { ok: true } | { ok: false; error: string } {
    const gl = this.gl!;
    try {
      const program = createProgram(gl, FULLSCREEN_VERTEX_SHADER, this.fragmentSource);

      if (this.program) {
        gl.deleteProgram(this.program);
      }
      this.program = program;
      gl.useProgram(program);
      this.discoverUniforms();

      this.onError(null);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.onError(msg);
      return { ok: false, error: msg };
    }
  }

  private discoverUniforms(): void {
    const gl = this.gl!;
    const program = this.program!;
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    this.uniforms = [];

    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const loc = gl.getUniformLocation(program, info.name);
      if (!loc) continue;
      this.uniforms.push({ location: loc, type: info.type, name: info.name });
    }
  }

  private setupGeometry(): void {
    const gl = this.gl!;
    const program = this.program!;
    if (this.buffer) gl.deleteBuffer(this.buffer);

    this.buffer = createFullscreenQuad(gl);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    if (this.useTexture) {
      if (this.texture) gl.deleteTexture(this.texture);
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  private setupResizeObserver(): void {
    if (this.resizeObserver) return;
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
  }

  private render = (): void => {
    if (this.lost || this.disposed) return;
    const gl = this.gl!;
    const program = this.program!;

    const t = (performance.now() - this.startTime) * 0.001;

    gl.useProgram(program);

    for (const u of this.uniforms) {
      switch (u.name) {
        case 'u_time':
          gl.uniform1f(u.location, t);
          break;
        case 'u_resolution':
          gl.uniform2f(u.location, this.canvas.width, this.canvas.height);
          break;
        case 'u_mouse':
          if (this.interactive) {
            gl.uniform2f(u.location, this.mouse.x, this.mouse.y);
          }
          break;
        case 'u_texture':
          if (this.useTexture && this.texture && this.videoElement && this.videoElement.readyState >= this.videoElement.HAVE_CURRENT_DATA) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoElement);
            gl.uniform1i(u.location, 0);
          }
          break;
        case 'u_videoSize':
          if (this.videoElement && this.videoElement.videoWidth > 0) {
            gl.uniform2f(u.location, this.videoElement.videoWidth, this.videoElement.videoHeight);
          } else {
            gl.uniform2f(u.location, 640, 480);
          }
          break;
        default:
          if (this.customValues[u.name] !== undefined) {
            gl.uniform1f(u.location, this.customValues[u.name]);
          }
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.raf = requestAnimationFrame(this.render);
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.lost = true;
    this.onError('WebGL context lost');
  };

  private onContextRestored = (): void => {
    const gl = this.gl!;
    try { if (this.program) gl.deleteProgram(this.program); } catch { /* ignore */ }
    try { if (this.buffer) gl.deleteBuffer(this.buffer); } catch { /* ignore */ }
    try { if (this.texture) gl.deleteTexture(this.texture); } catch { /* ignore */ }

    this.compile();
    this.setupGeometry();
    this.resize();
    this.lost = false;
    this.startTime = performance.now();
    this.render();
  };

  private releaseGL(): void {
    const gl = this.gl;
    if (!gl) return;
    try { if (this.program) gl.deleteProgram(this.program); } catch { /* ignore */ }
    try { if (this.buffer) gl.deleteBuffer(this.buffer); } catch { /* ignore */ }
    try { if (this.texture) gl.deleteTexture(this.texture); } catch { /* ignore */ }
    this.program = null;
    this.buffer = null;
    this.texture = null;
  }
}
