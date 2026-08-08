export type FrameTick = (timeMs: number, frameMs: number) => void;

export class FrameLoop {
  private rafId: number | null = null;
  private lastTimeMs: number | null = null;
  private wasRunningBeforeHidden = false;
  private generation = 0;
  private readonly tick: FrameTick;

  constructor(tick: FrameTick) {
    this.tick = tick;
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  get running(): boolean {
    return this.rafId !== null;
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.lastTimeMs = null;
    this.rafId = requestAnimationFrame(this.stepForGeneration(++this.generation));
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  dispose(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  private stepForGeneration =
    (gen: number) =>
    (timeMs: number): void => {
      if (this.rafId === null || this.generation !== gen) return;
      const frameMs = this.lastTimeMs === null ? 16.7 : timeMs - this.lastTimeMs;
      this.lastTimeMs = timeMs;
      this.tick(timeMs, frameMs);
      this.rafId = requestAnimationFrame(this.stepForGeneration(++this.generation));
    };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.wasRunningBeforeHidden = this.running;
      this.stop();
    } else if (this.wasRunningBeforeHidden) {
      this.wasRunningBeforeHidden = false;
      this.start();
    }
  };
}
