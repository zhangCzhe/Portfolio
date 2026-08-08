import { describe, it, expect } from 'vitest';
import { CanvasPool, type CanvasSlot } from '../../src/engine/CanvasPool';

async function slotOf(pool: CanvasPool): Promise<CanvasSlot> {
  return pool.acquire().promise;
}

describe('CanvasPool', () => {
  it('grants immediately under budget', async () => {
    const pool = new CanvasPool(2);
    const slot = await slotOf(pool);
    expect(pool.activeCount).toBe(1);
    slot.release();
    expect(pool.activeCount).toBe(0);
  });

  it('queues acquires beyond budget and grants FIFO on release', async () => {
    const pool = new CanvasPool(1);
    const first = await slotOf(pool);
    const order: string[] = [];
    const t2 = pool.acquire();
    const t3 = pool.acquire();
    void t2.promise.then(() => order.push('second'));
    void t3.promise.then(() => order.push('third'));
    expect(pool.activeCount).toBe(1);
    expect(pool.pendingCount).toBe(2);

    first.release();
    await t2.promise;
    expect(order).toEqual(['second']);
    expect(pool.activeCount).toBe(1); // slot handed off, not freed

    (await t2.promise).release();
    await t3.promise;
    expect(order).toEqual(['second', 'third']);
  });

  it('cancel removes a pending waiter', async () => {
    const pool = new CanvasPool(1);
    const first = await slotOf(pool);
    const ticket = pool.acquire();
    ticket.cancel();
    expect(pool.pendingCount).toBe(0);
    first.release();
    expect(pool.activeCount).toBe(0);
  });

  it('double release is a safe no-op', async () => {
    const pool = new CanvasPool(1);
    const slot = await slotOf(pool);
    slot.release();
    slot.release();
    expect(pool.activeCount).toBe(0);
  });

  it('released slot wakes the next waiter instead of decrementing', async () => {
    const pool = new CanvasPool(1);
    const first = await slotOf(pool);
    const ticket = pool.acquire();
    first.release();
    const second = await ticket.promise;
    expect(pool.activeCount).toBe(1);
    second.release();
    expect(pool.activeCount).toBe(0);
  });
});
