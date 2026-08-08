import { describe, it, expect } from 'vitest';

// 验证类型定义的正确性 —— 编译时 + 运行时双检
describe('color parameter types', () => {
  it('accepts ShaderParam with type=color and defaultColor', () => {
    const param: import('../../src/shader/types').ShaderParam = {
      name: 'u_tint',
      label: 'Tint',
      labelZh: '色调',
      type: 'color',
      defaultColor: [0.8, 0.6, 0.4],
    };
    expect(param.type).toBe('color');
    expect(param.defaultColor).toEqual([0.8, 0.6, 0.4]);
  });

  it('treats missing type as float (backward compat)', () => {
    const param: import('../../src/shader/types').ShaderParam = {
      name: 'u_speed',
      label: 'Speed',
      labelZh: '速度',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5,
    };
    expect(param.type ?? 'float').toBe('float');
  });

  it('accepts ShaderPreset values with color arrays', () => {
    const preset: import('../../src/shader/types').ShaderPreset = {
      name: 'warm',
      nameZh: '暖色',
      values: {
        u_speed: 0.5,
        u_tint: [1.0, 0.5, 0.2] as [number, number, number],
      },
    };
    expect(Array.isArray(preset.values.u_tint)).toBe(true);
  });

  it('accepts UniformSchema with color arrays for GLRenderer', () => {
    const uniforms: import('../../src/engine/types').UniformSchema = {
      u_speed: 1.0,
      u_color1: [0.2, 0.5, 0.8],
      u_color2: [1.0, 0.3, 0.1],
    };
    expect(uniforms.u_speed).toBe(1.0);
    expect(uniforms.u_color1).toEqual([0.2, 0.5, 0.8]);
  });
});
