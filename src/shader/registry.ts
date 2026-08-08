import type { ShaderCategory } from './types';

// Lazy-load all shader sources — Vite code-splits each .glsl into its own chunk
const shaderModules = import.meta.glob<string>('../shaders/**/*.glsl', {
  query: '?raw',
  import: 'default',
});

const sourceCache = new Map<string, string>();

export async function loadSource(path: string): Promise<string> {
  const cached = sourceCache.get(path);
  if (cached !== undefined) return cached;

  const key = `../shaders/${path}`;
  const loader = shaderModules[key];
  if (!loader) throw new Error(`Shader not found: ${path}`);

  const source = await loader();
  sourceCache.set(path, source);
  return source;
}

/** Synchronous get — only returns if already loaded */
export function getSource(path: string): string | undefined {
  return sourceCache.get(path);
}

const categories: ShaderCategory[] = [];

export function registerCategory(cat: ShaderCategory): void {
  categories.push(cat);
}

export function getCategories(): ShaderCategory[] {
  return categories;
}

export function getCategory(id: string): ShaderCategory | undefined {
  return categories.find((c) => c.id === id);
}
