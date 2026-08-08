import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShaderCanvas } from '../../hooks/useShaderCanvas';
import type { CanvasPool } from '../../engine/CanvasPool';
import type { UniformSchema } from '../../engine/types';

interface WebcamCaptureProps {
  fragmentShader: string;
  uniforms?: UniformSchema;
  className?: string;
  /** 展厅模式或特殊场景传入独立池；缺省走卡片池 */
  pool?: CanvasPool;
  /** 由父级负责重试：父级通过改变 key 整体重建本组件，
   *  使 useShaderCanvas 的 IntersectionObserver 重新绑定到新容器 */
  onRetry: () => void;
}

const ERROR_KEYS = [
  'denied',
  'unavailable',
  'start',
  'nogl',
  'lost',
  'insecure',
  'shader',
] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];

export function WebcamCapture({
  fragmentShader,
  uniforms,
  className = '',
  pool,
  onRetry,
}: WebcamCaptureProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<ErrorKey | null>(null);
  const [loading, setLoading] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shaderRef = useRef(fragmentShader);
  shaderRef.current = fragmentShader;

  const { containerRef, rendererRef, active, glError } = useShaderCanvas({
    fragmentShader,
    uniforms,
    canvasClassName: className,
    pool,
    onCompileError: (msg) => {
      if (msg) {
        setError('shader');
        setLoading(false);
      }
    },
  });

  // glError（WebGL 不可用 / context lost）映射到错误态
  useEffect(() => {
    if (glError === 'WebGL not supported') {
      setError('nogl');
      setLoading(false);
    }
  }, [glError]);

  // 摄像头生命周期：active 时开启，失活/卸载时停止
  useEffect(() => {
    if (!active) return;

    if (!navigator.mediaDevices) {
      setError('insecure');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const renderer = rendererRef.current;
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.addEventListener('loadeddata', () => setLoading(false), { once: true });
    videoRef.current = video;
    if (renderer) {
      // 重试时重新编译，避免 shader 错误后 retry 得到无 program 的空画布
      try {
        renderer.setFragmentShader(shaderRef.current);
      } catch {
        if (!cancelled) {
          setError('shader');
          setLoading(false);
          return;
        }
      }
      renderer.setVideoTexture(video);
      renderer.onContextChange('lost', () => {
        setError('lost');
        setLoading(false);
      });
    }

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.play().catch(() => {
          if (!cancelled) {
            setError('start');
            setLoading(false);
          }
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const name = err instanceof DOMException ? err.name : '';
          setError(name === 'NotAllowedError' ? 'denied' : 'unavailable');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderer?.setVideoTexture(null);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      video.pause();
      video.srcObject = null;
      videoRef.current = null;
    };
  }, [active, rendererRef]);

  if (error) {
    return (
      <div
        className="webgl-fallback rounded-lg w-full"
        style={{
          aspectRatio: '4 / 3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          fontSize: 14,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity={0.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.55-2.27A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.89L15 14m-2 0H5a2 2 0 01-2-2V8a2 2 0 012-2h8a2 2 0 012 2v4z"
          />
        </svg>
        <span>{t(`webcam.${error}`)}</span>
        {error !== 'lost' && (
          <button onClick={onRetry} className="btn" style={{ fontSize: 12, padding: '6px 16px' }}>
            {t('webcam.retry')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg"
      style={{ aspectRatio: '4 / 3' }}
    >
      {(!active || loading) && (
        <div
          className="skeleton"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {loading ? t('webcam.starting') : ''}
          </span>
        </div>
      )}
    </div>
  );
}
