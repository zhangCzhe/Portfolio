import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WebGLRenderer } from '../../shader/WebGLRenderer';
import { useCanvasSlot } from '../../shader/CanvasPool';

interface WebcamCaptureProps {
  fragmentShader: string;
  uniforms?: Record<string, number>;
  className?: string;
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
  uniforms = {},
  className = '',
}: WebcamCaptureProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const fragRef = useRef(fragmentShader);
  fragRef.current = fragmentShader;
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;

  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceKey, setForceKey] = useState(0);
  const slotGranted = useCanvasSlot(visible);
  const active = visible && slotGranted;

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setForceKey((k) => k + 1);
  };

  // Delayed visibility observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const raf = requestAnimationFrame(() => {
      observerRef.current = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
        threshold: 0,
      });
      observerRef.current.observe(el);
    });

    return () => {
      cancelAnimationFrame(raf);
      observerRef.current?.disconnect();
    };
  }, []);

  // Renderer + camera lifecycle
  useEffect(() => {
    if (!active) {
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    if (!navigator.mediaDevices) {
      setError('insecure');
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Create canvas — CSS-sized, pixel size handled by renderer
    const canvas = document.createElement('canvas');
    canvas.className = `shader-canvas ${className}`;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const renderer = new WebGLRenderer({
      canvas,
      fragmentSource: fragRef.current,
      useTexture: true,
      onError: (msg) => {
        if (msg) {
          setError(msg.includes('compile') || msg.includes('link') ? 'shader' : 'lost');
          setLoading(false);
        }
      },
    });
    renderer.customValues = { ...uniformsRef.current };
    rendererRef.current = renderer;
    renderer.start();

    // Setup camera
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.addEventListener('loadeddata', () => setLoading(false), { once: true });
    videoRef.current = video;
    renderer.videoElement = video;

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
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
      .catch((err) => {
        if (!cancelled) {
          setError(err.name === 'NotAllowedError' ? 'denied' : 'unavailable');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderer.dispose();
      rendererRef.current = null;
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [active, forceKey, className]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync uniforms
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.customValues = { ...uniforms };
  }, [uniforms]);

  // Live-edit recompile
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setSource(fragmentShader);
  }, [fragmentShader]);

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
          <button
            onClick={handleRetry}
            className="btn"
            style={{ fontSize: 12, padding: '6px 16px' }}
          >
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
