import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShaderBackground } from './components/shader/ShaderBackground';
import { isWebGLSupported } from './engine/support';
import nebulaLightShader from './shaders/background/nebula-light.glsl?raw';

interface EntryHallProps {
  onEnter: () => void;
}

export default function EntryHall({ onEnter }: EntryHallProps) {
  const { t } = useTranslation();
  const [webglOk, setWebglOk] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isWebGLSupported()) setWebglOk(false);
  }, []);

  // 点击 / 滚动 / 触摸 / 键盘进入
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 30) onEnter();
    };
    const onTouch = () => onEnter();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'Enter' || e.key === ' ')
        onEnter();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('keydown', onKey);
    };
  }, [onEnter]);

  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const animProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };
  const tr = shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease };

  return (
    <div className="entry-hall">
      {webglOk ? (
        <ShaderBackground fragmentShader={nebulaLightShader} />
      ) : (
        <div className="entry-hall__nogl-bg" />
      )}

      {/* 纸白渐变罩，保证文字可读性 */}
      <div className="entry-hall__veil" />

      <div className="entry-hall__content">
        <motion.p
          {...animProps}
          transition={{ ...tr, delay: shouldReduceMotion ? 0 : 0.1 }}
          className="entry-hall__kicker"
        >
          {t('entry.subtitle')}
        </motion.p>

        <motion.h1
          {...animProps}
          transition={{ ...tr, delay: shouldReduceMotion ? 0 : 0.2 }}
          className="entry-hall__title"
        >
          {t('museum.name')}
        </motion.h1>

        {!webglOk && <p className="entry-hall__nogl-note">{t('webgl.unsupported')}</p>}

        <motion.div
          className="entry-hall__hint"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <span className="entry-hall__hint-line" />
          <span>{t('entry.hint')}</span>
        </motion.div>

        <motion.button
          type="button"
          onClick={onEnter}
          className="entry-hall__enter"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
        >
          {t('entry.enter')}
        </motion.button>
      </div>
    </div>
  );
}
