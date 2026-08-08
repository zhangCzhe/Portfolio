import { useCallback } from 'react';
import { useShaderCanvas } from '../../hooks/useShaderCanvas';
import type { UniformSchema } from '../../engine/types';

interface ShaderCanvasProps {
  fragmentShader: string;
  uniforms?: UniformSchema;
  className?: string;
  interactive?: boolean;
  onCompileError?: (error: string | null) => void;
}

export function ShaderCanvas({
  fragmentShader,
  uniforms,
  className = '',
  interactive = false,
  onCompileError,
}: ShaderCanvasProps) {
  const { containerRef, rendererRef, active, glError } = useShaderCanvas({
    fragmentShader,
    uniforms,
    interactive,
    canvasClassName: className,
    onCompileError,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      rendererRef.current?.setMouse(
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height,
      );
    },
    [interactive, rendererRef],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg"
      style={{ aspectRatio: '4 / 3' }}
      onMouseMove={handleMouseMove}
    >
      {(!active || glError) && (
        <div className="webgl-fallback rounded-lg" style={{ position: 'absolute', inset: 0 }} />
      )}
    </div>
  );
}
