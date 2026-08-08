import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import MuseumNav from './MuseumNav';
import GallerySection from '../sections/GallerySection';
import { FocusRoom } from '../focus/FocusRoom';
import { getCategories } from '../../shader/registry';
import { isWebGLSupported } from '../../engine/support';
import type { ShaderDemo } from '../../shader/types';

export default function MainLayout() {
  const { t } = useTranslation();
  const categories = getCategories();
  const [webglOk] = useState(() => isWebGLSupported());
  const [focusedDemo, setFocusedDemo] = useState<ShaderDemo | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const closeFocusRoom = useCallback(() => setFocusedDemo(null), []);

  if (!webglOk) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
          {t('webgl.unsupported')}
        </p>
      </div>
    );
  }

  const focusedCategory = focusedDemo
    ? categories.find((cat) => cat.series.some((s) => s.demos.some((d) => d.id === focusedDemo.id)))
    : undefined;

  return (
    <motion.div
      style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <MuseumNav sentinelRef={sentinelRef} />
      <main>
        {/* 导航双形态哨兵：在视口内 = 首屏馆签 */}
        <div ref={sentinelRef} aria-hidden="true" />
        {categories.map((cat, index) => (
          <GallerySection
            key={cat.id}
            id={cat.id}
            title={cat.title}
            titleZh={cat.titleZh}
            description={cat.description}
            descriptionZh={cat.descriptionZh}
            series={cat.series}
            cardType={cat.cardType}
            alt={index % 2 === 1}
            onFocus={setFocusedDemo}
          />
        ))}
      </main>
      <footer className="py-8 text-center border-t" style={{ borderColor: 'var(--color-border)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Shader Portfolio &copy; {new Date().getFullYear()} &mdash; Built with WebGL &amp; React
        </p>
      </footer>
      <AnimatePresence>
        {focusedDemo && focusedCategory && (
          <FocusRoom
            demo={focusedDemo}
            kicker={t(`museum.hall.${focusedCategory.id}`)}
            variant={focusedCategory.cardType}
            onClose={closeFocusRoom}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
