import { describe, it, expect } from 'vitest';
import { detectInitialTier, QUALITY_LEVELS } from '../../src/engine/quality';

describe('detectInitialTier', () => {
  it('returns medium for mobile devices', () => {
    expect(detectInitialTier({ isMobile: true, hardwareConcurrency: 8 })).toBe('medium');
  });
  it('returns medium for low-memory devices', () => {
    expect(detectInitialTier({ isMobile: false, deviceMemory: 4, hardwareConcurrency: 8 })).toBe(
      'medium',
    );
  });
  it('returns medium for few-core devices', () => {
    expect(detectInitialTier({ isMobile: false, deviceMemory: 8, hardwareConcurrency: 4 })).toBe(
      'medium',
    );
  });
  it('returns high for capable desktops', () => {
    expect(detectInitialTier({ isMobile: false, deviceMemory: 16, hardwareConcurrency: 12 })).toBe(
      'high',
    );
  });
  it('returns high when hardware hints are unavailable', () => {
    expect(detectInitialTier({ isMobile: false })).toBe('high');
  });
});

describe('QUALITY_LEVELS', () => {
  it('low tier caps dpr at 1 and scales resolution down', () => {
    expect(QUALITY_LEVELS.low.maxDpr).toBe(1);
    expect(QUALITY_LEVELS.low.resolutionScale).toBeLessThan(1);
  });
  it('high tier allows dpr 2 at full resolution', () => {
    expect(QUALITY_LEVELS.high.maxDpr).toBe(2);
    expect(QUALITY_LEVELS.high.resolutionScale).toBe(1);
  });
});
