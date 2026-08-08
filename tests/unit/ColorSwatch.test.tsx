import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ColorSwatch } from '../../src/components/shader/ColorSwatch';

describe('ColorSwatch', () => {
  it('renders a color swatch with the given CSS color', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorSwatch value={[0.8, 0.3, 0.5]} onChange={onChange} variant="gallery" />,
    );
    const swatch = container.querySelector('.color-swatch__chip');
    expect(swatch).toBeTruthy();
    expect(swatch?.getAttribute('style')).toContain('rgb');
  });

  it('opens popover on click in gallery mode', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorSwatch value={[0.2, 0.5, 0.8]} onChange={onChange} variant="gallery" />,
    );
    const swatch = container.querySelector('.color-swatch__chip');
    expect(swatch).toBeTruthy();
    fireEvent.click(swatch as HTMLElement);
    expect(container.querySelector('.color-swatch__popover')).toBeTruthy();
  });

  it('calls onChange when color slider changes', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorSwatch value={[0.2, 0.5, 0.8]} onChange={onChange} variant="gallery" />,
    );
    const swatch = container.querySelector('.color-swatch__chip');
    expect(swatch).toBeTruthy();
    fireEvent.click(swatch as HTMLElement);
    const redSlider = container.querySelector('input[name="red"]');
    expect(redSlider).toBeTruthy();
    fireEvent.change(redSlider as HTMLInputElement, { target: { value: '0.9' } });
    expect(onChange).toHaveBeenCalledWith([0.9, 0.5, 0.8]);
  });
});
