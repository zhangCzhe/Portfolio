import { useState, useCallback } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ShaderCanvas } from './ShaderCanvas';
import { CanvasErrorBoundary } from '../ui/CanvasErrorBoundary';
import { WebcamCapture } from '../ui/WebcamCapture';
import { ShaderControls } from './ShaderControls';
import { useShaderSource } from '../../hooks/useShaderSource';
import type { ShaderDemo, ShaderPreset } from '../../shader/types';

interface FramedArtworkProps {
  demo: ShaderDemo;
  variant: 'shader' | 'filter';
  onFocus: (demo: ShaderDemo) => void;
}

export function FramedArtwork({ demo, variant, onFocus }: FramedArtworkProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const originalSource = useShaderSource(demo.source);

  const initialValues: Record<string, number> = {};
  for (const p of demo.params) {
    initialValues[p.name] = p.default;
  }

  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleParamChange = useCallback((name: string, value: number) => {
    setActivePreset(null);
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePresetSelect = useCallback((preset: ShaderPreset) => {
    setActivePreset(preset.name);
    setValues((prev) => ({ ...prev, ...preset.values }));
  }, []);

  // 重试时通过 key 整体重建 WebcamCapture，使 useShaderCanvas 的
  // IntersectionObserver 绑定到新容器元素
  const handleWebcamRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const handleFocus = useCallback(() => {
    onFocus(demo);
  }, [onFocus, demo]);

  // 画布区内命中嵌套交互元素（如 webcam 重试按钮）时不触发展厅
  const handleCanvasClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button, input, a')) return;
      handleFocus();
    },
    [handleFocus],
  );

  const handleCanvasKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFocus();
      }
    },
    [handleFocus],
  );

  const title = lang === 'zh' ? demo.titleZh : demo.title;

  return (
    <figure className="framed-artwork">
      <div className="framed-artwork__frame">
        <div
          className="framed-artwork__canvas"
          data-testid="framed-canvas"
          role="button"
          tabIndex={0}
          aria-label={title}
          onClick={handleCanvasClick}
          onKeyDown={handleCanvasKeyDown}
        >
          {originalSource ? (
            variant === 'filter' ? (
              <WebcamCapture
                key={retryKey}
                fragmentShader={originalSource}
                uniforms={values}
                className="w-full"
                onRetry={handleWebcamRetry}
              />
            ) : (
              <CanvasErrorBoundary>
                <ShaderCanvas
                  fragmentShader={originalSource}
                  uniforms={values}
                  interactive={demo.interactive}
                  className="w-full"
                />
              </CanvasErrorBoundary>
            )
          ) : (
            <div className="skeleton w-full" style={{ aspectRatio: '4 / 3' }} />
          )}
        </div>
      </div>
      <figcaption className="framed-artwork__label">
        <h3>{title}</h3>
        <p>{t('artwork.medium')} · 2026</p>
      </figcaption>
      <ShaderControls
        params={demo.params}
        presets={demo.presets}
        values={values}
        onParamChange={handleParamChange}
        onPresetSelect={handlePresetSelect}
        activePreset={activePreset}
        lang={lang}
      />
    </figure>
  );
}
