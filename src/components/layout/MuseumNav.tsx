import { useState, useEffect, useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const SECTIONS = [
  { id: 'basics', key: 'basics' },
  { id: 'paintings', key: 'paintings' },
  { id: 'effects', key: 'effects' },
  { id: 'filters', key: 'filters' },
] as const;

interface MuseumNavProps {
  /** main 顶部的哨兵元素：在视口内 = 首屏馆签形态；离视口 = 固定栏形态 */
  sentinelRef: RefObject<HTMLElement | null>;
}

export default function MuseumNav({ sentinelRef }: MuseumNavProps) {
  const { t, i18n } = useTranslation();
  const [docked, setDocked] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);

  // 双形态切换
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setDocked(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelRef]);

  // 移动菜单：Esc / 外部点击关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
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

  // 固定栏 active 态：滚动监听当前展厅
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

  const closeMenu = () => setMenuOpen(false);
  const langLabel = i18n.language.startsWith('zh') ? 'EN' : '中';

  return (
    <>
      {/* 首屏形态：极简馆签，随滚动画走 */}
      <div className="museum-nav-minimal" data-testid="museum-nav-minimal">
        <span className="museum-nav-minimal__brand">{t('museum.name')}</span>
        <button type="button" onClick={toggleLang} className="museum-nav__lang">
          {langLabel}
        </button>
      </div>

      {/* 滚动后形态：固定顶栏 */}
      <AnimatePresence>
        {docked && (
          <motion.nav
            ref={navRef}
            className="museum-nav-fixed"
            data-testid="museum-nav-fixed"
            initial={shouldReduceMotion ? false : { y: -60 }}
            animate={{ y: 0 }}
            exit={shouldReduceMotion ? undefined : { y: -60 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="museum-nav-fixed__inner">
              <div className="museum-nav-fixed__links">
                {SECTIONS.map(({ id, key }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`museum-nav-fixed__link${activeSection === id ? ' active' : ''}`}
                  >
                    {t(`nav.${key}`)}
                  </a>
                ))}
              </div>

              <div className="museum-nav-fixed__right">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="museum-nav__burger"
                  aria-label="Menu"
                >
                  {menuOpen ? '×' : '☰'}
                </button>
                <button type="button" onClick={toggleLang} className="museum-nav__lang">
                  {langLabel}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className="museum-nav-fixed__menu"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {SECTIONS.map(({ id, key }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className={`museum-nav-fixed__link${activeSection === id ? ' active' : ''}`}
                      onClick={closeMenu}
                    >
                      {t(`nav.${key}`)}
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
