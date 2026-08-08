export interface CanvasSlot {
  readonly id: number;
  release(): void;
}

export interface CanvasTicket {
  readonly id: number;
  readonly promise: Promise<CanvasSlot>;
  cancel(): void;
}

export class CanvasPool {
  private active = 0;
  private nextId = 0;
  private readonly waiters = new Map<number, () => void>();
  readonly maxContexts: number;

  constructor(maxContexts: number) {
    this.maxContexts = maxContexts;
  }

  get activeCount(): number {
    return this.active;
  }

  get pendingCount(): number {
    return this.waiters.size;
  }

  acquire(): CanvasTicket {
    const id = ++this.nextId;
    if (this.active < this.maxContexts) {
      this.active++;
      return { id, promise: Promise.resolve(this.makeSlot(id)), cancel: () => {} };
    }
    let resolveWaiter: () => void = () => {};
    const promise = new Promise<CanvasSlot>((resolve) => {
      resolveWaiter = () => resolve(this.makeSlot(id));
    });
    this.waiters.set(id, resolveWaiter);
    return {
      id,
      promise,
      cancel: () => {
        this.waiters.delete(id);
      },
    };
  }

  private makeSlot(id: number): CanvasSlot {
    let released = false;
    return {
      id,
      release: () => {
        if (released) return;
        released = true;
        this.handOffOrFree();
      },
    };
  }

  private handOffOrFree(): void {
    const next = this.waiters.entries().next();
    if (next.done) {
      this.active = Math.max(0, this.active - 1);
      return;
    }
    const [waiterId, resolve] = next.value;
    this.waiters.delete(waiterId);
    resolve(); // slot 直接移交，active 计数不变
  }
}
