import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: {
        translation: {
          entry: {
            title: '着色器作品集',
            subtitle: '探索 Fragment Shader 的无限可能',
            enter: '进入探索',
            hint: '点击或滚动进入',
          },
          nav: {
            basics: 'Shader 基础',
            paintings: '名画复刻',
            effects: '交互动效',
            filters: '相机滤镜',
          },
          common: {
            viewCode: '查看代码',
            hideCode: '隐藏代码',
            presets: '预设',
            params: '参数调节',
          },
        },
      },
      en: {
        translation: {
          entry: {
            title: 'Shader Portfolio',
            subtitle: 'Exploring the Infinite Possibilities of Fragment Shaders',
            enter: 'Enter',
            hint: 'Click or scroll to enter',
          },
          nav: {
            basics: 'Shader Basics',
            paintings: 'Painting Recreations',
            effects: 'Interactive Effects',
            filters: 'Camera Filters',
          },
          common: {
            viewCode: 'View Code',
            hideCode: 'Hide Code',
            presets: 'Presets',
            params: 'Parameters',
          },
        },
      },
    },
    fallbackLng: 'zh',
    detection: {
      order: ['navigator', 'localStorage', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
