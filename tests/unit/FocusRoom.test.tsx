import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FocusRoom } from '../../src/components/focus/FocusRoom';
import { installFakeIntersectionObserver } from '../helpers/fakeIntersectionObserver';
import type { ShaderDemo } from '../../src/shader/types';

vi.mock('../../src/components/shader/ShaderCodeEditor', () => ({
  ShaderCodeEditor: () => <div data-testid="code-editor-stub" />,
}));

const demo: ShaderDemo = {
  id: 'starry',
  title: 'Starry Vortex',
  titleZh: '星夜涡旋',
  description: 'A swirling night sky.',
  descriptionZh: '旋转的夜空。',
  source: 'basics/colors/01-hsb-spectrum.glsl',
  params: [
    { name: 'speed', label: 'Speed', labelZh: '速度', min: 0, max: 2, step: 0.1, default: 1 },
  ],
  presets: [],
};

function renderRoom(onClose: () => void = () => {}) {
  return render(<FocusRoom demo={demo} kicker="Gallery I" variant="shader" onClose={onClose} />);
}

describe('FocusRoom', () => {
  beforeEach(() => {
    installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = renderRoom();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the dark backdrop outside the body', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.click(screen.getByTestId('focus-room'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the rail content', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.click(screen.getByText('A swirling night sky.'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes via the × button with an accessible label', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows kicker, localized title, medium line and curatorial text', () => {
    renderRoom();
    // jsdom navigator = en-US
    expect(screen.getByText('Gallery I')).toBeTruthy();
    expect(screen.getByText('Starry Vortex')).toBeTruthy();
    expect(screen.getByText('Fragment Shader · 2026')).toBeTruthy();
    expect(screen.getByText('A swirling night sky.')).toBeTruthy();
  });

  it('renders room-variant controls and the always-open code editor', async () => {
    const { container } = renderRoom();
    expect(container.querySelector('.shader-controls--room')).toBeTruthy();
    expect(await screen.findByTestId('code-editor-stub')).toBeTruthy();
  });
});
