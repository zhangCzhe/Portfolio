import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FramedArtwork } from '../../src/components/shader/FramedArtwork';
import { installFakeIntersectionObserver } from '../helpers/fakeIntersectionObserver';
import type { ShaderDemo } from '../../src/shader/types';

const demo: ShaderDemo = {
  id: 'hsb',
  title: 'HSB Spectrum',
  titleZh: 'HSB 色环',
  description: 'HSB color space demo',
  descriptionZh: 'HSB 色彩空间',
  source: 'basics/colors/01-hsb-spectrum.glsl',
  params: [
    { name: 'speed', label: 'Speed', labelZh: '速度', min: 0, max: 2, step: 0.1, default: 1 },
  ],
  presets: [],
};

describe('FramedArtwork', () => {
  beforeEach(() => {
    installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens the focus room when the canvas area is clicked', () => {
    const onFocus = vi.fn();
    render(<FramedArtwork demo={demo} variant="shader" onFocus={onFocus} />);
    fireEvent.click(screen.getByTestId('framed-canvas'));
    expect(onFocus).toHaveBeenCalledWith(demo);
  });

  it('opens the focus room via Enter / Space on the canvas area', () => {
    const onFocus = vi.fn();
    render(<FramedArtwork demo={demo} variant="shader" onFocus={onFocus} />);
    fireEvent.keyDown(screen.getByTestId('framed-canvas'), { key: 'Enter' });
    expect(onFocus).toHaveBeenCalledWith(demo);
  });

  it('does not open the focus room when interacting with sliders', () => {
    const onFocus = vi.fn();
    render(<FramedArtwork demo={demo} variant="shader" onFocus={onFocus} />);
    const slider = screen.getByRole('slider');
    fireEvent.click(slider);
    fireEvent.change(slider, { target: { value: '1.5' } });
    expect(onFocus).not.toHaveBeenCalled();
  });

  it('does not render a code editor toggle on the wall', () => {
    render(<FramedArtwork demo={demo} variant="shader" onFocus={() => {}} />);
    expect(screen.queryByText('View Code')).toBeNull();
    expect(screen.queryByText('查看代码')).toBeNull();
  });

  it('shows the museum label with localized title and medium line', () => {
    render(<FramedArtwork demo={demo} variant="shader" onFocus={() => {}} />);
    // jsdom navigator = en-US → 英文文案
    expect(screen.getByText('HSB Spectrum')).toBeTruthy();
    expect(screen.getByText('Fragment Shader · 2026')).toBeTruthy();
  });
});
