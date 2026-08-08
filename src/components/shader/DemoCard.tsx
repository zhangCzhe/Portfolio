import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ShaderCanvas } from './ShaderCanvas';
import { WebcamCapture } from '../ui/WebcamCapture';
import { ShaderCodeEditor } from './ShaderCodeEditor';
import { ShaderControls } from './ShaderControls';
import { useShaderSource } from '../../hooks/useShaderSource';
import type { ShaderDemo, ShaderPreset } from '../../shader/types';

interface DemoCardProps {
  demo: ShaderDemo;
  variant: 'shader' | 'filter';
}

export function DemoCard({ demo, variant }: DemoCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const originalSource = useShaderSource(demo.source);

  const initialValues: Record<string, number> = {};
  for (const p of demo.params) {
    initialValues[p.name] = p.default;
  }

  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [editedSource, setEditedSource] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  const activeSource = editedSource ?? originalSource ?? '';

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

  const title = lang === 'zh' ? demo.titleZh : demo.title;
  const description = lang === 'zh' ? demo.descriptionZh : demo.description;

  return (
    <div className="card">
      {originalSource ? (
        variant === 'filter' ? (
          <WebcamCapture fragmentShader={activeSource} uniforms={values} className="w-full" />
        ) : (
          <ShaderCanvas
            fragmentShader={activeSource}
            uniforms={values}
            interactive={demo.interactive}
            className="w-full"
            onCompileError={setCompileError}
          />
        )
      ) : (
        <div
          className="skeleton rounded-t-lg w-full flex items-center justify-center"
          style={{ aspectRatio: '4 / 3' }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {t('common.loading')}
          </span>
        </div>
      )}
      <div className="p-4 sm:p-5">
        <h3 className="text-sm font-medium tracking-wide">{title}</h3>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{description}</p>
        <ShaderControls
          params={demo.params}
          presets={demo.presets}
          values={values}
          onParamChange={handleParamChange}
          onPresetSelect={handlePresetSelect}
          activePreset={activePreset}
          lang={lang}
        />
        {originalSource && (
          <ShaderCodeEditor
            code={originalSource}
            onChange={handleCodeChange}
            onReset={handleCodeReset}
            error={compileError}
          />
        )}
      </div>
    </div>
  );
}
