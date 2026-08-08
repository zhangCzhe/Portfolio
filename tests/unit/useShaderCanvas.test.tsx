import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useShaderCanvas } from '../../src/hooks/useShaderCanvas';
import { cardCanvasPool } from '../../src/hooks/useCanvasSlot';
import { FakeGL } from '../helpers/fakeGL';

let fakeGLs: FakeGL[];
let rafQueue: FrameRequestCallback[];
let intersectionCbs: IntersectionObserverCallback[];

function flushRaf(times: number[]) {
  for (const t of times) {
    const cbs = rafQueue.splice(0);
    for (const cb of cbs) cb(t);
  }
}

function triggerIntersection(isIntersecting: boolean) {
  const cbs = [...intersectionCbs];
  for (const cb of cbs) {
    cb([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
  }
}

class FakeIntersectionObserver {
  constructor(private cb: IntersectionObserverCallback) {
    intersectionCbs.push(cb);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    intersectionCbs = intersectionCbs.filter((cb) => cb !== this.cb);
  }
}

function Host({
  fragmentShader,
  onCompileError,
}: {
  fragmentShader: string;
  onCompileError?: (m: string | null) => void;
}) {
  const { containerRef, active, glError } = useShaderCanvas({ fragmentShader, onCompileError });
  return (
    <div>
      <div ref={containerRef} data-testid="container" />
      <span data-testid="active">{String(active)}</span>
      <span data-testid="glError">{glError ?? 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  fakeGLs = [];
  rafQueue = [];
  intersectionCbs = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('devicePixelRatio', 1);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: function (this: HTMLCanvasElement, type: string) {
      if (!type.startsWith('webgl')) return null;
      const gl = new FakeGL();
      fakeGLs.push(gl);
      return gl;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function flushMicrotasks() {
  await act(async () => {});
}

describe('useShaderCanvas', () => {
  it('creates a rendering canvas when visible, destroys on hide', async () => {
    const { getByTestId, unmount } = render(<Host fragmentShader="void main(){}" />);
    const container = getByTestId('container');
    expect(container.querySelector('canvas')).toBeNull();

    act(() => flushRaf([16])); // observer 挂载
    act(() => triggerIntersection(true));
    await flushMicrotasks(); // 等待 useCanvasSlot promise 解析
    act(() => flushRaf([32, 48, 64])); // 渲染数帧

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(fakeGLs).toHaveLength(1);
    expect(fakeGLs[0]?.drawCallCount).toBeGreaterThan(0);
    expect(getByTestId('active').textContent).toBe('true');

    act(() => triggerIntersection(false));
    await flushMicrotasks();
    expect(container.querySelector('canvas')).toBeNull();
    expect(cardCanvasPool.activeCount).toBe(0);
    unmount();
  });

  it('reports compile errors via onCompileError', async () => {
    const errors: (string | null)[] = [];
    const { getByTestId, unmount } = render(
      <Host fragmentShader="bad source" onCompileError={(m) => errors.push(m)} />,
    );
    // 让所有 FakeGL 编译失败：patch prototype 的 getShaderParameter
    const orig = FakeGL.prototype.getShaderParameter;
    FakeGL.prototype.getShaderParameter = () => false;
    act(() => flushRaf([16]));
    act(() => triggerIntersection(true));
    await flushMicrotasks(); // 等待渲染器 effect 执行
    FakeGL.prototype.getShaderParameter = orig;

    expect(errors.at(-1)).toContain('ERROR: 0:4');
    expect(getByTestId('glError').textContent).toContain('ERROR: 0:4');
    unmount();
  });
});
