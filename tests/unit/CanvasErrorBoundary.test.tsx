import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasErrorBoundary } from '../../src/components/ui/CanvasErrorBoundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('CanvasErrorBoundary', () => {
  it('renders children when healthy', () => {
    render(
      <CanvasErrorBoundary>
        <div>fine</div>
      </CanvasErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeTruthy();
  });

  it('shows fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <CanvasErrorBoundary>
        <Bomb />
      </CanvasErrorBoundary>,
    );
    expect(document.querySelector('.webgl-fallback')).toBeTruthy();
    vi.restoreAllMocks();
  });
});
