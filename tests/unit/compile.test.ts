import { describe, it, expect } from 'vitest';
import { parseShaderLog, compileShaderProgram, ShaderCompileError } from '../../src/engine/compile';

describe('parseShaderLog', () => {
  it('parses a single error with line number', () => {
    const log = "ERROR: 0:7: 'foo' : undeclared identifier";
    expect(parseShaderLog(log)).toEqual([{ line: 7, message: "'foo' : undeclared identifier" }]);
  });
  it('parses multiple errors', () => {
    const log = "ERROR: 0:3: 'a' : error one\nERROR: 0:9: 'b' : error two";
    const errors = parseShaderLog(log);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({ line: 3, message: "'a' : error one" });
    expect(errors[1]).toEqual({ line: 9, message: "'b' : error two" });
  });
  it('falls back to line 0 for non-standard logs', () => {
    expect(parseShaderLog('Something went wrong')).toEqual([
      { line: 0, message: 'Something went wrong' },
    ]);
  });
  it('returns empty array for empty log', () => {
    expect(parseShaderLog('')).toEqual([]);
    expect(parseShaderLog('  \n  ')).toEqual([]);
  });
});

function makeFakeGL(overrides: { failCompile?: boolean; failLink?: boolean }) {
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => !overrides.failCompile,
    getShaderInfoLog: () => "ERROR: 0:4: 'x' : syntax error",
    deleteShader: () => {},
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => !overrides.failLink,
    getProgramInfoLog: () => 'Link failed: stage mismatch',
    deleteProgram: () => {},
  } as unknown as WebGL2RenderingContext;
}

describe('compileShaderProgram', () => {
  it('throws ShaderCompileError with stage=compile on shader failure', () => {
    const gl = makeFakeGL({ failCompile: true });
    try {
      compileShaderProgram(gl, 'vert', 'frag');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ShaderCompileError);
      const err = e as ShaderCompileError;
      expect(err.stage).toBe('compile');
      expect(err.errors[0]?.line).toBe(4);
      expect(err.message).toContain('ERROR: 0:4');
    }
  });
  it('throws ShaderCompileError with stage=link on link failure', () => {
    const gl = makeFakeGL({ failLink: true });
    try {
      compileShaderProgram(gl, 'vert', 'frag');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ShaderCompileError);
      expect((e as ShaderCompileError).stage).toBe('link');
    }
  });
  it('returns program on success', () => {
    const gl = makeFakeGL({});
    expect(compileShaderProgram(gl, 'vert', 'frag')).toBeTruthy();
  });
});
