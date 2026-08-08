import { registerCategory } from '../registry';
import type { ShaderCategory } from '../types';

const filters: ShaderCategory = {
  id: 'filters',
  title: 'Camera Filters',
  titleZh: '镜头滤镜',
  description:
    'Real-time webcam filters — from classic monochrome to edge detection, halftone, glitch, and kaleidoscope.',
  descriptionZh: '实时摄像头滤镜——从经典黑白到边缘检测、半色调、故障艺术和万花筒。',
  cardType: 'filter',
  series: [
    {
      id: 'classic',
      title: 'Classic Photo Filters',
      titleZh: '经典摄影滤镜',
      description: 'Grayscale, sepia, and color grading effects for your webcam feed.',
      descriptionZh: '黑白、老照片和色彩分级等实时摄像头效果。',
      demos: [
        {
          id: 'grayscale',
          title: 'Grayscale',
          titleZh: '黑白灰度',
          description:
            'Convert to grayscale with adjustable channel weights. Classic B&W photography.',
          descriptionZh: '可调通道权重的灰度转换，经典黑白摄影风格。',
          source: 'filters/classic/01-grayscale.glsl',
          params: [
            {
              name: 'u_red_weight',
              label: 'Red',
              labelZh: '红色权重',
              min: 0,
              max: 1,
              step: 0.01,
              default: 0.299,
            },
            {
              name: 'u_green_weight',
              label: 'Green',
              labelZh: '绿色权重',
              min: 0,
              max: 1,
              step: 0.01,
              default: 0.587,
            },
            {
              name: 'u_blue_weight',
              label: 'Blue',
              labelZh: '蓝色权重',
              min: 0,
              max: 1,
              step: 0.01,
              default: 0.114,
            },
          ],
          presets: [
            {
              name: 'luminance',
              nameZh: '亮度',
              values: { u_red_weight: 0.299, u_green_weight: 0.587, u_blue_weight: 0.114 },
            },
            {
              name: 'red-filter',
              nameZh: '红镜',
              values: { u_red_weight: 0.7, u_green_weight: 0.2, u_blue_weight: 0.1 },
            },
            {
              name: 'blue-filter',
              nameZh: '蓝镜',
              values: { u_red_weight: 0.1, u_green_weight: 0.2, u_blue_weight: 0.7 },
            },
          ],
        },
        {
          id: 'sepia',
          title: 'Sepia / Vintage',
          titleZh: '老照片 / 复古',
          description: 'Warm sepia tones with adjustable strength for that nostalgic feel.',
          descriptionZh: '可调强度的温暖棕褐色调，营造怀旧氛围。',
          source: 'filters/classic/02-sepia.glsl',
          params: [
            {
              name: 'u_strength',
              label: 'Strength',
              labelZh: '强度',
              min: 0,
              max: 1,
              step: 0.01,
              default: 0.7,
            },
          ],
          presets: [
            { name: 'subtle', nameZh: '淡雅', values: { u_strength: 0.25 } },
            { name: 'classic', nameZh: '经典', values: { u_strength: 0.7 } },
            { name: 'vintage', nameZh: '复古', values: { u_strength: 1.0 } },
          ],
        },
      ],
    },
    {
      id: 'artistic',
      title: 'Artistic Style',
      titleZh: '艺术风格化',
      description: 'Edge detection, halftone, and other artistic rendering techniques.',
      descriptionZh: '边缘检测、半色调网点等艺术渲染技法。',
      demos: [
        {
          id: 'edge-detect',
          title: 'Edge Detection (Sobel)',
          titleZh: '边缘检测 (Sobel)',
          description: 'Real-time Sobel edge detection turning your video into a line sketch.',
          descriptionZh: '实时 Sobel 边缘检测，将视频转为线条素描。',
          source: 'filters/artistic/01-edge-detect.glsl',
          params: [
            {
              name: 'u_threshold',
              label: 'Threshold',
              labelZh: '阈值',
              min: 0.05,
              max: 0.5,
              step: 0.005,
              default: 0.15,
            },
          ],
          presets: [
            { name: 'fine', nameZh: '细线', values: { u_threshold: 0.08 } },
            { name: 'normal', nameZh: '标准', values: { u_threshold: 0.15 } },
            { name: 'bold', nameZh: '粗线', values: { u_threshold: 0.3 } },
          ],
        },
        {
          id: 'halftone',
          title: 'Halftone / Comic',
          titleZh: '半色调 / 漫画网点',
          description: 'Simulated print halftoning with variable dot size.',
          descriptionZh: '模拟印刷半色调效果，网点大小可调。',
          source: 'filters/artistic/02-halftone.glsl',
          params: [
            {
              name: 'u_dot_size',
              label: 'Dot Size',
              labelZh: '网点大小',
              min: 0.5,
              max: 3.0,
              step: 0.1,
              default: 1.2,
            },
          ],
          presets: [
            { name: 'fine', nameZh: '细网', values: { u_dot_size: 0.7 } },
            { name: 'medium', nameZh: '中网', values: { u_dot_size: 1.2 } },
            { name: 'coarse', nameZh: '粗网', values: { u_dot_size: 2.5 } },
          ],
        },
      ],
    },
    {
      id: 'distortion',
      title: 'Distortion Effects',
      titleZh: '变形扭曲',
      description: 'Kaleidoscope mirrors and glitch art effects for creative video manipulation.',
      descriptionZh: '万花筒镜像和故障艺术效果，创意视频变形。',
      demos: [
        {
          id: 'kaleidoscope',
          title: 'Live Kaleidoscope',
          titleZh: '实时万花筒',
          description: 'Angular mirror folding of your webcam feed into symmetric patterns.',
          descriptionZh: '摄像头画面的角度镜像折叠，产生对称图案。',
          source: 'filters/distortion/01-kaleidoscope.glsl',
          params: [
            {
              name: 'u_slices',
              label: 'Slices',
              labelZh: '切片数',
              min: 2,
              max: 20,
              step: 1,
              default: 8,
            },
            {
              name: 'u_rotation',
              label: 'Rotation',
              labelZh: '旋转',
              min: 0,
              max: 6.28,
              step: 0.05,
              default: 0.0,
            },
          ],
          presets: [
            { name: 'quad', nameZh: '四瓣', values: { u_slices: 4, u_rotation: 0.0 } },
            { name: 'hex', nameZh: '六瓣', values: { u_slices: 6, u_rotation: 0.5 } },
            { name: 'mandala', nameZh: '曼陀罗', values: { u_slices: 12, u_rotation: 0.0 } },
          ],
        },
        {
          id: 'glitch',
          title: 'Glitch Art',
          titleZh: '故障艺术',
          description:
            'RGB split, scan lines, and random block displacement for cyberpunk aesthetics.',
          descriptionZh: 'RGB 分离、扫描线和随机块位移，赛博朋克美学。',
          source: 'filters/distortion/02-glitch.glsl',
          params: [
            {
              name: 'u_intensity',
              label: 'Intensity',
              labelZh: '强度',
              min: 0,
              max: 2,
              step: 0.05,
              default: 0.8,
            },
          ],
          presets: [
            { name: 'subtle', nameZh: '轻微', values: { u_intensity: 0.3 } },
            { name: 'medium', nameZh: '中等', values: { u_intensity: 0.8 } },
            { name: 'chaos', nameZh: '混乱', values: { u_intensity: 1.8 } },
          ],
        },
      ],
    },
  ],
};

registerCategory(filters);
