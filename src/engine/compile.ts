export interface ShaderError {
  line: number;
  message: string;
}

export class ShaderCompileError extends Error {
  readonly errors: ShaderError[];
  readonly stage: 'compile' | 'link';

  constructor(message: string, errors: ShaderError[], stage: 'compile' | 'link') {
    super(message);
    this.name = 'ShaderCompileError';
    this.errors = errors;
    this.stage = stage;
  }
}

export function parseShaderLog(log: string): ShaderError[] {
  const errors: ShaderError[] = [];
  for (const rawLine of log.split('\n')) {
    const m = /ERROR:\s*\d+:(\d+):\s*(.+)/.exec(rawLine);
    const lineStr = m?.[1];
    const msg = m?.[2];
    if (lineStr !== undefined && msg !== undefined) {
      errors.push({ line: Number.parseInt(lineStr, 10), message: msg.trim() });
    }
  }
  if (errors.length === 0 && log.trim().length > 0) {
    errors.push({ line: 0, message: log.trim() });
  }
  return errors;
}

type GL = WebGL2RenderingContext | WebGLRenderingContext;

function compileShader(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new ShaderCompileError('Failed to create shader', [], 'compile');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new ShaderCompileError(log, parseShaderLog(log), 'compile');
  }
  return shader;
}

export function compileShaderProgram(
  gl: GL,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) throw new ShaderCompileError('Failed to create program', [], 'link');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'Unknown program link error';
    gl.deleteProgram(program);
    throw new ShaderCompileError(log, parseShaderLog(log), 'link');
  }
  return program;
}
