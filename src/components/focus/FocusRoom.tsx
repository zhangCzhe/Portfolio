import { useState, useCallback, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useShaderCanvas } from '../../hooks/useShaderCanvas';
import { focusCanvasPool } from '../../hooks/useCanvasSlot';
import { CanvasErrorBoundary } from '../ui/CanvasErrorBoundary';
import { WebcamCapture } from '../ui/WebcamCapture';
import { ShaderControls } from '../shader/ShaderControls';
import { ShaderCodeEditor } from '../shader/ShaderCodeEditor';
import { useShaderSource } from '../../hooks/useShaderSource';
import type { ShaderDemo, ShaderPreset } from '../../shader/types';

interface FocusRoomProps {
  demo: ShaderDemo;
  /** 所属展厅名（调用方按当前语言解析好传入） */
  kicker: string;
  variant: 'shader' | 'filter';
  onClose: () => void;
}

interface FocusCanvasProps {
  source: string;
  values: Record<string, number>;
  interactive?: boolean;
  onCompileError: (msg: string | null) => void;
}

/** 展厅大画布：独立 GL context + 独立 pool，关闭即销毁 */
function FocusCanvas({ source, values, interactive = false, onCompileError }: FocusCanvasProps) {
  const { containerRef, rendererRef } = useShaderCanvas({
    fragmentShader: source,
    uniforms: values,
    canvasClassName: 'focus-room__glcanvas',
    pool: focusCanvasPool,
    onCompileError,
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
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
      data-testid="focus-room-canvas"
      className="focus-room__canvas"
      onMouseMove={handleMouseMove}
    />
  );
}

export function FocusRoom({ demo, kicker, variant, onClose }: FocusRoomProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const shouldReduceMotion = useReducedMotion();
  const originalSource = useShaderSource(demo.source);

  const initialValues: Record<string, number> = {};
  for (const p of demo.params) {
    initialValues[p.name] = p.default;
  }

  // 展厅内参数/代码状态完全独立：关闭即销毁，不回写卡片（spec §4）
  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [editedSource, setEditedSource] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const activeSource = editedSource ?? originalSource ?? '';

  // Esc 关闭 + 背景滚动锁定
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleParamChange = useCallback((name: string, value: number) => {
    setActivePreset(null);
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePresetSelect = useCallback((preset: ShaderPreset) => {
    setActivePreset(preset.name);
    setValues((prev) => ({ ...prev, ...preset.values }));
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    setEditedSource(newCode);
  }, []);

  const handleCodeReset = useCallback(() => {
    setEditedSource(null);
    setCompileError(null);
  }, []);

  const handleWebcamRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const title = lang === 'zh' ? demo.titleZh : demo.title;
  const description = lang === 'zh' ? demo.descriptionZh : demo.description;

  return (
    <motion.div
      className="focus-room"
      data-testid="focus-room"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="focus-room__body" onClick={(e) => e.stopPropagation()}>
        <div className="focus-room__stage">
          {originalSource ? (
            variant === 'filter' ? (
              <WebcamCapture
                key={retryKey}
                fragmentShader={activeSource}
                uniforms={values}
                className="focus-room__glcanvas"
                pool={focusCanvasPool}
                onRetry={handleWebcamRetry}
              />
            ) : (
              <CanvasErrorBoundary>
                <FocusCanvas
                  source={activeSource}
                  values={values}
                  interactive={demo.interactive}
                  onCompileError={setCompileError}
                />
              </CanvasErrorBoundary>
            )
          ) : (
            <div className="skeleton focus-room__canvas" />
          )}
        </div>

        <aside className="focus-room__rail">
          <p className="focus-room__kicker">{kicker}</p>
          <h2 className="focus-room__title">{title}</h2>
          <p className="focus-room__meta">{t('artwork.medium')} · 2026</p>
          <p className="focus-room__desc">{description}</p>
          <ShaderControls
            params={demo.params}
            presets={demo.presets}
            values={values}
            onParamChange={handleParamChange}
            onPresetSelect={handlePresetSelect}
            activePreset={activePreset}
            lang={lang}
            variant="room"
          />
          {originalSource && (
            <ShaderCodeEditor
              alwaysOpen
              code={activeSource}
              onChange={handleCodeChange}
              onReset={handleCodeReset}
              error={compileError}
            />
          )}
        </aside>
      </div>

      <button
        type="button"
        className="focus-room__close"
        aria-label={t('focus.close')}
        onClick={(e) => {
          // 阻止冒泡：root 的 onClick 也是 onClose，否则会触发两次
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </motion.div>
  );
}
