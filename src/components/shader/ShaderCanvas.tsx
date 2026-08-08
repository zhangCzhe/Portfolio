import { useEffect, useRef, useCallback, useState } from 'react';
import { WebGLRenderer } from '../../shader/WebGLRenderer';
import { useCanvasSlot } from '../../shader/CanvasPool';

interface ShaderCanvasProps {
  fragmentShader: string;
  uniforms?: Record<string, number>;
  className?: string;
  interactive?: boolean;
  onCompileError?: (error: string | null) => void;
}

export function ShaderCanvas({
  fragmentShader,
  uniforms = {},
  className = '',
  interactive = false,
  onCompileError,
}: ShaderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fragRef = useRef(fragmentShader);
  fragRef.current = fragmentShader;
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const onCompileErrorRef = useRef(onCompileError);
  onCompileErrorRef.current = onCompileError;

  const [visible, setVisible] = useState(false);
  const [glError, setGlError] = useState<string | null>(null);
  const slotGranted = useCanvasSlot(visible);
  const active = visible && slotGranted;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    rendererRef.current.mouse = {
      x: (e.clientX - rect.left) / rect.width,
      y: 1.0 - (e.clientY - rect.top) / rect.height,
    };
  }, []);

  // Visibility observer — delay until after initial layout to avoid all cards
  // firing "visible" simultaneously before the first paint.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const raf = requestAnimationFrame(() => {
      observerRef.current = new IntersectionObserver(
        ([e]) => setVisible(e.isIntersecting),
        { threshold: 0 },
      );
      observerRef.current.observe(el);
    });

    return () => {
      cancelAnimationFrame(raf);
      observerRef.current?.disconnect();
    };
  }, []);

  // Renderer lifecycle — create/destroy canvas element on demand
  useEffect(() => {
    if (!active) {
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Create canvas only when needed — sized by CSS (100% of container),
    // actual pixel resolution is handled by WebGLRenderer's ResizeObserver + DPR.
    const canvas = document.createElement('canvas');
    canvas.className = `shader-canvas ${className}`;
    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove as unknown as EventListener);
    }
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const renderer = new WebGLRenderer({
      canvas,
      fragmentSource: fragRef.current,
      interactive: interactiveRef.current,
      onError: (msg) => {
        setGlError(msg);
        const cb = onCompileErrorRef.current;
        if (cb && msg && (msg.includes('compile') || msg.includes('link'))) {
          cb(msg);
        } else if (cb && !msg) {
          cb(null);
        }
      },
    });
    renderer.customValues = { ...uniformsRef.current };
    rendererRef.current = renderer;
    renderer.start();

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
    };
  }, [active, className, interactive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live-edit recompile
  useEffect(() => {
    if (!rendererRef.current) return;
    const result = rendererRef.current.setSource(fragmentShader);
    const cb = onCompileErrorRef.current;
    if (cb) {
      cb(result.ok ? null : result.error);
    }
  }, [fragmentShader]);

  // Sync uniforms
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.customValues = { ...uniforms };
  }, [uniforms]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '4 / 3' }}>
      {(!active || glError) && (
        <div
          className="webgl-fallback rounded-lg"
          style={{ position: 'absolute', inset: 0 }}
        />
      )}
    </div>
  );
}
