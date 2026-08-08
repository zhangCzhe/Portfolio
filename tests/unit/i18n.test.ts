import { describe, it, expect } from 'vitest';
import i18n from '../../src/i18n';

describe('museum i18n keys', () => {
  it('provides museum name in zh and en', () => {
    expect(i18n.getFixedT('zh')('museum.name')).toBe('Shader 美术馆');
    expect(i18n.getFixedT('en')('museum.name')).toBe('Shader Museum');
  });

  it('provides hall kickers for all four galleries', () => {
    const zh = i18n.getFixedT('zh');
    const en = i18n.getFixedT('en');
    expect(zh('museum.hall.basics')).toBe('第一展厅');
    expect(zh('museum.hall.paintings')).toBe('第二展厅');
    expect(zh('museum.hall.effects')).toBe('第三展厅');
    expect(zh('museum.hall.filters')).toBe('第四展厅');
    expect(en('museum.hall.basics')).toBe('Gallery I');
    expect(en('museum.hall.paintings')).toBe('Gallery II');
    expect(en('museum.hall.effects')).toBe('Gallery III');
    expect(en('museum.hall.filters')).toBe('Gallery IV');
  });

  it('provides artwork medium and focus room close label', () => {
    expect(i18n.getFixedT('zh')('artwork.medium')).toBe('Fragment Shader');
    expect(i18n.getFixedT('en')('artwork.medium')).toBe('Fragment Shader');
    expect(i18n.getFixedT('zh')('focus.close')).toBe('关闭');
    expect(i18n.getFixedT('en')('focus.close')).toBe('Close');
  });
});
