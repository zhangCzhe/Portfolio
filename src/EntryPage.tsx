import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShaderBackground } from './components/shader/ShaderBackground';
import nebulaShader from './shaders/background/nebula.glsl?raw';

interface EntryPageProps {
  onEnter: () => void;
}

export default function EntryPage({ onEnter }: EntryPageProps) {
  const { t } = useTranslation();
  const [webglOk, setWebglOk] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) setWebglOk(false);
  }, []);

  // Scroll/touch/keyboard to enter
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
    <div className="entry-page">
      {webglOk ? (
        <ShaderBackground fragmentShader={nebulaShader} />
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            background: '#000',
          }}
        />
      )}

      {/* Subtle top gradient for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Content — bottom-left aligned, Apple style */}
      <div className="entry-content">
        <motion.h1
          {...animProps}
          transition={{ ...tr, delay: shouldReduceMotion ? 0 : 0.15 }}
          className="entry-title"
        >
          {t('entry.title')}
        </motion.h1>

        <motion.p
          {...animProps}
          transition={{ ...tr, delay: shouldReduceMotion ? 0 : 0.25 }}
          className="entry-subtitle"
        >
          {t('entry.subtitle')}
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          className="entry-scroll-hint"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <div className="entry-scroll-line" />
          <span>{t('entry.hint')}</span>
        </motion.div>

        {/* Click to enter button */}
        <motion.button
          onClick={onEnter}
          style={{
            marginTop: 32,
            padding: '12px 32px',
            fontSize: 15,
            fontWeight: 500,
            color: '#fff',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 9999,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
          }}
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          whileHover={shouldReduceMotion ? {} : { background: 'rgba(255,255,255,0.2)' }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
        >
          {t('entry.enter')}
        </motion.button>
      </div>
    </div>
  );
}
