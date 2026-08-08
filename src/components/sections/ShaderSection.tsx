import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DemoCard } from '../shader/DemoCard';
import type { ShaderSeries, ShaderCategoryId, ShaderDemo } from '../../shader/types';

interface ShaderSectionProps {
  id: string;
  partKey: ShaderCategoryId;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  series: ShaderSeries[];
  cardType?: 'shader' | 'filter';
  tone?: 'dark' | 'light';
}

const PART_NUMS: Record<ShaderCategoryId, { zh: string; en: string }> = {
  basics: { zh: '第一部分', en: 'Part 1' },
  paintings: { zh: '第二部分', en: 'Part 2' },
  effects: { zh: '第三部分', en: 'Part 3' },
  filters: { zh: '第四部分', en: 'Part 4' },
};

/** Carousel row — wheel-to-horizontal, drag-to-scroll, edge fades + arrows */
function CarouselRow({
  demos,
  variant,
  tone,
}: {
  demos: ShaderDemo[];
  variant: 'shader' | 'filter';
  tone: 'dark' | 'light';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const dragState = useRef<{ startX: number; scrollLeft: number; dragging: boolean } | null>(null);

  const updateEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Let native horizontal scroll pass through (trackpad swipe)
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      // At edges, let the page keep scrolling vertically
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    // Drag to scroll (mouse)
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      dragState.current = { startX: e.clientX, scrollLeft: el.scrollLeft, dragging: true };
      el.style.cursor = 'grabbing';
      el.style.scrollSnapType = 'none';
    };
    const onPointerMove = (e: PointerEvent) => {
      const d = dragState.current;
      if (!d?.dragging) return;
      el.scrollLeft = d.scrollLeft - (e.clientX - d.startX);
    };
    const endDrag = () => {
      if (!dragState.current?.dragging) return;
      dragState.current.dragging = false;
      el.style.cursor = '';
      el.style.scrollSnapType = '';
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    el.addEventListener('scroll', updateEdges, { passive: true });
    updateEdges();

    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      el.removeEventListener('scroll', updateEdges);
      ro.disconnect();
    };
  }, [updateEdges]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.carousel-item');
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <div
      className="carousel-wrap"
      style={{
        ['--fade-color' as string]:
          tone === 'light' ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
      }}
    >
      <div ref={ref} className="carousel gap-4 sm:gap-6">
        {demos.map((demo) => (
          <div key={demo.id} className="carousel-item">
            <div className="w-[280px] sm:w-[340px] md:w-[400px]">
              <DemoCard demo={demo} variant={variant} />
            </div>
          </div>
        ))}
      </div>

      <div className={`carousel-fade left ${canLeft ? 'visible' : ''}`} />
      <div className={`carousel-fade right ${canRight ? 'visible' : ''}`} />

      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollByCards(-1)}
        className={`carousel-arrow left ${canLeft ? 'visible' : ''}`}
        style={{ pointerEvents: canLeft ? 'auto' : 'none' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollByCards(1)}
        className={`carousel-arrow right ${canRight ? 'visible' : ''}`}
        style={{ pointerEvents: canRight ? 'auto' : 'none' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default function ShaderSection({
  id,
  partKey,
  title,
  titleZh,
  description,
  descriptionZh,
  series,
  cardType = 'shader',
  tone = 'dark',
}: ShaderSectionProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const pn = PART_NUMS[partKey];

  return (
    <section
      id={id}
      style={{
        background: tone === 'light' ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
      }}
      className="py-16 md:py-24"
    >
      <div className="mx-auto px-5 md:px-8 max-w-[980px]">
        <div className="mb-12 md:mb-16">
          <div className="text-sm font-medium tracking-wider text-accent mb-2">
            {lang === 'zh' ? pn.zh : pn.en}
          </div>
          <h2 className="section-title">{lang === 'zh' ? titleZh : title}</h2>
          <p className="section-desc">{lang === 'zh' ? descriptionZh : description}</p>
        </div>

        {series.map((s) => (
          <div key={s.id} className="mb-16 last:mb-0">
            <div className="mb-6">
              <h3 className="text-[22px] md:text-[28px] font-normal leading-tight text-text-primary mb-2">
                {lang === 'zh' ? s.titleZh : s.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-text-secondary">
                {lang === 'zh' ? s.descriptionZh : s.description}
              </p>
            </div>

            <CarouselRow demos={s.demos} variant={cardType} tone={tone} />
          </div>
        ))}
      </div>
    </section>
  );
}
