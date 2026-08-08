import { useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup, waitFor, within } from '@testing-library/react';
import MuseumNav from '../../src/components/layout/MuseumNav';
import {
  installFakeIntersectionObserver,
  type FakeIntersectionObserverHandle,
} from '../helpers/fakeIntersectionObserver';

function Host() {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  return (
    <>
      <MuseumNav sentinelRef={sentinelRef} />
      <div ref={sentinelRef} data-testid="sentinel" />
    </>
  );
}

describe('MuseumNav', () => {
  let io: FakeIntersectionObserverHandle;

  beforeEach(() => {
    io = installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the minimal hall label while the sentinel is in view', () => {
    render(<Host />);
    expect(screen.getByTestId('museum-nav-minimal')).toBeTruthy();
    expect(screen.queryByTestId('museum-nav-fixed')).toBeNull();
    // jsdom navigator = en-US
    expect(screen.getByText('Shader Museum')).toBeTruthy();
  });

  it('docks into the fixed bar when the sentinel leaves the viewport', async () => {
    render(<Host />);
    act(() => {
      io.triggerAll(false);
    });
    expect(await screen.findByTestId('museum-nav-fixed')).toBeTruthy();
  });

  it('returns to the minimal form when the sentinel re-enters', async () => {
    render(<Host />);
    act(() => {
      io.triggerAll(false);
    });
    await screen.findByTestId('museum-nav-fixed');
    act(() => {
      io.triggerAll(true);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('museum-nav-fixed')).toBeNull();
    });
    expect(screen.getByTestId('museum-nav-minimal')).toBeTruthy();
  });

  it('lists the four gallery anchors in the fixed bar', async () => {
    render(<Host />);
    act(() => {
      io.triggerAll(false);
    });
    const bar = await screen.findByTestId('museum-nav-fixed');
    const links = within(bar).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '#basics',
      '#paintings',
      '#effects',
      '#filters',
    ]);
  });
});
