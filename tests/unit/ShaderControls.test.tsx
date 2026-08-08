import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ShaderControls } from '../../src/components/shader/ShaderControls';
import type { ShaderParam, ShaderParamValue, ShaderPreset } from '../../src/shader/types';

const params: ShaderParam[] = [
  { name: 'speed', label: 'Speed', labelZh: '速度', min: 0, max: 2, step: 0.1, default: 1 },
];
const presets: ShaderPreset[] = [{ name: 'calm', nameZh: '平静', values: { speed: 0.5 } }];

function renderControls(variant?: 'gallery' | 'room') {
  const onParamChange = vi.fn();
  const onPresetSelect = vi.fn();
  const utils = render(
    <ShaderControls
      params={params}
      presets={presets}
      values={{ speed: 1 }}
      onParamChange={onParamChange}
      onPresetSelect={onPresetSelect}
      activePreset={null}
      lang="en"
      {...(variant ? { variant } : {})}
    />,
  );
  return { onParamChange, onPresetSelect, ...utils };
}

describe('ShaderControls', () => {
  afterEach(cleanup);

  it('applies the gallery variant class by default', () => {
    const { container } = renderControls();
    expect(container.querySelector('.shader-controls--gallery')).toBeTruthy();
  });

  it('applies the room variant class for the focus room', () => {
    const { container } = renderControls('room');
    expect(container.querySelector('.shader-controls--room')).toBeTruthy();
  });

  it('calls onParamChange when a slider moves', () => {
    const { onParamChange } = renderControls();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1.5' } });
    expect(onParamChange).toHaveBeenCalledWith('speed', 1.5);
  });

  it('calls onPresetSelect when a preset is clicked', () => {
    const { onPresetSelect } = renderControls();
    fireEvent.click(screen.getByText('calm'));
    expect(onPresetSelect).toHaveBeenCalledWith(presets[0]);
  });

  it('renders ColorSwatch for color-type params', () => {
    const colorParams: ShaderParam[] = [
      {
        name: 'u_tint',
        label: 'Tint',
        labelZh: '色调',
        type: 'color',
        defaultColor: [0.8, 0.3, 0.5],
      },
    ];
    const values: Record<string, ShaderParamValue> = { u_tint: [0.8, 0.3, 0.5] };
    const onParamChange = vi.fn();
    const { container } = render(
      <ShaderControls
        params={colorParams}
        presets={[]}
        values={values}
        onParamChange={onParamChange}
        onPresetSelect={vi.fn()}
        activePreset={null}
        lang="en"
      />,
    );
    expect(container.querySelector('.color-swatch__chip')).toBeTruthy();
    // 颜色参数不渲染 float slider
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it('calls onParamChange with color array when color slider changes', () => {
    const colorParams: ShaderParam[] = [
      {
        name: 'u_tint',
        label: 'Tint',
        labelZh: '色调',
        type: 'color',
        defaultColor: [0.5, 0.5, 0.5],
      },
    ];
    const values: Record<string, ShaderParamValue> = { u_tint: [0.5, 0.5, 0.5] };
    const onParamChange = vi.fn();
    const { container } = render(
      <ShaderControls
        params={colorParams}
        presets={[]}
        values={values}
        onParamChange={onParamChange}
        onPresetSelect={vi.fn()}
        activePreset={null}
        lang="en"
      />,
    );
    const chip = container.querySelector('.color-swatch__chip') as HTMLElement;
    fireEvent.click(chip);
    const redSlider = container.querySelector('input[name="red"]') as HTMLInputElement;
    fireEvent.change(redSlider, { target: { value: '0.9' } });
    expect(onParamChange).toHaveBeenCalledWith('u_tint', [0.9, 0.5, 0.5]);
  });
});
