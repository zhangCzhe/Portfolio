import { useTranslation } from 'react-i18next';
import { ColorSwatch } from './ColorSwatch';
import type { ShaderParam, ShaderParamValue, ShaderPreset } from '../../shader/types';

interface ShaderControlsProps {
  params: ShaderParam[];
  presets: ShaderPreset[];
  values: Record<string, ShaderParamValue>;
  onParamChange: (name: string, value: ShaderParamValue) => void;
  onPresetSelect: (preset: ShaderPreset) => void;
  activePreset: string | null;
  lang: string;
  /** gallery = 画廊墙浅色（默认）；room = 展厅模式暗色 */
  variant?: 'gallery' | 'room';
}

export function ShaderControls({
  params,
  presets,
  values,
  onParamChange,
  onPresetSelect,
  activePreset,
  lang,
  variant = 'gallery',
}: ShaderControlsProps) {
  const { t } = useTranslation();

  const label = (item: { label: string; labelZh: string }) =>
    lang === 'zh' ? item.labelZh : item.label;
  const presetName = (p: ShaderPreset) => (lang === 'zh' ? p.nameZh : p.name);

  return (
    <div className={`shader-controls shader-controls--${variant}`}>
      {presets.length > 0 && (
        <div>
          <span className="shader-controls__heading">{t('common.presets')}</span>
          <div className="shader-controls__presets">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => onPresetSelect(preset)}
                className={`shader-controls__preset${activePreset === preset.name ? ' active' : ''}`}
              >
                {presetName(preset)}
              </button>
            ))}
          </div>
        </div>
      )}

      {params.length > 0 && (
        <div>
          <span className="shader-controls__heading">{t('common.params')}</span>
          <div className="shader-controls__sliders">
            {params.map((param) => {
              const isColor = param.type === 'color';
              const pName = param.name;
              const pValue =
                values[pName] ??
                (isColor ? (param.defaultColor ?? [0.5, 0.5, 0.5]) : (param.default ?? 0));
              return (
                <div key={pName} className="shader-controls__row">
                  <span className="shader-controls__name">{label(param)}</span>
                  {isColor ? (
                    <ColorSwatch
                      value={pValue as [number, number, number]}
                      onChange={(color) => onParamChange(pName, color)}
                      variant={variant}
                    />
                  ) : (
                    <>
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={pValue as number}
                        onChange={(e) => onParamChange(pName, parseFloat(e.target.value))}
                      />
                      <span className="shader-controls__value">
                        {(pValue as number).toFixed((param.step ?? 1) < 1 ? 1 : 0)}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
