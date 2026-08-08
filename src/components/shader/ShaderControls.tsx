import { useTranslation } from 'react-i18next';
import type { ShaderParam, ShaderPreset } from '../../shader/types';

interface ShaderControlsProps {
  params: ShaderParam[];
  presets: ShaderPreset[];
  values: Record<string, number>;
  onParamChange: (name: string, value: number) => void;
  onPresetSelect: (preset: ShaderPreset) => void;
  activePreset: string | null;
  lang: string;
}

export function ShaderControls({
  params,
  presets,
  values,
  onParamChange,
  onPresetSelect,
  activePreset,
  lang,
}: ShaderControlsProps) {
  const { t } = useTranslation();

  const label = (item: { label: string; labelZh: string }) =>
    lang === 'zh' ? item.labelZh : item.label;
  const presetName = (p: ShaderPreset) => (lang === 'zh' ? p.nameZh : p.name);

  return (
    <div className="mt-3 space-y-3">
      {/* Presets */}
      {presets.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-widest text-text-secondary/60">
            {t('common.presets')}
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onPresetSelect(preset)}
                className={`px-2.5 py-0.5 text-[11px] rounded-full border transition-colors cursor-pointer
                  ${activePreset === preset.name
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border-subtle text-text-secondary hover:border-border-hover'
                  }`}
              >
                {presetName(preset)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sliders */}
      {params.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-widest text-text-secondary/60">
            {t('common.params')}
          </span>
          <div className="space-y-2 mt-1.5">
            {params.map((param) => (
              <div key={param.name} className="flex items-center gap-2">
                <span className="text-[10px] text-text-secondary w-14 shrink-0 text-right">
                  {label(param)}
                </span>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={values[param.name] ?? param.default}
                  onChange={(e) => onParamChange(param.name, parseFloat(e.target.value))}
                  className="flex-1 h-1 appearance-none bg-bg-quaternary rounded-full cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-accent"
                />
                <span className="text-[10px] text-text-secondary w-8 text-left tabular-nums">
                  {(values[param.name] ?? param.default).toFixed(param.step < 1 ? 1 : 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
