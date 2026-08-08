export function isWebGLSupported(): boolean {
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}
