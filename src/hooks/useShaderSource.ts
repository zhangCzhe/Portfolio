import { useState, useEffect } from 'react';
import { loadSource, getSource } from '../shader/registry';

export function useShaderSource(sourcePath: string): string | null {
  const cached = getSource(sourcePath);
  const [source, setSource] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    loadSource(sourcePath).then((s) => {
      if (!cancelled) setSource(s);
    });
    return () => {
      cancelled = true;
    };
  }, [sourcePath]); // eslint-disable-line react-hooks/exhaustive-deps

  return source;
}
