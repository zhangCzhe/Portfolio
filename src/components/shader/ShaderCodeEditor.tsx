import { useState, useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTranslation } from 'react-i18next';

import type { Extension } from '@codemirror/state';

let glslExtension: Extension | null = null;
async function loadGLSLExtension(): Promise<Extension> {
  if (glslExtension) return glslExtension;
  const [{ shader }, { StreamLanguage }] = await Promise.all([
    import('@codemirror/legacy-modes/mode/clike'),
    import('@codemirror/language'),
  ]);
  glslExtension = StreamLanguage.define(shader);
  return glslExtension;
}

interface ShaderCodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onReset: () => void;
  error: string | null;
}

export function ShaderCodeEditor({ code, onChange, onReset, error }: ShaderCodeEditorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { t } = useTranslation();
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<number>(0);
  const codeRef = useRef(code);
  codeRef.current = code;

  const handleChange = useCallback(
    (newVal: string) => {
      setDirty(newVal !== codeRef.current);
      clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => onChange(newVal), 250);
    },
    [onChange],
  );

  const handleReset = useCallback(() => {
    setDirty(false);
    onReset();
  }, [onReset]);

  // Initialize editor when opened
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const init = async () => {
      const ext = await loadGLSLExtension();
      if (cancelled) return;

      if (viewRef.current) viewRef.current.destroy();

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          handleChange(update.state.doc.toString());
        }
      });

      viewRef.current = new EditorView({
        doc: codeRef.current,
        extensions: [
          ext,
          oneDark,
          keymap.of([...defaultKeymap, indentWithTab]),
          updateListener,
          EditorView.theme({
            '&': { maxHeight: '320px' },
            '.cm-scroller': {
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '13px',
              lineHeight: 1.5,
            },
            '.cm-content': { padding: '16px' },
            '.cm-gutters': { display: 'none' },
          }),
        ],
        parent: el,
      });
    };

    init();

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [open, handleChange]);

  // Sync external code changes into editor (e.g. after reset)
  useEffect(() => {
    if (!open || !viewRef.current) return;
    const currentDoc = viewRef.current.state.doc.toString();
    if (currentDoc !== code) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
    }
  }, [code, open]);

  const toggleOpen = () => setOpen(!open);

  const handleCopy = useCallback(() => {
    if (!navigator.clipboard) return;
    const text = viewRef.current?.state.doc.toString() ?? code;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [code]);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleOpen}
          aria-expanded={open}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {open ? t('common.hideCode') : t('common.viewCode')}
        </button>
        {dirty && (
          <button
            onClick={handleReset}
            style={{
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 9999,
              cursor: 'pointer',
              padding: '2px 10px',
            }}
          >
            {t('editor.reset')}
          </button>
        )}
      </div>

      {/* Compile error banner — extracts first GLSL error line number */}
      {error &&
        open &&
        (() => {
          const lineMatch = /ERROR:\s*\d+:(\d+)/.exec(error);
          const lineNo =
            lineMatch && lineMatch[1] !== undefined ? parseInt(lineMatch[1], 10) : null;
          return (
            <div
              style={{
                marginTop: 8,
                padding: '10px 14px',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'rgba(239, 68, 68, 0.9)',
              }}
            >
              {lineNo !== null && (
                <span style={{ fontWeight: 600 }}>
                  {t('editor.errorAtLine', { line: lineNo })}:{' '}
                </span>
              )}
              {error}
            </div>
          );
        })()}

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.2s ease',
          marginTop: 8,
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleCopy}
              title={t('editor.copy')}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {copied ? (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>{' '}
                  {t('editor.copied')}
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>{' '}
                  {t('editor.copy')}
                </>
              )}
            </button>
            <div
              ref={containerRef}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
