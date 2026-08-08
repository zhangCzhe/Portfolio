export interface ShaderPreset {
  name: string;
  nameZh: string;
  values: Record<string, number>;
}

export interface ShaderParam {
  name: string;
  label: string;
  labelZh: string;
  min: number;
  max: number;
  step: number;
  default: number;
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
