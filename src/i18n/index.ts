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
          museum: {
            name: 'Shader 美术馆',
            hall: {
              basics: '第一展厅',
              paintings: '第二展厅',
              effects: '第三展厅',
              filters: '第四展厅',
            },
          },
          artwork: {
            medium: 'Fragment Shader',
          },
          focus: {
            close: '关闭',
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
            loading: '加载中…',
          },
          editor: {
            reset: '重置',
            copy: '复制',
            copied: '已复制',
            errorAtLine: '第 {{line}} 行',
          },
          canvas: {
            unavailable: '此作品暂时无法展出',
          },
          webgl: {
            unsupported:
              '您的浏览器不支持 WebGL，无法展示这些作品。请使用最新版 Chrome / Edge / Safari 访问。',
          },
          webcam: {
            denied: '摄像头权限被拒绝',
            unavailable: '摄像头不可用',
            start: '摄像头启动失败',
            nogl: '不支持 WebGL',
            lost: 'WebGL 上下文丢失',
            insecure: '摄像头需要 HTTPS 环境',
            shader: '着色器编译失败',
            starting: '正在启动摄像头…',
            retry: '重试',
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
          museum: {
            name: 'Shader Museum',
            hall: {
              basics: 'Gallery I',
              paintings: 'Gallery II',
              effects: 'Gallery III',
              filters: 'Gallery IV',
            },
          },
          artwork: {
            medium: 'Fragment Shader',
          },
          focus: {
            close: 'Close',
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
            loading: 'Loading…',
          },
          editor: {
            reset: 'Reset',
            copy: 'Copy',
            copied: 'Copied',
            errorAtLine: 'Line {{line}}',
          },
          canvas: {
            unavailable: 'This artwork is temporarily unavailable',
          },
          webgl: {
            unsupported:
              'Your browser does not support WebGL. Please visit with the latest Chrome, Edge or Safari.',
          },
          webcam: {
            denied: 'Camera permission denied',
            unavailable: 'Camera not available',
            start: 'Camera failed to start',
            nogl: 'WebGL not supported',
            lost: 'WebGL context lost',
            insecure: 'Camera requires HTTPS',
            shader: 'Shader compilation failed',
            starting: 'Starting camera…',
            retry: 'Retry',
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
