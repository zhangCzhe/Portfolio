# Shader 内容升级 + 参数系统 — 设计规格

## 概述

子项目 3：在美术馆设计系统（子项目 2）基础上，升级全部 4 个展厅的 shader 内容质量、扩展参数系统支持颜色类型、重做出入口大厅背景 shader。

**目标：** 每个展厅 6-10 个展览级精品 demo，每个都有交互点和丰富参数，精品化而非数量堆积。

---

## §1 参数系统扩展

### 1.1 类型定义

```typescript
// src/shader/types.ts

interface ShaderParam {
  name: string; // uniform 名, e.g. 'u_speed', 'u_color'
  label: string; // 英文标签
  labelZh: string; // 中文标签
  type: 'float' | 'color'; // 默认 'float'（向后兼容）
  // float:
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  // color:
  defaultColor?: [number, number, number]; // RGB 0-1
}

interface ShaderPreset {
  name: string;
  nameZh: string;
  values: Record<string, number | [number, number, number]>;
}
```

向后兼容：现有不写 `type` 的 param 视为 `'float'`。

### 1.2 ShaderControls UI

- 新建 `ColorSwatch` 微组件（`src/components/shader/ColorSwatch.tsx`）：
  - **card 模式**：20×20 色块（`border-radius: var(--radius-sm)`），点击弹出 `popover` mini 色板（色相条 + 亮度条）
  - **room 模式**：完整取色器（色相环 + 饱和度/亮度平面），适配暗空间 `--color-room-*` token
- `ShaderControls` 新 prop：`onColorChange?: (name: string, color: [number, number, number]) => void`
- 根据 `param.type` 渲染滑杆或色块，两种 variant（gallery / room）格式一致

### 1.3 GLRenderer uniform 绑定

`applyCustomUniform` 扩展 vec3 分支：

```
if (Array.isArray(value) && value.length === 3) {
  gl.uniform3fv(location, value);
}
```

shader 中需用 `uniform vec3 u_xxx;` 声明颜色参数。

---

## §2 展厅内容重组

### 第一展厅 · Shader 基础（basics）

21 个 demo → 8 个精选，每子系列 1 个代表作：

| 保留           | 源路径                | 升级内容                                   |
| -------------- | --------------------- | ------------------------------------------ |
| gradient-ring  | basics/colors/02      | 补齐 speed + hue-shift 参数，≥3 预设       |
| mix-smoothstep | basics/colors/03      | 保持 transition + 新增 edge 颜色参数       |
| polar-flower   | basics/coordinates/01 | 补齐 petals + radius 参数                  |
| mandelbrot     | basics/fractals/01    | 补齐 zoom + iterations + color-theme       |
| julia          | basics/fractals/02    | 补齐 c-real + c-imag + zoom                |
| water-droplet  | basics/lighting/03    | 补齐 refraction + drop-size                |
| domain-warp    | basics/noise/03       | 补齐 warp-strength + scale + color1/color2 |
| hexagon-ring   | basics/shapes/03      | 补齐 ring-count + rotation-speed + color   |

**删除 13 个：** hsb-spectrum, gradient-ring sub-series 只留 1 个；rotation-mirror, scale-tiling, ifs-fractal, lit-sphere, metallic, value-noise, clouds, kaleidoscope(pattern), artful-tiles, moire, heart-sdf, sdf-basics。

所有保留 demo 补齐 ≥1 个参数 + ≥3 个预设。interactive 按需标记。

### 第二展厅 · 名画重现（paintings）

8 个现存 + 2 个新增 = 10 个。每幅画都有独特的"活起来"交互：

| 作品                      | 交互升级                              | 参数                                        |
| ------------------------- | ------------------------------------- | ------------------------------------------- |
| 星月夜                    | 鼠标划过产生流星拖尾 + 星星随光标呼吸 | turbulence + star-brightness + color-shift  |
| 睡莲                      | 点击水面产生涟漪扩散 + 莲花漂移       | ripple + splash-radius + petal-color        |
| 日出印象                  | 鼠标控制太阳升降，光照角度实时变化    | mist + sun-angle + glow-color               |
| 红黄蓝构成                | **零→有参数**：三原色块随时间游走     | wander-speed + block-size + color1/2/3      |
| 构图 VIII                 | **零→有参数**：图形随鼠标旋转/缩放    | rotation + shape-count + accent-color       |
| 神奈川冲浪里              | 鼠标划动掀起巨浪，泡沫跟随光标        | wave-height + foam-density + curl-sharpness |
| 罗斯科色域                | 色块随鼠标呼吸膨胀收缩                | shift + breathe-size + mood-color           |
| 波洛克滴画                | 点击画布泼溅新颜料，拖出滴淌轨迹      | density + speed + splash-color              |
| **新增：达利·记忆的永恒** | 软钟随鼠标"融化变形"                  | melt-amount + clock-color + horizon-color   |
| **新增：克里姆特·吻**     | 金箔碎片随鼠标聚集闪烁                | sparkle-density + gold-hue + fragment-size  |

全部 ≥3 个预设。除 mondrian 外都 interactive。

### 第三展厅 · 交互特效（effects）

4 个深度重做 + 2 个新增 = 6 个。展览级视觉：

| 作品               | 重做后效果                            | 参数                                                        |
| ------------------ | ------------------------------------- | ----------------------------------------------------------- |
| 鼠标吸引粒子       | 多彩粒子群+引力/斥力双模式，星云漩涡  | particle-count + attract-repel + color-theme + trail-length |
| 柏林噪声流场       | 上万条流线，暖→冷渐变，极光/洋流感    | density + noise-scale + flow-speed + color-theme            |
| 水墨扩散           | 多色墨滴+边缘晕染+纸张纹理            | viscosity + ink-color + drop-spread + paper-texture         |
| 生命游戏           | 多物种+彩色细胞+生态演化              | grid-scale + evolution-speed + species-colors               |
| **新增：反应扩散** | Gray-Scott 模型，珊瑚/斑马纹/豹纹     | feed-rate + kill-rate + diffusion-speed                     |
| **新增：分形火焰** | 多层分形噪声火焰，内外焰渐变+热浪扭曲 | flame-height + turbulence + smoke-amount + wind             |

全部 `interactive: true`。

### 第四展厅 · 镜头滤镜（filters）

6 个重写为"能用出片"水平：

| 滤镜     | 升级后                                | 参数                                                       |
| -------- | ------------------------------------- | ---------------------------------------------------------- |
| 黑白     | 物理滤镜模拟+胶片颗粒+暗角+对比度曲线 | red-weight + green-weight + blue-weight + grain + vignette |
| 老照片   | sepia+胶片划痕+漏光+边缘褪色          | strength + grain + vignette + scratch-amount               |
| 边缘检测 | 铅笔素描/钢笔墨水/霓虹管/粉笔         | threshold + line-color + bg-alpha + style                  |
| 半色调   | CMYK 四色套印+网点形状切换+丝印感     | dot-size + angle + dot-shape + paper-color                 |
| 万花筒   | 对称数+边缘柔化+色彩增强+镜像模式     | slices + rotation + saturation + mirror-mode               |
| 故障艺术 | RGB位移+扫描线+像素排序+moshing       | intensity + scanline-amount + hue-shift + glitch-density   |

cardType: 'filter'，全部使用 `uniform sampler2D u_texture;` + WebcamCapture。

---

## §3 nebula-light 重做

占位 `src/shaders/background/nebula-light.glsl` → 全新"**晨光大理石**"shader：

- 多层 FBM 叠加产生流动大理石纹理（vein-like patterns）
- 色板：象牙白底 + 暖灰/淡金脉络（配博物馆纸色 `--color-bg-primary: #f7f4ee`）
- 极缓慢漂移，不喧宾夺主
- 保留现有 nebula 的结构约定（`uniform float u_time; uniform vec2 u_resolution;` 等），直接替换源文件，EntryHall 无需改动

---

## §4 实现任务拆分

| #   | 任务                                   | 范围                                           |
| --- | -------------------------------------- | ---------------------------------------------- |
| 1   | 参数系统类型扩展                       | types.ts, GLRenderer uniform binding           |
| 2   | ColorSwatch 组件 + ShaderControls 集成 | ColorSwatch.tsx, ShaderControls.tsx, index.css |
| 3   | basics 展厅重组                        | categories/basics.ts, 8 个 shader 补参数       |
| 4   | paintings 展厅升级（现有 8 个）        | categories/paintings.ts, 升级 shader 交互逻辑  |
| 5   | paintings 新增 2 个                    | 达利软钟 + 克里姆特金箔 shader 创作            |
| 6   | effects 深度重做（4 个）               | categories/effects.ts, 重写 shader             |
| 7   | effects 新增 2 个                      | 反应扩散 + 分形火焰 shader 创作                |
| 8   | filters 重写（6 个）                   | categories/filters.ts, 重写 shader             |
| 9   | nebula-light 重做                      | 晨光大理石 shader                              |
| 10  | 测试                                   | 参数系统单测, ColorSwatch UI 测试, e2e 扩展    |
| 11  | 全门链收口                             | lint/tsc/test/e2e/check:shaders/build          |

---

## §5 约束

- `npm run check:shaders` 全量通过
- 零 `!` non-null assertion，零 eslint-disable
- 现有 museum 组件（FramedArtwork, GallerySection, FocusRoom, MuseumNav, EntryHall）不改动结构，只消费升级后的 shader 和参数
- 向后兼容：不写 `type` 的现有 param 保持 float 行为
- GLSL 一律 `#ifdef GL_ES / precision mediump float; / #else / precision highp float; / #endif` 开头
