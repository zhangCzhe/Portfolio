import { useEffect, useRef, useState } from 'react';
import { CanvasPool } from '../engine/CanvasPool';
import type { CanvasSlot, CanvasTicket } from '../engine/CanvasPool';

/** 卡片 canvas 的 context 预算（背景 canvas 独立占用第 6 个） */
export const cardCanvasPool = new CanvasPool(5);

/** 展厅模式 canvas 独立预算：不占用卡片池，关闭即释放 */
export const focusCanvasPool = new CanvasPool(1);

export function useCanvasSlot(active: boolean, pool: CanvasPool = cardCanvasPool): boolean {
  const [granted, setGranted] = useState(false);
  const slotRef = useRef<CanvasSlot | null>(null);
  const ticketRef = useRef<CanvasTicket | null>(null);

  useEffect(() => {
    if (!active) return;
    const ticket = pool.acquire();
    ticketRef.current = ticket;
    let cancelled = false;
    void ticket.promise.then((slot) => {
      if (cancelled) {
        slot.release();
        return;
      }
      slotRef.current = slot;
      setGranted(true);
    });
    return () => {
      cancelled = true;
      ticket.cancel();
      ticketRef.current = null;
      slotRef.current?.release();
      slotRef.current = null;
      setGranted(false);
    };
  }, [active, pool]);

  return granted;
}
