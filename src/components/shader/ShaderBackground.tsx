import { useEffect, useRef, useState } from 'react';
import { WebGLRenderer } from '../../shader/WebGLRenderer';

interface ShaderBackgroundProps {
  fragmentShader: string;
  className?: string;
}

export function ShaderBackground({ fragmentShader, className }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLRenderer({
      canvas,
      fragmentSource: fragmentShader,
      onError: (msg) => setError(msg),
    });
    rendererRef.current = renderer;

    // Fullscreen sizing
    const resize = () => {
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      rendererRef.current?.resize();
    };
    window.addEventListener('resize', resize);

    // Pause when off-screen
    observerRef.current = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          rendererRef.current?.start();
        } else {
          rendererRef.current?.stop();
        }
      },
      { threshold: 0 },
    );
    observerRef.current.observe(canvas);

    resize();
    renderer.start();

    return () => {
      window.removeEventListener('resize', resize);
      observerRef.current?.disconnect();
      renderer.dispose();
      rendererRef.current = null;
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
