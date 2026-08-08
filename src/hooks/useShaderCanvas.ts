import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { GLRenderer } from '../engine/GLRenderer';
import { FrameLoop } from '../engine/FrameLoop';
import { PerformanceGovernor } from '../engine/PerformanceGovernor';
import { detectInitialTier, readDeviceEnvironment } from '../engine/quality';
import { ShaderCompileError } from '../engine/compile';
import type { UniformSchema } from '../engine/types';
import { useCanvasSlot } from './useCanvasSlot';

export interface UseShaderCanvasOptions {
  fragmentShader: string;
  uniforms?: UniformSchema;
  interactive?: boolean;
  canvasClassName?: string;
  onCompileError?: (message: string | null) => void;
}

export interface UseShaderCanvasResult {
  containerRef: RefObject<HTMLDivElement | null>;
  rendererRef: RefObject<GLRenderer | null>;
  active: boolean;
  glError: string | null;
}

function toErrorMessage(e: unknown): string {
  return e instanceof ShaderCompileError ? e.message : String(e);
}

export function useShaderCanvas({
  fragmentShader,
  uniforms,
  canvasClassName = '',
  onCompileError,
}: UseShaderCanvasOptions): UseShaderCanvasResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GLRenderer | null>(null);
  const [visible, setVisible] = useState(false);
  const [glError, setGlError] = useState<string | null>(null);
  const slotGranted = useCanvasSlot(visible);
  const active = visible && slotGranted;

  const fragmentRef = useRef(fragmentShader);
  fragmentRef.current = fragmentShader;
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;
  const errorCbRef = useRef(onCompileError);
  errorCbRef.current = onCompileError;

  // 可见性观察 —— 首帧 rAF 后再挂载，避免所有卡片在首绘前同时触发
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let observer: IntersectionObserver | null = null;
    const raf = requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setVisible(entry.isIntersecting);
        },
        { threshold: 0 },
      );
      observer.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  // 渲染器生命周期：active 时创建，失活/卸载时销毁
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = `shader-canvas ${canvasClassName}`;
    container.appendChild(canvas);

    const initialTier = detectInitialTier(readDeviceEnvironment());
    const renderer = new GLRenderer(canvas, { initialTier });
    if (!renderer.init()) {
      setGlError('WebGL not supported');
      canvas.remove();
      return;
    }
    rendererRef.current = renderer;

    try {
      renderer.setFragmentShader(fragmentRef.current);
      setGlError(null);
      errorCbRef.current?.(null);
    } catch (e) {
      const msg = toErrorMessage(e);
      setGlError(msg);
      errorCbRef.current?.(msg);
    }
    if (uniformsRef.current) renderer.setUniforms(uniformsRef.current);

    const governor = new PerformanceGovernor({
      initial: initialTier,
      onTierChange: (tier) => renderer.setQuality(tier),
    });
    const loop = new FrameLoop((timeMs, frameMs) => {
      governor.sample(frameMs);
      renderer.render(timeMs);
    });
    loop.start();

    return () => {
      loop.dispose();
      renderer.dispose();
      rendererRef.current = null;
      canvas.remove();
    };
  }, [active, canvasClassName]);

  // 热重编译（实时编辑）
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    try {
      renderer.setFragmentShader(fragmentShader);
      setGlError(null);
      errorCbRef.current?.(null);
    } catch (e) {
      const msg = toErrorMessage(e);
      setGlError(msg);
      errorCbRef.current?.(msg);
    }
  }, [fragmentShader]);

  // uniforms 同步
  useEffect(() => {
    if (uniforms) rendererRef.current?.setUniforms(uniforms);
  }, [uniforms]);

  return { containerRef, rendererRef, active, glError };
}
