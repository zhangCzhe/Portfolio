import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GallerySection from '../../src/components/sections/GallerySection';
import { installFakeIntersectionObserver } from '../helpers/fakeIntersectionObserver';
import type { ShaderDemo, ShaderSeries } from '../../src/shader/types';

function makeDemo(id: string, title: string): ShaderDemo {
  return {
    id,
    title,
    titleZh: `${title} 中文`,
    description: `${id} desc`,
    descriptionZh: `${id} 描述`,
    source: 'basics/colors/02-gradient-ring.glsl',
    params: [],
    presets: [],
  };
}

const demoA = makeDemo('a', 'Artwork A');
const demoB = makeDemo('b', 'Artwork B');
const demoC = makeDemo('c', 'Artwork C');

const series: ShaderSeries[] = [
  {
    id: 's1',
    title: 'Series One',
    titleZh: '系列一',
    description: '',
    descriptionZh: '',
    demos: [demoA, demoB],
  },
  {
    id: 's2',
    title: 'Series Two',
    titleZh: '系列二',
    description: '',
    descriptionZh: '',
    demos: [demoC],
  },
];

function renderSection(overrides: Partial<Parameters<typeof GallerySection>[0]> = {}) {
  return render(
    <GallerySection
      id="basics"
      title="Shader Basics"
      titleZh="Shader 基础"
      description="Building blocks."
      descriptionZh="构建基石。"
      series={series}
      onFocus={() => {}}
      {...overrides}
    />,
  );
}

describe('GallerySection', () => {
  beforeEach(() => {
    installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('flattens all series onto one wall without series headings', () => {
    const { container } = renderSection();
    expect(container.querySelectorAll('.framed-artwork')).toHaveLength(3);
    expect(screen.queryByText('Series One')).toBeNull();
    expect(screen.queryByText('Series Two')).toBeNull();
    expect(screen.queryByText('系列一')).toBeNull();
  });

  it('renders the brass hall kicker from museum.hall keys', () => {
    renderSection({ id: 'paintings' });
    expect(screen.getByText('Gallery II')).toBeTruthy();
  });

  it('renders localized section title and curatorial description', () => {
    renderSection();
    expect(screen.getByText('Shader Basics')).toBeTruthy();
    expect(screen.getByText('Building blocks.')).toBeTruthy();
  });

  it('applies the alternating background class when alt', () => {
    const { container } = renderSection({ alt: true });
    expect(container.querySelector('.gallery-section--alt')).toBeTruthy();
  });

  it('forwards focus events with the clicked demo', () => {
    const onFocus = vi.fn();
    renderSection({ onFocus });
    const canvases = screen.getAllByTestId('framed-canvas');
    const second = canvases[1];
    if (!second) throw new Error('expected at least 2 artworks on the wall');
    fireEvent.click(second);
    expect(onFocus).toHaveBeenCalledWith(demoB);
  });
});
