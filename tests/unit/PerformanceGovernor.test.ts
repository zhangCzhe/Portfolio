import { describe, it, expect, vi } from 'vitest';
import { PerformanceGovernor } from '../../src/engine/PerformanceGovernor';
import type { QualityTier } from '../../src/engine/types';

function makeGovernor(initial: QualityTier, startAt = 0) {
  let now = startAt;
  const changes: QualityTier[] = [];
  const governor = new PerformanceGovernor({
    initial,
    onTierChange: (t) => changes.push(t),
    now: () => now,
  });
  return {
    governor,
    changes,
    advance(ms: number) {
      now += ms;
    },
    feed(frames: number, frameMs: number, stepMs = frameMs) {
      for (let i = 0; i < frames; i++) {
        now += stepMs;
        governor.sample(frameMs);
      }
    },
  };
}

describe('PerformanceGovernor', () => {
  it('does not decide until the sample window is full', () => {
    const g = makeGovernor('high');
    g.feed(59, 50); // 20fps but incomplete window
    expect(g.governor.tier).toBe('high');
    expect(g.changes).toEqual([]);
  });

  it('downgrades after sustained low fps', () => {
    const g = makeGovernor('high');
    g.feed(60, 22); // ~45fps boundary — just above downgrade threshold
    expect(g.governor.tier).toBe('high');
    g.feed(60, 50); // 20fps, spans > 1500ms of sustained slowness
    expect(g.governor.tier).toBe('medium');
    expect(g.changes).toEqual(['medium']);
  });

  it('does not downgrade on a brief dip', () => {
    const g = makeGovernor('high');
    g.feed(60, 10);
    g.feed(20, 50); // dip
    g.feed(60, 10); // recover — window average back up
    expect(g.governor.tier).toBe('high');
  });

  it('never goes below low', () => {
    const g = makeGovernor('low');
    g.feed(300, 100); // 10fps for a long time
    expect(g.governor.tier).toBe('low');
    expect(g.changes).toEqual([]);
  });

  it('upgrades after sustained high fps and notifies', () => {
    const g = makeGovernor('medium');
    g.feed(400, 10, 16); // 100fps, ~6.4s elapsed
    expect(g.governor.tier).toBe('high');
    expect(g.changes).toEqual(['high']);
  });

  it('respects upgrade cooldown', () => {
    const g = makeGovernor('low');
    g.feed(400, 10, 16); // upgrade to medium at ~5s
    expect(g.governor.tier).toBe('medium');
    g.feed(200, 10, 16); // ~3.2s more — still within 10s cooldown
    expect(g.governor.tier).toBe('medium');
    expect(g.changes).toEqual(['medium']);
  });

  it('ignores non-positive frame samples', () => {
    const onTierChange = vi.fn();
    const governor = new PerformanceGovernor({ initial: 'high', onTierChange });
    governor.sample(0);
    governor.sample(-5);
    expect(governor.tier).toBe('high');
  });
});
