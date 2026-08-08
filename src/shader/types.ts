/** 参数值：float 标量或 RGB 颜色数组 */
export type ShaderParamValue = number | [number, number, number];

export interface ShaderPreset {
  name: string;
  nameZh: string;
  values: Record<string, ShaderParamValue>;
}

export interface ShaderParam {
  name: string;
  label: string;
  labelZh: string;
  /** 参数类型，默认 'float'（向后兼容） */
  type?: 'float' | 'color';
  // float 字段:
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  // color 字段:
  defaultColor?: [number, number, number];
}

export interface ShaderDemo {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  /** Path relative to src/shaders/, e.g. 'basics/colors/01-hsb-spectrum.glsl' */
  source: string;
  params: ShaderParam[];
  presets: ShaderPreset[];
  interactive?: boolean;
}

export interface ShaderSeries {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  demos: ShaderDemo[];
}

export type ShaderCategoryId = 'basics' | 'paintings' | 'effects' | 'filters';

export interface ShaderCategory {
  id: ShaderCategoryId;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  cardType: 'shader' | 'filter';
  series: ShaderSeries[];
}
