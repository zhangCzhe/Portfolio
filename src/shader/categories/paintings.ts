import { registerCategory } from '../registry';
import type { ShaderCategory } from '../types';

const paintings: ShaderCategory = {
  id: 'paintings',
  title: 'Painting Recreations',
  titleZh: '名画重现',
  description:
    'Iconic masterpieces reinterpreted as procedural shaders — Impressionism, geometric abstraction, and modern art.',
  descriptionZh: '用程序化着色器重新诠释经典名画——印象派、几何抽象与现代艺术。',
  cardType: 'shader',
  series: [
    {
      id: 'impressionism',
      title: 'Impressionism',
      titleZh: '印象派系列',
      description:
        'Iconic Impressionist masterpieces with procedural brushstrokes and dynamic lighting.',
      descriptionZh: '用程序化笔触和动态光影重现印象派经典名作。',
      demos: [
        {
          id: 'starry-night',
          title: 'Starry Night — Van Gogh',
          titleZh: '星月夜 — 梵高',
          description:
            'Swirling night sky with turbulence fields, glowing stars, and cypress tree silhouette.',
          descriptionZh: '湍流场模拟的旋转星空、闪烁的星星和柏树剪影。',
          source: 'paintings/impressionism/01-starry-night.glsl',
          params: [
            {
              name: 'u_turbulence',
              label: 'Turbulence',
              labelZh: '湍流强度',
              min: 0.2,
              max: 3,
              step: 0.1,
              default: 1.5,
            },
          ],
          presets: [
            { name: 'calm', nameZh: '平静', values: { u_turbulence: 0.5 } },
            { name: 'normal', nameZh: '原版', values: { u_turbulence: 1.5 } },
            { name: 'storm', nameZh: '风暴', values: { u_turbulence: 2.8 } },
          ],
        },
        {
          id: 'water-lilies',
          title: 'Water Lilies — Monet',
          titleZh: '睡莲 — 莫奈',
          description:
            'Soft water surface with lily pads, rippling reflections, and floating flowers.',
          descriptionZh: '柔和的水面波纹、睡莲叶片和漂浮的花朵。',
          source: 'paintings/impressionism/02-water-lilies.glsl',
          params: [
            {
              name: 'u_ripple',
              label: 'Ripple',
              labelZh: '波纹强度',
              min: 0,
              max: 3,
              step: 0.1,
              default: 1.0,
            },
          ],
          presets: [
            { name: 'still', nameZh: '静止', values: { u_ripple: 0.2 } },
            { name: 'gentle', nameZh: '微风', values: { u_ripple: 1.0 } },
            { name: 'windy', nameZh: '有风', values: { u_ripple: 2.5 } },
          ],
        },
        {
          id: 'impression-sunrise',
          title: 'Impression, Sunrise — Monet',
          titleZh: '日出·印象 — 莫奈',
          description:
            'Hazy harbor at dawn with glowing sun disc, mist layers, and water reflections.',
          descriptionZh: '朦胧的晨雾港口、发光的太阳光晕和水面倒影。',
          source: 'paintings/impressionism/03-impression-sunrise.glsl',
          params: [
            {
              name: 'u_mist',
              label: 'Mist',
              labelZh: '雾气浓度',
              min: 0.3,
              max: 2.5,
              step: 0.1,
              default: 1.2,
            },
          ],
          presets: [
            { name: 'clear', nameZh: '清晰', values: { u_mist: 0.5 } },
            { name: 'hazy', nameZh: '朦胧', values: { u_mist: 1.2 } },
            { name: 'foggy', nameZh: '浓雾', values: { u_mist: 2.2 } },
          ],
        },
      ],
    },
    {
      id: 'geometric',
      title: 'Geometric Abstraction',
      titleZh: '几何抽象系列',
      description:
        'Precision geometry meets fine art through Mondrian grids and Kandinsky compositions.',
      descriptionZh: '蒙德里安网格与康定斯基的构图，精准几何遇见艺术。',
      demos: [
        {
          id: 'mondrian',
          title: 'Composition — Mondrian',
          titleZh: '红黄蓝构成 — 蒙德里安',
          description: 'Clean black grid lines dividing white space with primary color rectangles.',
          descriptionZh: '简洁的黑色网格线分隔白色空间和三原色矩形块。',
          source: 'paintings/geometric/01-mondrian.glsl',
          params: [],
          presets: [],
        },
        {
          id: 'kandinsky',
          title: 'Composition VIII — Kandinsky',
          titleZh: '构图 VIII — 康定斯基',
          description: 'Circles, lines, and abstract shapes arranged in dynamic composition.',
          descriptionZh: '圆形、线条和抽象形状在画布上动态排列。',
          source: 'paintings/geometric/02-kandinsky.glsl',
          params: [],
          presets: [],
        },
      ],
    },
    {
      id: 'modern',
      title: 'Modern & Ukiyo-e',
      titleZh: '浮世绘与现代系列',
      description:
        'The Great Wave, Rothko color fields, and Pollock drip painting - East meets West.',
      descriptionZh: '神奈川冲浪里、罗斯科色域与波洛克滴画——东西方艺术的 Shader 诠释。',
      demos: [
        {
          id: 'great-wave',
          title: 'The Great Wave — Hokusai',
          titleZh: '神奈川冲浪里 — 葛饰北斋',
          description: 'Iconic curling wave with foam tendrils and Mt. Fuji silhouette.',
          descriptionZh: '标志性的卷曲巨浪与泡沫触手，背景中是富士山剪影。',
          source: 'paintings/modern/01-great-wave.glsl',
          params: [
            {
              name: 'u_wave_height',
              label: 'Wave Height',
              labelZh: '浪高',
              min: 0.5,
              max: 2.5,
              step: 0.1,
              default: 1.5,
            },
          ],
          presets: [
            { name: 'gentle', nameZh: '小浪', values: { u_wave_height: 0.8 } },
            { name: 'classic', nameZh: '经典', values: { u_wave_height: 1.5 } },
            { name: 'tsunami', nameZh: '巨浪', values: { u_wave_height: 2.3 } },
          ],
        },
        {
          id: 'rothko',
          title: 'Color Fields — Rothko',
          titleZh: '色域画 — 罗斯科',
          description: 'Large soft-edged color rectangles evoking deep emotion through simplicity.',
          descriptionZh: '柔边大色块，以极简形式唤起深沉的情绪共鸣。',
          source: 'paintings/modern/02-rothko.glsl',
          params: [
            {
              name: 'u_shift',
              label: 'Shift',
              labelZh: '色块偏移',
              min: -0.15,
              max: 0.15,
              step: 0.005,
              default: 0.0,
            },
          ],
          presets: [
            { name: 'balanced', nameZh: '平衡', values: { u_shift: 0.0 } },
            { name: 'raised', nameZh: '上移', values: { u_shift: 0.08 } },
            { name: 'lowered', nameZh: '下移', values: { u_shift: -0.08 } },
          ],
        },
        {
          id: 'pollock',
          title: 'Drip Painting — Pollock',
          titleZh: '滴画 — 波洛克',
          description: 'Chaotic splatters and fluid drip trails in layered colors on raw canvas.',
          descriptionZh: '多层色彩的混乱飞溅和流体拖尾痕迹，模拟抽象表现主义。',
          source: 'paintings/modern/03-pollock.glsl',
          params: [
            {
              name: 'u_density',
              label: 'Density',
              labelZh: '密度',
              min: 0.3,
              max: 2.5,
              step: 0.1,
              default: 1.0,
            },
            {
              name: 'u_speed',
              label: 'Speed',
              labelZh: '演化速度',
              min: 0,
              max: 3,
              step: 0.1,
              default: 1.0,
            },
          ],
          presets: [
            { name: 'sparse', nameZh: '稀疏', values: { u_density: 0.5, u_speed: 0.5 } },
            { name: 'medium', nameZh: '中等', values: { u_density: 1.0, u_speed: 1.0 } },
            { name: 'dense', nameZh: '密集', values: { u_density: 2.0, u_speed: 2.0 } },
          ],
        },
      ],
    },
  ],
};

registerCategory(paintings);
