export type QualityTier = 'high' | 'medium' | 'low';

export type UniformValue =
  number | [number, number] | [number, number, number] | [number, number, number, number];

export type UniformSchema = Record<string, UniformValue>;
