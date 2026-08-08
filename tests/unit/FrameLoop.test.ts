import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FrameLoop } from '../../src/engine/FrameLoop';

let rafQueue: FrameRequestCallback[];
let hidden: boolean;

function flushFrames(times: number[]) {
  for (const t of times) {
    const cbs = rafQueue.splice(0);
    for (const cb of cbs) cb(t);
  }
}

beforeEach(() => {
  rafQueue = [];
  hidden = false;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FrameLoop', () => {
  it('ticks with timeMs and frameMs after start', () => {
    const ticks: [number, number][] = [];
    const loop = new FrameLoop((timeMs, frameMs) => ticks.push([timeMs, frameMs]));
    loop.start();
    flushFrames([100, 132, 165]);
    loop.dispose();
    expect(ticks).toHaveLength(3);
    expect(ticks[0]).toEqual([100, 16.7]); // first frame fallback
    expect(ticks[1]).toEqual([132, 32]);
    expect(ticks[2]).toEqual([165, 33]);
  });

  it('stop halts ticking', () => {
    const ticks: number[] = [];
    const loop = new FrameLoop((t) => ticks.push(t));
    loop.start();
    flushFrames([100]);
    loop.stop();
    flushFrames([132]);
    expect(ticks).toEqual([100]);
    loop.dispose();
  });

  it('start is idempotent', () => {
    const loop = new FrameLoop(() => {});
    loop.start();
    loop.start();
    expect(rafQueue).toHaveLength(1);
    loop.dispose();
  });

  it('does not start while document is hidden', () => {
    hidden = true;
    const loop = new FrameLoop(() => {});
    loop.start();
    expect(loop.running).toBe(false);
    loop.dispose();
  });

  it('pauses on hidden and resumes on visible', () => {
    const ticks: number[] = [];
    const loop = new FrameLoop((t) => ticks.push(t));
    loop.start();
    flushFrames([100]);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.running).toBe(false);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.running).toBe(true);
    flushFrames([200]);
    expect(ticks).toEqual([100, 200]);
    loop.dispose();
  });

  it('stays stopped on visible if it was not running before hidden', () => {
    const loop = new FrameLoop(() => {});
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.running).toBe(false);
    loop.dispose();
  });
});
