import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ShaderCodeEditor } from '../../src/components/shader/ShaderCodeEditor';

vi.mock('@codemirror/view', () => {
  class EditorView {
    static updateListener = { of: () => ({}) };
    static theme = () => ({});
    state = { doc: { toString: () => '' } };
    destroy(): void {}
    dispatch(): void {}
    constructor(config: { parent?: HTMLElement }) {
      const dom = document.createElement('div');
      dom.className = 'cm-editor';
      config.parent?.appendChild(dom);
    }
  }
  return { EditorView, keymap: { of: () => ({}) } };
});

const CODE = 'void main() { gl_FragColor = vec4(1.0); }';

function renderEditor(alwaysOpen?: boolean) {
  return render(
    <ShaderCodeEditor
      code={CODE}
      onChange={() => {}}
      onReset={() => {}}
      error={null}
      {...(alwaysOpen ? { alwaysOpen } : {})}
    />,
  );
}

describe('ShaderCodeEditor', () => {
  afterEach(cleanup);

  it('renders expanded without a toggle when alwaysOpen', async () => {
    const { container } = renderEditor(true);
    expect(screen.queryByText('View Code')).toBeNull();
    expect(screen.queryByText('Hide Code')).toBeNull();
    const shell = container.querySelector('.editor-shell');
    expect(shell).toBeTruthy();
    await waitFor(() => {
      expect(container.querySelector('.cm-editor')).toBeTruthy();
    });
  });

  it('stays collapsed behind a toggle by default', () => {
    const { container } = renderEditor();
    expect(screen.getByText('View Code')).toBeTruthy();
    expect(container.querySelector('.cm-editor')).toBeNull();
  });

  it('expands on toggle click in default mode', async () => {
    const { container } = renderEditor();
    fireEvent.click(screen.getByText('View Code'));
    await waitFor(() => {
      expect(container.querySelector('.cm-editor')).toBeTruthy();
    });
  });
});
