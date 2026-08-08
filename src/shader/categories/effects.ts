import { registerCategory } from '../registry';
import type { ShaderCategory } from '../types';

const effects: ShaderCategory = {
  id: 'effects',
  title: 'Interactive Effects',
  titleZh: '交互特效',
  description:
    'Real-time particle systems, fluid simulation, and organic cellular automata — all responding to your mouse.',
  descriptionZh: '实时粒子系统、流体模拟和有机元胞自动机——全部响应鼠标交互。',
  tone: 'dark',
  cardType: 'shader',
  series: [
    {
      id: 'particles',
      title: 'Particle Systems',
      titleZh: '粒子系统',
      description: 'Real-time particle simulations responding to mouse movement.',
      descriptionZh: '实时粒子模拟，响应鼠标移动。',
      demos: [
        {
          id: 'mouse-particles',
          title: 'Mouse-Attracted Particles',
          titleZh: '鼠标吸引粒子',
          description: 'Orbiting particles drawn toward the cursor with colorful trails.',
          descriptionZh: '环绕粒子被光标吸引，留下彩色拖尾。',
          source: 'effects/particles/01-mouse-particles.glsl',
          params: [
            {
              name: 'u_count',
              label: 'Count',
              labelZh: '数量',
              min: 0.2,
              max: 1.5,
              step: 0.1,
              default: 0.8,
            },
          ],
          presets: [
            { name: 'few', nameZh: '少量', values: { u_count: 0.3 } },
            { name: 'medium', nameZh: '中等', values: { u_count: 0.8 } },
            { name: 'many', nameZh: '大量', values: { u_count: 1.4 } },
          ],
          interactive: true,
        },
        {
          id: 'flow-field',
          title: 'Perlin Flow Field',
          titleZh: '柏林噪声流场',
          description: 'Particles tracing a Perlin-noise-driven vector field in real-time.',
          descriptionZh: '粒子沿柏林噪声驱动的矢量场实时运动。',
          source: 'effects/particles/02-flow-field.glsl',
          params: [
            {
              name: 'u_density',
              label: 'Density',
              labelZh: '密度',
              min: 0.2,
              max: 1.5,
              step: 0.1,
              default: 0.8,
            },
          ],
          presets: [
            { name: 'sparse', nameZh: '稀疏', values: { u_density: 0.3 } },
            { name: 'medium', nameZh: '中等', values: { u_density: 0.8 } },
            { name: 'dense', nameZh: '密集', values: { u_density: 1.4 } },
          ],
          interactive: true,
        },
      ],
    },
    {
      id: 'fluids',
      title: 'Fluid Simulation',
      titleZh: '流体模拟',
      description: 'Procedural ink diffusion and smoke-like effects.',
      descriptionZh: '程序化水墨扩散和烟雾效果。',
      demos: [
        {
          id: 'ink-diffusion',
          title: 'Ink Drop Diffusion',
          titleZh: '水墨扩散',
          description:
            'Concentric ink rings with noise perturbation simulating diffusion in water.',
          descriptionZh: '噪声扰动的同心墨水环，模拟水中扩散效果。',
          source: 'effects/fluids/01-ink-diffusion.glsl',
          params: [
            {
              name: 'u_viscosity',
              label: 'Viscosity',
              labelZh: '粘稠度',
              min: 0.2,
              max: 2.5,
              step: 0.1,
              default: 1.0,
            },
          ],
          presets: [
            { name: 'water', nameZh: '水', values: { u_viscosity: 2.0 } },
            { name: 'oil', nameZh: '油', values: { u_viscosity: 1.0 } },
            { name: 'honey', nameZh: '蜜', values: { u_viscosity: 0.4 } },
          ],
          interactive: true,
        },
      ],
    },
    {
      id: 'organic',
      title: 'Organic Life',
      titleZh: '有机生命',
      description: 'Cellular automata and growth patterns.',
      descriptionZh: '元胞自动机和生长模式。',
      demos: [
        {
          id: 'game-of-life',
          title: "Conway's Game of Life",
          titleZh: '康威生命游戏',
          description: 'Cellular automaton with Conway-like rules producing evolving patterns.',
          descriptionZh: '类康威规则的元胞自动机，产生不断演化的图案。',
          source: 'effects/organic/01-game-of-life.glsl',
          params: [
            {
              name: 'u_scale',
              label: 'Grid Scale',
              labelZh: '网格大小',
              min: 0.3,
              max: 2.0,
              step: 0.1,
              default: 1.0,
            },
          ],
          presets: [
            { name: 'fine', nameZh: '精细', values: { u_scale: 1.5 } },
            { name: 'coarse', nameZh: '粗糙', values: { u_scale: 0.6 } },
          ],
        },
      ],
    },
  ],
};

registerCategory(effects);
