import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ShaderCodeEditor } from '../../src/components/shader/ShaderCodeEditor';
import { editorViewInstances } from '@codemirror/view';

vi.mock('@codemirror/view', () => {
  const editorViewInstances: EditorView[] = [];

  class EditorView {
    static updateListener = { of: () => ({}) };
    static theme = () => ({});
    state = { doc: { toString: () => this.doc } };
    doc = '';
    constructor(config: { doc?: string; parent?: HTMLElement }) {
      this.doc = config.doc ?? '';
      const dom = document.createElement('div');
      dom.className = 'cm-editor';
      config.parent?.appendChild(dom);
      editorViewInstances.push(this);
    }
    dispatch(config: { changes?: { insert?: string } }): void {
      if (config.changes) {
        this.doc = config.changes.insert ?? '';
      }
    }
    destroy(): void {}
  }

  return { EditorView, keymap: { of: () => ({}) }, editorViewInstances };
});

const CODE = 'void main() { gl_FragColor = vec4(1.0); }';

/** 稳定引用：避免每次 render 生成新函数导致 init effect 重建编辑器 */
const noop = () => {};

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
  afterEach(() => {
    cleanup();
    editorViewInstances.length = 0;
  });

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

  it('replaces the open editor doc when the code prop changes (reset sync)', async () => {
    const { container, rerender } = render(
      <ShaderCodeEditor code="a" onChange={noop} onReset={noop} error={null} alwaysOpen />,
    );
    await waitFor(() => {
      expect(container.querySelector('.cm-editor')).toBeTruthy();
    });
    expect(editorViewInstances).toHaveLength(1);
    expect(editorViewInstances[0]?.state.doc.toString()).toBe('a');

    rerender(<ShaderCodeEditor code="b" onChange={noop} onReset={noop} error={null} alwaysOpen />);

    // sync effect must dispatch a doc-replacing changes, not just re-render
    await waitFor(() => {
      expect(editorViewInstances[0]?.state.doc.toString()).toBe('b');
    });
  });
});
