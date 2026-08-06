import { motion } from 'framer-motion';
import Navigation from './Navigation';
import ShaderSection from '../sections/ShaderSection';
import { getCategories } from '../../shader/registry';

export default function MainLayout() {
  const categories = getCategories();

  return (
    <motion.div
      style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Navigation />
      <main style={{ paddingTop: 52 }}>
        {categories.map((cat) => (
          <ShaderSection
            key={cat.id}
            id={cat.id}
            partKey={cat.id}
            series={cat.series}
            cardType={cat.cardType}
            tone={cat.tone}
          />
        ))}
      </main>
      <footer className="py-8 text-center border-t" style={{ borderColor: 'var(--color-border)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Shader Portfolio &copy; {new Date().getFullYear()} &mdash; Built with WebGL2 &amp; React
        </p>
      </footer>
    </motion.div>
  );
}
