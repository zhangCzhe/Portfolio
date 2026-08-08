import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Navigation from './Navigation';
import ShaderSection from '../sections/ShaderSection';
import { getCategories } from '../../shader/registry';
import { isWebGLSupported } from '../../engine/support';

export default function MainLayout() {
  const { t } = useTranslation();
  const categories = getCategories();
  const [webglOk] = useState(() => isWebGLSupported());

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

  return (
    <motion.div
      style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Navigation />
      <main style={{ paddingTop: 'var(--nav-height)' }}>
        {categories.map((cat) => (
          <ShaderSection
            key={cat.id}
            id={cat.id}
            partKey={cat.id}
            title={cat.title}
            titleZh={cat.titleZh}
            description={cat.description}
            descriptionZh={cat.descriptionZh}
            series={cat.series}
            cardType={cat.cardType}
            tone={cat.tone}
          />
        ))}
      </main>
      <footer className="py-8 text-center border-t" style={{ borderColor: 'var(--color-border)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Shader Portfolio &copy; {new Date().getFullYear()} &mdash; Built with WebGL &amp; React
        </p>
      </footer>
    </motion.div>
  );
}
