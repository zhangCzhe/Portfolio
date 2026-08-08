import type { QualityTier } from './types';

export interface QualityLevel {
  tier: QualityTier;
  maxDpr: number;
  resolutionScale: number;
}

export const QUALITY_LEVELS: Record<QualityTier, QualityLevel> = {
  high: { tier: 'high', maxDpr: 2, resolutionScale: 1 },
  medium: { tier: 'medium', maxDpr: 1.5, resolutionScale: 1 },
  low: { tier: 'low', maxDpr: 1, resolutionScale: 0.75 },
};

export interface DeviceEnvironment {
  isMobile: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export function detectInitialTier(env: DeviceEnvironment): QualityTier {
  if (env.isMobile) return 'medium';
  if (env.deviceMemory !== undefined && env.deviceMemory <= 4) return 'medium';
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 4) return 'medium';
  return 'high';
}

export function readDeviceEnvironment(): DeviceEnvironment {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    isMobile: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
