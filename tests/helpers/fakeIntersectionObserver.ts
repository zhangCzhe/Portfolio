import { vi } from 'vitest';

export interface FakeIntersectionObserverHandle {
  /** 向当前所有存活的 observer 回调广播一次 intersection 状态 */
  triggerAll(isIntersecting: boolean): void;
}

export function installFakeIntersectionObserver(): FakeIntersectionObserverHandle {
  const callbacks = new Set<IntersectionObserverCallback>();

  class FakeIntersectionObserver {
    private cb: IntersectionObserverCallback;

    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
      callbacks.add(cb);
    }

    observe(): void {}
    unobserve(): void {}
    disconnect(): void {
      callbacks.delete(this.cb);
    }
  }

  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

  return {
    triggerAll(isIntersecting: boolean) {
      for (const cb of [...callbacks]) {
        cb([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
      }
    },
  };
}
