import { Component } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function Fallback() {
  const { t } = useTranslation();
  return (
    <div
      className="webgl-fallback rounded-lg w-full flex items-center justify-center"
      style={{ aspectRatio: '4 / 3', padding: 24, fontSize: 14 }}
    >
      {t('canvas.unavailable')}
    </div>
  );
}

export class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('Canvas crashed:', error);
  }

  render() {
    return this.state.hasError ? <Fallback /> : this.props.children;
  }
}
