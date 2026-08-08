import type { QualityTier } from './types';

export interface GovernorOptions {
  initial: QualityTier;
  onTierChange: (tier: QualityTier) => void;
  now?: () => number;
  windowSize?: number;
  downgradeFps?: number;
  downgradeSustainMs?: number;
  upgradeFps?: number;
  upgradeSustainMs?: number;
  upgradeCooldownMs?: number;
}

function lower(tier: QualityTier): QualityTier {
  return tier === 'high' ? 'medium' : 'low';
}

function higher(tier: QualityTier): QualityTier {
  return tier === 'low' ? 'medium' : 'high';
}

export class PerformanceGovernor {
  private readonly samples: number[] = [];
  private readonly windowSize: number;
  private readonly now: () => number;
  private readonly downgradeFps: number;
  private readonly downgradeSustainMs: number;
  private readonly upgradeFps: number;
  private readonly upgradeSustainMs: number;
  private readonly upgradeCooldownMs: number;
  private readonly onTierChange: (tier: QualityTier) => void;
  private badSince: number | null = null;
  private goodSince: number | null = null;
  private lastUpgradeAt = Number.NEGATIVE_INFINITY;
  private currentTier: QualityTier;

  constructor(opts: GovernorOptions) {
    this.currentTier = opts.initial;
    this.onTierChange = opts.onTierChange;
    this.now = opts.now ?? (() => performance.now());
    this.windowSize = opts.windowSize ?? 60;
    this.downgradeFps = opts.downgradeFps ?? 45;
    this.downgradeSustainMs = opts.downgradeSustainMs ?? 1500;
    this.upgradeFps = opts.upgradeFps ?? 58;
    this.upgradeSustainMs = opts.upgradeSustainMs ?? 5000;
    this.upgradeCooldownMs = opts.upgradeCooldownMs ?? 10000;
  }

  get tier(): QualityTier {
    return this.currentTier;
  }

  sample(frameMs: number): void {
    if (frameMs <= 0) return;
    this.samples.push(frameMs);
    if (this.samples.length > this.windowSize) this.samples.shift();
    if (this.samples.length < this.windowSize) return;

    const avgMs = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const fps = 1000 / avgMs;
    const now = this.now();

    if (fps < this.downgradeFps) {
      this.goodSince = null;
      if (this.currentTier === 'low') {
        console.info('[PerformanceGovernor] tier floor reached');
        return;
      }
      this.badSince ??= now;
      if (now - this.badSince >= this.downgradeSustainMs) {
        this.currentTier = lower(this.currentTier);
        this.badSince = null;
        this.onTierChange(this.currentTier);
      }
      return;
    }
    this.badSince = null;

    if (fps > this.upgradeFps && this.currentTier !== 'high') {
      this.goodSince ??= now;
      const cooledDown = now - this.lastUpgradeAt >= this.upgradeCooldownMs;
      if (cooledDown && now - this.goodSince >= this.upgradeSustainMs) {
        this.currentTier = higher(this.currentTier);
        this.goodSince = null;
        this.lastUpgradeAt = now;
        this.onTierChange(this.currentTier);
      }
    } else {
      this.goodSince = null;
    }
  }
}
