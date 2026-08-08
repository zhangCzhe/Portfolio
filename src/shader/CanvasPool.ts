import { useEffect, useState } from 'react';

const MAX_ACTIVE = 5; // card contexts (＋1 for background = 6 total)
let activeCount = 0;
let nextId = 0;
const waiters = new Map<number, () => void>();

function notifyNext() {
  if (waiters.size === 0 || activeCount >= MAX_ACTIVE) return;
  const next = waiters.entries().next();
  if (next.done) return;
  const [id, resolve] = next.value;
  waiters.delete(id);
  activeCount++;
  resolve();
}

function tryAcquire(): boolean {
  if (activeCount < MAX_ACTIVE) {
    activeCount++;
    return true;
  }
  return false;
}

function waitForSlot(id: number): Promise<void> {
  return new Promise((resolve) => {
    waiters.set(id, resolve);
  });
}

function release(id: number): void {
  if (waiters.has(id)) {
    waiters.delete(id); // still waiting, never got a slot
    return;
  }
  activeCount = Math.max(0, activeCount - 1);
  notifyNext();
}

export function useCanvasSlot(active: boolean): boolean {
  const [granted, setGranted] = useState(false);
  const [id] = useState(() => ++nextId);

  useEffect(() => {
    if (!active) {
      if (granted) {
        release(id);
        setGranted(false);
      }
      return;
    }

    if (granted) return;

    if (tryAcquire()) {
      setGranted(true);
      return;
    }

    let cancelled = false;
    waitForSlot(id).then(() => {
      if (!cancelled) setGranted(true);
    });

    return () => {
      cancelled = true;
      if (!granted) {
        // Still waiting — remove from queue on unmount / deactivation
        waiters.delete(id);
      }
    };
  }, [active, granted, id]);

  // Release on unmount
  useEffect(() => {
    return () => {
      release(id);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return granted;
}
