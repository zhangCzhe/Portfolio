import { useEffect, useRef, useState } from 'react';
import { GLRenderer } from '../../engine/GLRenderer';
import { FrameLoop } from '../../engine/FrameLoop';
import { detectInitialTier, readDeviceEnvironment } from '../../engine/quality';

interface ShaderBackgroundProps {
  fragmentShader: string;
  className?: string;
}

export function ShaderBackground({ fragmentShader, className }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new GLRenderer(canvas, {
      initialTier: detectInitialTier(readDeviceEnvironment()),
    });
    if (!renderer.init()) {
      setError('WebGL not supported');
      return;
    }
    try {
      renderer.setFragmentShader(fragmentShader);
    } catch (e) {
      renderer.dispose();
      setError(e instanceof Error ? e.message : String(e));
      return;
    }

    const resize = () => {
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      renderer.resize();
    };
    window.addEventListener('resize', resize);
    resize();

    const loop = new FrameLoop((timeMs) => renderer.render(timeMs));
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) loop.start();
        else loop.stop();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);
    loop.start();

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
      loop.dispose();
      renderer.dispose();
    };
  }, [fragmentShader]);

  if (error) {
    return <div className="webgl-fallback fixed inset-0" style={{ zIndex: 0 }} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full ${className ?? ''}`}
      style={{ zIndex: 0 }}
    />
  );
}
