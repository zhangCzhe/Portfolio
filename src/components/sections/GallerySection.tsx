import { useTranslation } from 'react-i18next';
import { FramedArtwork } from '../shader/FramedArtwork';
import type { ShaderSeries, ShaderCategoryId, ShaderDemo } from '../../shader/types';

interface GallerySectionProps {
  id: ShaderCategoryId;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  series: ShaderSeries[];
  cardType?: 'shader' | 'filter';
  /** 相邻展厅交替底色：true → bg-secondary */
  alt?: boolean;
  onFocus: (demo: ShaderDemo) => void;
}

export default function GallerySection({
  id,
  title,
  titleZh,
  description,
  descriptionZh,
  series,
  cardType = 'shader',
  alt = false,
  onFocus,
}: GallerySectionProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // series 概念保留在数据层；墙内按 series 顺序平铺、平等陈列（spec §2）
  const demos = series.flatMap((s) => s.demos);

  return (
    <section id={id} className={`gallery-section${alt ? ' gallery-section--alt' : ''}`}>
      <div className="gallery-section__inner">
        <p className="gallery-kicker">{t(`museum.hall.${id}`)}</p>
        <h2 className="gallery-section__title">{lang === 'zh' ? titleZh : title}</h2>
        <p className="gallery-section__desc">{lang === 'zh' ? descriptionZh : description}</p>
        <div className="gallery-wall">
          {demos.map((demo) => (
            <FramedArtwork key={demo.id} demo={demo} variant={cardType} onFocus={onFocus} />
          ))}
        </div>
      </div>
    </section>
  );
}
