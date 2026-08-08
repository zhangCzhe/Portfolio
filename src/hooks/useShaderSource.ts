import { useState, useEffect } from 'react';
import { loadSource, getSource } from '../shader/registry';

export function useShaderSource(sourcePath: string): string | null {
  const [source, setSource] = useState<string | null>(() => getSource(sourcePath) ?? null);

  useEffect(() => {
    const cached = getSource(sourcePath);
    if (cached !== undefined) {
      setSource(cached);
      return;
    }
    let cancelled = false;
    void loadSource(sourcePath).then((s) => {
      if (!cancelled) setSource(s);
    });
    return () => {
      cancelled = true;
    };
  }, [sourcePath]);

  return source;
}
