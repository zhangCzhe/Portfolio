import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

const SECTIONS = [
  { id: 'basics', key: 'basics' },
  { id: 'paintings', key: 'paintings' },
  { id: 'effects', key: 'effects' },
  { id: 'filters', key: 'filters' },
] as const;

export default function Navigation() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);

  // Close mobile menu on Escape / outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLang = useCallback(() => {
    i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh');
  }, [i18n]);

  const handleThemeToggle = useCallback(() => {
    document.documentElement.setAttribute('data-theme-switching', '');
    toggleTheme();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.removeAttribute('data-theme-switching');
      });
    });
  }, [toggleTheme]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <motion.nav
      ref={navRef}
      className="nav glass"
      initial={shouldReduceMotion ? false : { y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="flex items-center justify-between mx-auto px-5 md:px-8"
        style={{ maxWidth: 980, height: 'var(--nav-height)' }}
      >
        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5">
          {SECTIONS.map(({ id, key }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`nav-link ${activeSection === id ? 'active' : ''}`}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>{t(`nav.${key}`)}</span>
              {activeSection === id && !shouldReduceMotion && (
                <motion.div
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(10, 132, 255, 0.12)', borderRadius: 9999,
                  }}
                  layoutId="nav-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="btn-icon md:hidden"
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>

        {/* Right: language + theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={toggleLang} className="btn-icon" style={{ fontSize: 12, width: 'auto', padding: '0 10px' }}>
            {i18n.language.startsWith('zh') ? 'EN' : '中'}
          </button>
          <button onClick={handleThemeToggle} className="btn-icon" aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="glass md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex flex-col px-5 pb-4 pt-2 gap-1">
              {SECTIONS.map(({ id, key }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`nav-link block ${activeSection === id ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  {t(`nav.${key}`)}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
