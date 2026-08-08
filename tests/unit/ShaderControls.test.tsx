import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ShaderControls } from '../../src/components/shader/ShaderControls';
import type { ShaderParam, ShaderPreset } from '../../src/shader/types';

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
});
