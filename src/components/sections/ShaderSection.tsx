import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DemoCard } from '../shader/DemoCard';
import type { ShaderSeries, ShaderCategoryId, ShaderDemo } from '../../shader/types';

interface ShaderSectionProps {
  id: string;
  partKey: ShaderCategoryId;
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

/** Carousel row — converts vertical wheel to horizontal scroll */
function CarouselRow({ demos, variant }: { demos: ShaderDemo[]; variant: 'shader' | 'filter' }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Let native horizontal scroll pass through (trackpad swipe)
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={ref} className="carousel gap-4 sm:gap-6">
      {demos.map((demo) => (
        <div key={demo.id} className="carousel-item">
          <div className="w-[280px] sm:w-[340px] md:w-[400px]">
            <DemoCard
              demo={demo}
              variant={variant}
              width={variant === 'filter' ? 400 : 400}
              height={variant === 'filter' ? 300 : 280}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShaderSection({
  id,
  partKey,
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
      style={{ background: tone === 'light' ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)' }}
      className="py-16 md:py-24"
    >
      <div className="mx-auto px-5 md:px-8 max-w-[980px]">
        <div className="mb-12 md:mb-16">
          <div className="text-sm font-medium tracking-wider text-accent mb-2">
            {lang === 'zh' ? pn.zh : pn.en}
          </div>
          <h2 className="section-title">
            {lang === 'zh' ? (series[0]?.titleZh ?? '') : (series[0]?.title ?? '')}
          </h2>
          <p className="section-desc">
            {lang === 'zh' ? (series[0]?.descriptionZh ?? '') : (series[0]?.description ?? '')}
          </p>
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

            <CarouselRow demos={s.demos} variant={cardType} />
          </div>
        ))}
      </div>
    </section>
  );
}
