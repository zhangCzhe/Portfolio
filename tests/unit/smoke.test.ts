import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs in jsdom with i18n initialized', () => {
    expect(document.createElement('div')).toBeInstanceOf(HTMLDivElement);
  });
});
