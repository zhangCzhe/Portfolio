# 子项目 2：美术馆设计系统 + 站点重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 shader-portfolio 从 Apple 暗色体系重构为"明亮美术馆"——浅色唯一主题、装裱卡片网格墙、双形态导航、展厅模式 overlay。

**Architecture:** Token 先行分层构建：先换设计 token 与字体（`src/index.css` + `index.html`），再逐组件新建（FramedArtwork / GallerySection / MuseumNav / EntryHall / FocusRoom），最后在 MainLayout/App 接线并删除旧组件（DemoCard / ShaderSection / Navigation / EntryPage / useTheme）。整个过程仓库保持编译与测试绿。

**Tech Stack:** React 19 + TypeScript (strict, noUncheckedIndexedAccess, erasableSyntaxOnly) + Vite 8 + Tailwind v4 (@theme) + framer-motion + i18next + CodeMirror 6 + Vitest (jsdom) + Playwright (SwiftShader)。

**Spec:** `docs/superpowers/specs/2026-08-08-museum-design-system-design.md`（已批准）

## Global Constraints

- 设计 token 精确值（spec §1，逐字）：
  - `--color-bg-primary: #f7f4ee` / `--color-bg-secondary: #efeadf` / `--color-mat: #ffffff`
  - `--color-text-primary: #221f18` / `--color-text-secondary: #6b6353` / `--color-text-tertiary: #a39a86`
  - `--color-accent: #8a6d3b` / `--color-frame: #3d332a` / `--color-border: #ddd5c5`
  - `--color-room-bg: #101014` / `--color-room-text: rgba(255, 255, 255, 0.92)` / `--color-room-accent: #e8b4c8`
- 字体栈（spec §1，逐字）：
  - 标题：`'Playfair Display', 'Noto Serif SC', 'Songti SC', 'SimSun', Georgia, serif`
  - 正文：`'EB Garamond', 'Songti SC', 'SimSun', Georgia, serif`
  - 代码：沿用现有 `--font-mono`
  - 加载：Google Fonts `<link>`（Playfair Display + EB Garamond + Noto Serif SC），失败回退系统衬线，不阻塞渲染
- 画廊墙网格：桌面 3 列（≥1024px）/ 平板 2 列（≥640px）/ 手机 1 列；相邻展厅 `bg-primary` / `bg-secondary` 交替
- 展厅模式：桌面左画布 58% + 右栏 27% 单栏滚动；移动端上下堆叠（画布 50vh 在上）；背景 `rgba(16, 16, 20, 0.97)`；打开时 body `overflow: hidden`；关闭 = × / Esc / 点画布外暗区；参数**不回写**卡片
- i18n 新 key（spec §5，逐字）：`museum.name` = "Shader 美术馆"/"Shader Museum"；`museum.hall.*` = 第一~四展厅 / Gallery I~IV；`artwork.medium` = "Fragment Shader"；`focus.close` = 关闭/"Close"。现有 `nav.*`、`common.*`、`editor.*`、`webcam.*`、`canvas.*`、`webgl.*` 全部保留
- 保留机制（spec §1）：`--ease-enter/move/press`、`prefers-reduced-motion` 降级、`:focus-visible`、骨架屏 shimmer、WebGL fallback、scrollbar（换色保留）
- 删除（spec §1/§2）：`.light` 覆盖块、`useTheme`、主题切换按钮、`.glass`、CarouselRow 全部逻辑、series 分组标题渲染、卡片上的"查看代码"按钮
- 零 `!` 非空断言、零 eslint-disable（全仓库含测试，延续子项目 1 基线）
- `tsconfig.app.json`：strict + noUncheckedIndexedAccess + erasableSyntaxOnly（仅 include `src`；测试文件不受 tsc 约束但仍遵守零 `!` 政策）
- Vite `base: '/Portfolio/'` 不可变；Playwright baseURL `http://localhost:4173`
- 每任务门（按序全绿才提交）：`npm run format && npm run lint && npx tsc -b && npm test`；e2e 自 Task 12 起加入 `npm run test:e2e`
- 提交信息格式（沿用 git log 风格）：`type: english subject`，type ∈ feat/fix/refactor/style/docs/test/ci/chore
- 组件导出约定（沿用现状）：layout/sections/页面级组件用 default export；shader/ui/工具组件用 named export
- 语言判定约定（沿用现状）：组件内 `i18n.language.startsWith('zh') ? 'zh' : 'en'`
- jsdom 测试环境语言为英文（navigator = en-US），断言英文文案

## 文件结构总览

| 文件 | 责任 | 任务 |
|------|------|------|
| `src/index.css` | 设计 token + 全部组件 CSS（逐任务追加） | 1, 3-9, 11 |
| `index.html` | Google Fonts link + title | 1 |
| `src/i18n/index.ts` | museum/artwork/focus 新 key | 2, 11 |
| `tests/helpers/fakeIntersectionObserver.ts` | jsdom IntersectionObserver 假实现（共享） | 3 |
| `src/components/shader/FramedArtwork.tsx` | 装裱卡片（替换 DemoCard） | 3 |
| `src/components/sections/GallerySection.tsx` | 展厅标题区 + 网格画廊墙（替换 ShaderSection） | 4 |
| `src/components/layout/MuseumNav.tsx` | 双形态导航（替换 Navigation） | 5 |
| `src/EntryHall.tsx` + `src/shaders/background/nebula-light.glsl` | 浅色入口大厅（替换 EntryPage） | 6 |
| `src/components/shader/ShaderControls.tsx` | 加 `variant: 'gallery' \| 'room'` | 7 |
| `src/components/shader/ShaderCodeEditor.tsx` | 加 `alwaysOpen` prop | 8 |
| `src/hooks/useCanvasSlot.ts` / `useShaderCanvas.ts` | `focusCanvasPool` + `pool` 选项 | 9 |
| `src/components/focus/FocusRoom.tsx` | 展厅模式 overlay | 9 |
| `src/components/layout/MainLayout.tsx` / `src/App.tsx` | 接线 + focusedDemo 状态 | 10 |
| 删除：DemoCard / ShaderSection / Navigation / EntryPage / useTheme | 旧体系 | 10, 11 |
| `src/shader/types.ts` + 4 个 category 文件 | 删 `tone` 字段 | 11 |
| `tests/e2e/smoke.spec.ts` | 展厅流程 e2e | 12 |

---

### Task 1: 设计 token + 全局基础 CSS + 字体引入

Token 先行。重写 `src/index.css`：新 @theme、新 base/typography、换色的保留机制（scrollbar/skeleton/fallback/slider）、museum 风 `.btn`；旧组件 CSS 块原样保留在文件尾部 `Legacy` 区（Task 11 删除），保证过渡期内旧组件仍有样式。`index.html` 加 Google Fonts。

**Files:**
- Modify: `src/index.css`（整体重写）
- Modify: `index.html`

**Interfaces:**
- Consumes: 无（首个任务）
- Produces: 全部后续任务依赖的 token——`--color-bg-primary/secondary/mat`、`--color-text-primary/secondary/tertiary`、`--color-accent/frame/border`、`--color-room-bg/text/accent`、`--font-display/body/mono`、`--nav-height`、`--radius-*`、`--ease-*`；CSS 类 `.btn`、`.skeleton`、`.webgl-fallback`、`.shader-canvas`；全局 `input[type='range']` 美术馆滑杆基底

- [ ] **Step 1: 验证旧排版工具类无引用（可安全删除）**

Run:
```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && grep -rn "text-hero\|text-section\|text-chapter\|text-title\b\|text-body\|text-caption\|text-label\|btn-primary\|btn-ghost\|card-interactive" src/ --include="*.tsx" --include="*.ts" || echo "SAFE: no references"
```
Expected: 仅输出 SAFE（这些类只在 CSS 里定义，无 TSX 引用；`.text-title` 注意与 Tailwind 工具类区分，用 `\b` 边界）。若有引用，保留对应类到 Legacy 区。

- [ ] **Step 2: 重写 `src/index.css`**

完整替换为以下内容（Legacy 区为旧组件过渡样式，Task 11 删除）：

```css
@import 'tailwindcss';

/* ================================================================
   美术馆设计系统 — 浅色唯一主题（全站唯一暗空间 = 展厅模式）
   ================================================================ */

@theme {
  /* 纸白基调 */
  --color-bg-primary: #f7f4ee;
  --color-bg-secondary: #efeadf;
  --color-mat: #ffffff;

  /* 墨色文字 */
  --color-text-primary: #221f18;
  --color-text-secondary: #6b6353;
  --color-text-tertiary: #a39a86;

  /* 点缀 */
  --color-accent: #8a6d3b;
  --color-frame: #3d332a;
  --color-border: #ddd5c5;

  /* 展厅模式 */
  --color-room-bg: #101014;
  --color-room-text: rgba(255, 255, 255, 0.92);
  --color-room-accent: #e8b4c8;

  /* 交互表面 */
  --color-hover: rgba(34, 31, 24, 0.05);
  --color-hover-strong: rgba(34, 31, 24, 0.09);
  --color-scrollbar: rgba(34, 31, 24, 0.18);
  --color-scrollbar-hover: rgba(34, 31, 24, 0.32);

  /* Typography */
  --font-display:
    'Playfair Display', 'Noto Serif SC', 'Songti SC', 'SimSun', Georgia, serif;
  --font-body: 'EB Garamond', 'Songti SC', 'SimSun', Georgia, serif;
  --font-mono: 'SF Mono', 'Cascadia Code', 'Consolas', 'Source Code Pro', monospace;

  /* Layout */
  --nav-height: 52px;

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
}

/* ================================================================
   Base
   ================================================================ */

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.7;
  font-weight: 400;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
}

code,
pre,
.mono {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: 0.01em;
}

section[id] {
  scroll-margin-top: var(--nav-height);
}

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 2px;
}

/* ================================================================
   Shader Canvas
   ================================================================ */

.shader-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ================================================================
   Button — 美术馆黄铜描边
   ================================================================ */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-accent);
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.btn:hover {
  background: var(--color-accent);
  color: #ffffff;
}

/* ================================================================
   Scrollbar
   ================================================================ */

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-scrollbar);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-scrollbar-hover);
}

/* ================================================================
   Slider — 美术馆基底（黄铜 thumb、纸色细轨道）
   ================================================================ */

input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: var(--color-border);
  border-radius: 2px;
  outline: none;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  border: none;
  cursor: pointer;
  transition: transform 0.12s ease;
}

input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

input[type='range']::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-accent);
  border: none;
  cursor: pointer;
}

/* ================================================================
   WebGL Fallback（纸白）
   ================================================================ */

.webgl-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ================================================================
   Skeleton loading（纸面 shimmer）
   ================================================================ */

.skeleton {
  background: linear-gradient(
    100deg,
    var(--color-bg-secondary) 40%,
    var(--color-mat) 50%,
    var(--color-bg-secondary) 60%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 120% 0;
  }
  100% {
    background-position: -80% 0;
  }
}

/* ================================================================
   Easing curves
   ================================================================ */

:root {
  --ease-enter: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-move: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-press: cubic-bezier(0.22, 1, 0.36, 1);
}

/* ================================================================
   prefers-reduced-motion 全局降级
   ================================================================ */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  html {
    scroll-behavior: auto;
  }
}

/* ================================================================
   Legacy — 旧组件过渡样式（Task 11 整块删除）
   注意：引用了已删除 token 的声明会静默失效（仅外观，不影响功能）
   ================================================================ */

.glass {
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  background: var(--color-glass-bg);
  border-bottom: 1px solid var(--color-border);
}

.card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    border-color 0.15s ease;
}

.card:hover {
  border-color: var(--color-border);
  transform: translateY(-2px);
}

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  z-index: 50;
}

.nav-link {
  position: relative;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  transition:
    color 0.15s ease,
    background 0.15s ease;
  text-decoration: none;
}

.nav-link:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.nav-link.active {
  color: var(--color-accent);
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.btn-icon:hover {
  background: var(--color-hover-strong);
  color: var(--color-text-primary);
}

.section-title {
  font-size: clamp(28px, 5vw, 40px);
  font-weight: 300;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin-bottom: 12px;
}

.section-desc {
  font-size: clamp(15px, 2vw, 18px);
  line-height: 1.5;
  color: var(--color-text-secondary);
  max-width: 560px;
}

.entry-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.entry-content {
  position: absolute;
  bottom: 15%;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 0 48px;
}

.entry-title {
  font-size: clamp(48px, 8vw, 96px);
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #ffffff;
  max-width: 800px;
  margin-bottom: 16px;
}

.entry-subtitle {
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 48px;
}

.entry-scroll-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.38);
  font-size: 13px;
  font-weight: 400;
}

.entry-scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.35), transparent);
}

.carousel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 16px;
  cursor: grab;
}

.carousel:active {
  cursor: grabbing;
}

.carousel::-webkit-scrollbar {
  height: 8px;
}
.carousel::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}
.carousel::-webkit-scrollbar-thumb {
  background: var(--color-scrollbar);
  border-radius: 4px;
}
.carousel::-webkit-scrollbar-thumb:hover {
  background: var(--color-scrollbar-hover);
}

.carousel {
  scrollbar-width: thin;
  scrollbar-color: var(--color-scrollbar) transparent;
}

.carousel-item {
  flex-shrink: 0;
  scroll-snap-align: start;
}

@media (max-width: 768px) {
  .carousel {
    gap: 12px;
    padding-bottom: 12px;
  }
}

.carousel-wrap {
  position: relative;
}

.carousel-fade {
  position: absolute;
  top: 0;
  bottom: 24px;
  width: 48px;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.carousel-fade.visible {
  opacity: 1;
}
.carousel-fade.left {
  left: 0;
  background: linear-gradient(to right, var(--fade-color, var(--color-bg-primary)), transparent);
}
.carousel-fade.right {
  right: 0;
  background: linear-gradient(to left, var(--fade-color, var(--color-bg-primary)), transparent);
}

.carousel-arrow {
  position: absolute;
  top: calc(50% - 12px);
  transform: translateY(-50%);
  z-index: 3;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-mat);
  color: var(--color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    transform 0.12s ease;
}

.carousel-wrap:hover .carousel-arrow.visible {
  opacity: 1;
}
.carousel-arrow:active {
  transform: translateY(-50%) scale(0.92);
}
.carousel-arrow.left {
  left: 8px;
}
.carousel-arrow.right {
  right: 8px;
}

@media (hover: none) {
  .carousel-arrow {
    display: none;
  }
}

[data-theme-switching] * {
  transition: none !important;
}
```

- [ ] **Step 3: `index.html` 加 Google Fonts + 更新 title**

完整替换 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Noto+Serif+SC:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <title>Shader 美术馆 | Shader Museum</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 门 — 全绿后提交**

Run:
```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run format && npm run lint && npx tsc -b && npm test
```
Expected: 全绿（旧组件仍在，只是外观变为过渡态——token 换色生效，玻璃拟态等失效属预期）

- [ ] **Step 5: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/index.css index.html && git commit -m "feat: museum design tokens + serif typography foundation"
```

---

### Task 2: i18n museum 新 key

**Files:**
- Modify: `src/i18n/index.ts`
- Test: `tests/unit/i18n.test.ts`（新建）

**Interfaces:**
- Consumes: 无
- Produces: `museum.name`、`museum.hall.basics/paintings/effects/filters`、`artwork.medium`、`focus.close`（zh + en）——Task 3/4/5/9 消费

- [ ] **Step 1: 写失败测试 `tests/unit/i18n.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import i18n from '../../src/i18n';

describe('museum i18n keys', () => {
  it('provides museum name in zh and en', () => {
    expect(i18n.getFixedT('zh')('museum.name')).toBe('Shader 美术馆');
    expect(i18n.getFixedT('en')('museum.name')).toBe('Shader Museum');
  });

  it('provides hall kickers for all four galleries', () => {
    const zh = i18n.getFixedT('zh');
    const en = i18n.getFixedT('en');
    expect(zh('museum.hall.basics')).toBe('第一展厅');
    expect(zh('museum.hall.paintings')).toBe('第二展厅');
    expect(zh('museum.hall.effects')).toBe('第三展厅');
    expect(zh('museum.hall.filters')).toBe('第四展厅');
    expect(en('museum.hall.basics')).toBe('Gallery I');
    expect(en('museum.hall.paintings')).toBe('Gallery II');
    expect(en('museum.hall.effects')).toBe('Gallery III');
    expect(en('museum.hall.filters')).toBe('Gallery IV');
  });

  it('provides artwork medium and focus room close label', () => {
    expect(i18n.getFixedT('zh')('artwork.medium')).toBe('Fragment Shader');
    expect(i18n.getFixedT('en')('artwork.medium')).toBe('Fragment Shader');
    expect(i18n.getFixedT('zh')('focus.close')).toBe('关闭');
    expect(i18n.getFixedT('en')('focus.close')).toBe('Close');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/i18n.test.ts`
Expected: FAIL（key 不存在，返回 key 字符串）

- [ ] **Step 3: 在 `src/i18n/index.ts` 加入新 key**

zh `translation` 对象内、`entry` 块之后插入：

```ts
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
```

en `translation` 对象内同样位置插入：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过 + 门**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/i18n.test.ts && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

- [ ] **Step 5: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/i18n/index.ts tests/unit/i18n.test.ts && git commit -m "feat: museum i18n keys (hall names, artwork medium, focus room)"
```

---

### Task 3: FramedArtwork 装裱卡片 + 共享测试 helper

白 mat + 细深色框 + 馆签 + 参数滑杆；画布区点击/键盘开展厅；**不含**代码编辑器（spec §3）。DemoCard 暂留（Task 10 删除）。

**Files:**
- Create: `tests/helpers/fakeIntersectionObserver.ts`
- Create: `src/components/shader/FramedArtwork.tsx`
- Modify: `src/index.css`（追加 FramedArtwork 样式块，放在 skeleton 区之后、Easing 区之前）
- Test: `tests/unit/FramedArtwork.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 1 token/CSS（`.skeleton`、`--color-mat/frame/border/accent`、全局 range 样式）；Task 2 `artwork.medium`；现有 `ShaderCanvas`、`WebcamCapture`、`ShaderControls`、`CanvasErrorBoundary`、`useShaderSource`
- Produces:
  - `FramedArtwork({ demo: ShaderDemo; variant: 'shader' | 'filter'; onFocus: (demo: ShaderDemo) => void })` —— Task 4 消费
  - `installFakeIntersectionObserver(): { triggerAll(isIntersecting: boolean): void }` —— Task 4/5/9 测试消费
  - DOM 钩子：`data-testid="framed-canvas"`、`.framed-artwork`、`.framed-artwork__canvas`（e2e 消费）

- [ ] **Step 1: 写共享 helper `tests/helpers/fakeIntersectionObserver.ts`**

```ts
import { vi } from 'vitest';

export interface FakeIntersectionObserverHandle {
  /** 向当前所有存活的 observer 回调广播一次 intersection 状态 */
  triggerAll(isIntersecting: boolean): void;
}

export function installFakeIntersectionObserver(): FakeIntersectionObserverHandle {
  const callbacks = new Set<IntersectionObserverCallback>();

  class FakeIntersectionObserver {
    private cb: IntersectionObserverCallback;

    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
      callbacks.add(cb);
    }

    observe(): void {}
    unobserve(): void {}
    disconnect(): void {
      callbacks.delete(this.cb);
    }
  }

  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

  return {
    triggerAll(isIntersecting: boolean) {
      for (const cb of [...callbacks]) {
        cb([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
      }
    },
  };
}
```

调用方配对：每个测试文件 `afterEach` 里 `vi.unstubAllGlobals()`。

- [ ] **Step 2: 写失败测试 `tests/unit/FramedArtwork.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FramedArtwork } from '../../src/components/shader/FramedArtwork';
import { installFakeIntersectionObserver } from '../helpers/fakeIntersectionObserver';
import type { ShaderDemo } from '../../src/shader/types';

const demo: ShaderDemo = {
  id: 'hsb',
  title: 'HSB Spectrum',
  titleZh: 'HSB 色环',
  description: 'HSB color space demo',
  descriptionZh: 'HSB 色彩空间',
  source: 'basics/colors/01-hsb-spectrum.glsl',
  params: [
    { name: 'speed', label: 'Speed', labelZh: '速度', min: 0, max: 2, step: 0.1, default: 1 },
  ],
  presets: [],
};

describe('FramedArtwork', () => {
  beforeEach(() => {
    installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens the focus room when the canvas area is clicked', () => {
    const onFocus = vi.fn();
    render(<FramedArtwork demo={demo} variant="shader" onFocus={onFocus} />);
    fireEvent.click(screen.getByTestId('framed-canvas'));
    expect(onFocus).toHaveBeenCalledWith(demo);
  });

  it('opens the focus room via Enter / Space on the canvas area', () => {
    const onFocus = vi.fn();
    render(<FramedArtwork demo={demo} variant="shader" onFocus={onFocus} />);
    fireEvent.keyDown(screen.getByTestId('framed-canvas'), { key: 'Enter' });
    expect(onFocus).toHaveBeenCalledWith(demo);
  });

  it('does not open the focus room when interacting with sliders', () => {
    const onFocus = vi.fn();
    render(<FramedArtwork demo={demo} variant="shader" onFocus={onFocus} />);
    const slider = screen.getByRole('slider');
    fireEvent.click(slider);
    fireEvent.change(slider, { target: { value: '1.5' } });
    expect(onFocus).not.toHaveBeenCalled();
  });

  it('does not render a code editor toggle on the wall', () => {
    render(<FramedArtwork demo={demo} variant="shader" onFocus={() => {}} />);
    expect(screen.queryByText('View Code')).toBeNull();
    expect(screen.queryByText('查看代码')).toBeNull();
  });

  it('shows the museum label with localized title and medium line', () => {
    render(<FramedArtwork demo={demo} variant="shader" onFocus={() => {}} />);
    // jsdom navigator = en-US → 英文文案
    expect(screen.getByText('HSB Spectrum')).toBeTruthy();
    expect(screen.getByText('Fragment Shader · 2026')).toBeTruthy();
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/FramedArtwork.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现 `src/components/shader/FramedArtwork.tsx`**

```tsx
import { useState, useCallback } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ShaderCanvas } from './ShaderCanvas';
import { CanvasErrorBoundary } from '../ui/CanvasErrorBoundary';
import { WebcamCapture } from '../ui/WebcamCapture';
import { ShaderControls } from './ShaderControls';
import { useShaderSource } from '../../hooks/useShaderSource';
import type { ShaderDemo, ShaderPreset } from '../../shader/types';

interface FramedArtworkProps {
  demo: ShaderDemo;
  variant: 'shader' | 'filter';
  onFocus: (demo: ShaderDemo) => void;
}

export function FramedArtwork({ demo, variant, onFocus }: FramedArtworkProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const originalSource = useShaderSource(demo.source);

  const initialValues: Record<string, number> = {};
  for (const p of demo.params) {
    initialValues[p.name] = p.default;
  }

  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleParamChange = useCallback((name: string, value: number) => {
    setActivePreset(null);
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePresetSelect = useCallback((preset: ShaderPreset) => {
    setActivePreset(preset.name);
    setValues((prev) => ({ ...prev, ...preset.values }));
  }, []);

  // 重试时通过 key 整体重建 WebcamCapture，使 useShaderCanvas 的
  // IntersectionObserver 绑定到新容器元素
  const handleWebcamRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const handleFocus = useCallback(() => {
    onFocus(demo);
  }, [onFocus, demo]);

  // 画布区内命中嵌套交互元素（如 webcam 重试按钮）时不触发展厅
  const handleCanvasClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button, input, a')) return;
      handleFocus();
    },
    [handleFocus],
  );

  const handleCanvasKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFocus();
      }
    },
    [handleFocus],
  );

  const title = lang === 'zh' ? demo.titleZh : demo.title;

  return (
    <figure className="framed-artwork">
      <div className="framed-artwork__frame">
        <div
          className="framed-artwork__canvas"
          data-testid="framed-canvas"
          role="button"
          tabIndex={0}
          aria-label={title}
          onClick={handleCanvasClick}
          onKeyDown={handleCanvasKeyDown}
        >
          {originalSource ? (
            variant === 'filter' ? (
              <WebcamCapture
                key={retryKey}
                fragmentShader={originalSource}
                uniforms={values}
                className="w-full"
                onRetry={handleWebcamRetry}
              />
            ) : (
              <CanvasErrorBoundary>
                <ShaderCanvas
                  fragmentShader={originalSource}
                  uniforms={values}
                  interactive={demo.interactive}
                  className="w-full"
                />
              </CanvasErrorBoundary>
            )
          ) : (
            <div className="skeleton w-full" style={{ aspectRatio: '4 / 3' }} />
          )}
        </div>
      </div>
      <figcaption className="framed-artwork__label">
        <h3>{title}</h3>
        <p>{t('artwork.medium')} · 2026</p>
      </figcaption>
      <ShaderControls
        params={demo.params}
        presets={demo.presets}
        values={values}
        onParamChange={handleParamChange}
        onPresetSelect={handlePresetSelect}
        activePreset={activePreset}
        lang={lang}
      />
    </figure>
  );
}
```

注意：与 DemoCard 的差异——无 `editedSource`/`compileError` 状态、无 `ShaderCodeEditor`（卡片不再展示代码，spec §3）；`ShaderCanvas` 不传 `onCompileError`（编译失败由 `glError` fallback 覆盖）。

- [ ] **Step 5: `src/index.css` 追加 FramedArtwork 样式**

在 `/* Easing curves */` 注释区之前插入：

```css
/* ================================================================
   Framed Artwork — 经典美术馆装裱（白 mat + 细深色框 + 馆签）
   ================================================================ */

.framed-artwork {
  display: flex;
  flex-direction: column;
}

.framed-artwork__frame {
  background: var(--color-mat);
  padding: clamp(12px, 4%, 22px);
  border: 1px solid var(--color-frame);
  box-shadow: 0 3px 14px rgba(61, 51, 42, 0.16);
}

.framed-artwork__canvas {
  cursor: pointer;
}

/* 装裱内画布直角（覆盖 Tailwind 的 rounded-lg —— 未分层样式优先于分层工具类） */
.framed-artwork__canvas .rounded-lg {
  border-radius: 0;
}

.framed-artwork__label {
  margin-top: 14px;
}

.framed-artwork__label h3 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.framed-artwork__label p {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  margin-top: 3px;
}
```

- [ ] **Step 6: 跑测试确认通过 + 门**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/FramedArtwork.test.tsx && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

- [ ] **Step 7: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add tests/helpers/fakeIntersectionObserver.ts src/components/shader/FramedArtwork.tsx tests/unit/FramedArtwork.test.tsx src/index.css && git commit -m "feat: FramedArtwork — matted frame card with museum label"
```

---

### Task 4: GallerySection 展厅（网格画廊墙）

展厅标题区（黄铜 kicker + 衬线大标题 + 策展导语）+ CSS grid 画廊墙；series 平铺、不渲染分组标题；`alt` 控制交替底色。ShaderSection 暂留（Task 10 删除）。

**Files:**
- Create: `src/components/sections/GallerySection.tsx`
- Modify: `src/index.css`（FramedArtwork 样式块之后追加）
- Test: `tests/unit/GallerySection.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 3 `FramedArtwork` + fake IO helper；Task 2 `museum.hall.*`
- Produces: `GallerySection` default export，props `{ id: ShaderCategoryId; title; titleZh; description; descriptionZh; series: ShaderSeries[]; cardType?: 'shader' | 'filter'; alt?: boolean; onFocus: (demo: ShaderDemo) => void }` —— Task 10 消费；DOM 钩子 `.gallery-section`、`.gallery-section--alt`、`.gallery-wall`、`.framed-artwork`（e2e 消费）

- [ ] **Step 1: 写失败测试 `tests/unit/GallerySection.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import GallerySection from '../../src/components/sections/GallerySection';
import { installFakeIntersectionObserver } from '../helpers/fakeIntersectionObserver';
import type { ShaderDemo, ShaderSeries } from '../../src/shader/types';

function makeDemo(id: string, title: string): ShaderDemo {
  return {
    id,
    title,
    titleZh: `${title} 中文`,
    description: `${id} desc`,
    descriptionZh: `${id} 描述`,
    source: 'basics/colors/01-hsb-spectrum.glsl',
    params: [],
    presets: [],
  };
}

const demoA = makeDemo('a', 'Artwork A');
const demoB = makeDemo('b', 'Artwork B');
const demoC = makeDemo('c', 'Artwork C');

const series: ShaderSeries[] = [
  {
    id: 's1',
    title: 'Series One',
    titleZh: '系列一',
    description: '',
    descriptionZh: '',
    demos: [demoA, demoB],
  },
  {
    id: 's2',
    title: 'Series Two',
    titleZh: '系列二',
    description: '',
    descriptionZh: '',
    demos: [demoC],
  },
];

function renderSection(overrides: Partial<Parameters<typeof GallerySection>[0]> = {}) {
  return render(
    <GallerySection
      id="basics"
      title="Shader Basics"
      titleZh="Shader 基础"
      description="Building blocks."
      descriptionZh="构建基石。"
      series={series}
      onFocus={() => {}}
      {...overrides}
    />,
  );
}

describe('GallerySection', () => {
  beforeEach(() => {
    installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('flattens all series onto one wall without series headings', () => {
    const { container } = renderSection();
    expect(container.querySelectorAll('.framed-artwork')).toHaveLength(3);
    expect(screen.queryByText('Series One')).toBeNull();
    expect(screen.queryByText('Series Two')).toBeNull();
    expect(screen.queryByText('系列一')).toBeNull();
  });

  it('renders the brass hall kicker from museum.hall keys', () => {
    renderSection({ id: 'paintings' });
    expect(screen.getByText('Gallery II')).toBeTruthy();
  });

  it('renders localized section title and curatorial description', () => {
    renderSection();
    expect(screen.getByText('Shader Basics')).toBeTruthy();
    expect(screen.getByText('Building blocks.')).toBeTruthy();
  });

  it('applies the alternating background class when alt', () => {
    const { container } = renderSection({ alt: true });
    expect(container.querySelector('.gallery-section--alt')).toBeTruthy();
  });

  it('forwards focus events with the clicked demo', () => {
    const onFocus = vi.fn();
    renderSection({ onFocus });
    const canvases = screen.getAllByTestId('framed-canvas');
    const second = canvases[1];
    if (!second) throw new Error('expected at least 2 artworks on the wall');
    fireEvent.click(second);
    expect(onFocus).toHaveBeenCalledWith(demoB);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/GallerySection.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/components/sections/GallerySection.tsx`**

```tsx
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
```

- [ ] **Step 4: `src/index.css` 追加 GallerySection 样式**（FramedArtwork 块之后）

```css
/* ================================================================
   Gallery Section — 展厅标题区 + 网格画廊墙
   ================================================================ */

.gallery-section {
  padding: 96px 0;
  background: var(--color-bg-primary);
}

.gallery-section--alt {
  background: var(--color-bg-secondary);
}

.gallery-section__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.gallery-kicker {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 12px;
}

.gallery-section__title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 700;
  line-height: 1.15;
  color: var(--color-text-primary);
}

.gallery-section__desc {
  font-size: 16px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  max-width: 560px;
  margin-top: 12px;
}

.gallery-wall {
  margin-top: 48px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
}

@media (min-width: 640px) {
  .gallery-wall {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .gallery-wall {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .gallery-section {
    padding: 64px 0;
  }
}
```

- [ ] **Step 5: 跑测试确认通过 + 门**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/GallerySection.test.tsx && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/components/sections/GallerySection.tsx tests/unit/GallerySection.test.tsx src/index.css && git commit -m "feat: GallerySection grid wall replacing carousel series rows"
```

---

### Task 5: MuseumNav 双形态导航

首屏极简馆签（非固定，随滚动画走）+ 滚动后固定栏（纸白底 + 四展厅锚点 + 语言切换）。IntersectionObserver 观察哨兵元素切换形态。无主题切换、无玻璃拟态、无 pill 动画。Navigation 暂留（Task 10 删除）。

**Files:**
- Create: `src/components/layout/MuseumNav.tsx`
- Modify: `src/index.css`（GallerySection 块之后追加）
- Test: `tests/unit/MuseumNav.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 2 `museum.name` + 现有 `nav.*` key；fake IO helper
- Produces: `MuseumNav` default export，props `{ sentinelRef: RefObject<HTMLElement | null> }` —— Task 10 消费（MainLayout 在 `<main>` 顶部渲染哨兵 `div` 并传入 ref）；DOM 钩子 `data-testid="museum-nav-minimal" / "museum-nav-fixed"`

- [ ] **Step 1: 写失败测试 `tests/unit/MuseumNav.test.tsx`**

```tsx
import { useRef } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, cleanup, waitFor, within } from '@testing-library/react';
import MuseumNav from '../../src/components/layout/MuseumNav';
import {
  installFakeIntersectionObserver,
  type FakeIntersectionObserverHandle,
} from '../helpers/fakeIntersectionObserver';

function Host() {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  return (
    <>
      <MuseumNav sentinelRef={sentinelRef} />
      <div ref={sentinelRef} data-testid="sentinel" />
    </>
  );
}

describe('MuseumNav', () => {
  let io: FakeIntersectionObserverHandle;

  beforeEach(() => {
    io = installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the minimal hall label while the sentinel is in view', () => {
    render(<Host />);
    expect(screen.getByTestId('museum-nav-minimal')).toBeTruthy();
    expect(screen.queryByTestId('museum-nav-fixed')).toBeNull();
    // jsdom navigator = en-US
    expect(screen.getByText('Shader Museum')).toBeTruthy();
  });

  it('docks into the fixed bar when the sentinel leaves the viewport', async () => {
    render(<Host />);
    act(() => {
      io.triggerAll(false);
    });
    expect(await screen.findByTestId('museum-nav-fixed')).toBeTruthy();
  });

  it('returns to the minimal form when the sentinel re-enters', async () => {
    render(<Host />);
    act(() => {
      io.triggerAll(false);
    });
    await screen.findByTestId('museum-nav-fixed');
    act(() => {
      io.triggerAll(true);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('museum-nav-fixed')).toBeNull();
    });
    expect(screen.getByTestId('museum-nav-minimal')).toBeTruthy();
  });

  it('lists the four gallery anchors in the fixed bar', async () => {
    render(<Host />);
    act(() => {
      io.triggerAll(false);
    });
    const bar = await screen.findByTestId('museum-nav-fixed');
    const links = within(bar).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '#basics',
      '#paintings',
      '#effects',
      '#filters',
    ]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/MuseumNav.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/components/layout/MuseumNav.tsx`**

```tsx
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
```

- [ ] **Step 4: `src/index.css` 追加 MuseumNav 样式**（GallerySection 块之后）

```css
/* ================================================================
   Museum Nav — 双形态（首屏馆签 / 滚动后固定栏）
   ================================================================ */

.museum-nav-minimal {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 32px;
}

.museum-nav-minimal__brand {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-text-primary);
}

.museum-nav__lang {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--color-text-secondary);
  padding: 6px 10px;
  transition: color 0.15s ease;
}

.museum-nav__lang:hover {
  color: var(--color-text-primary);
}

.museum-nav-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
}

.museum-nav-fixed__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--nav-height);
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.museum-nav-fixed__links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.museum-nav-fixed__link {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 6px 12px;
  transition: color 0.15s ease;
}

.museum-nav-fixed__link:hover {
  color: var(--color-text-primary);
}

.museum-nav-fixed__link.active {
  color: var(--color-accent);
}

.museum-nav-fixed__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.museum-nav__burger {
  display: none;
  background: none;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: var(--color-text-primary);
  cursor: pointer;
  padding: 6px 10px;
}

.museum-nav-fixed__menu {
  display: none;
}

@media (max-width: 768px) {
  .museum-nav-fixed__links {
    display: none;
  }
  .museum-nav__burger {
    display: block;
  }
  .museum-nav-fixed__menu {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 24px 14px;
    overflow: hidden;
    border-top: 1px solid var(--color-border);
  }
}
```

- [ ] **Step 5: 跑测试确认通过 + 门**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/MuseumNav.test.tsx && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/components/layout/MuseumNav.tsx tests/unit/MuseumNav.test.tsx src/index.css && git commit -m "feat: MuseumNav dual-form navigation"
```

---

### Task 6: EntryHall 浅色入口大厅 + nebula 浅色变体

重做 EntryPage：纸白基调、衬线馆名（`museum.name`）、保留全部进入交互与 WebGL 降级。新建 `nebula-light.glsl` 占位（正式视觉属子项目 3）。EntryPage 暂留（Task 10 删除）。

**Files:**
- Create: `src/shaders/background/nebula-light.glsl`
- Create: `src/EntryHall.tsx`
- Modify: `src/index.css`（MuseumNav 块之后追加）

**Interfaces:**
- Consumes: Task 1 token；Task 2 `museum.name`；现有 `ShaderBackground`、`isWebGLSupported`、`entry.subtitle/hint/enter`、`webgl.unsupported`
- Produces: `EntryHall` default export，props `{ onEnter: () => void }` —— Task 10 App 消费；DOM 钩子 `.entry-hall__enter`（e2e 进入按钮）

- [ ] **Step 1: 创建 `src/shaders/background/nebula-light.glsl`**

与 nebula.glsl 同构，调色板换纸色系：

```glsl
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = uv - 0.5;

  float t = u_time * 0.15;

  vec2 q1 = centered * 2.0 + vec2(sin(t * 0.3), cos(t * 0.4)) * 0.5;
  float f1 = fbm(q1 * 3.0 + t * 0.2);

  vec2 q2 = centered * 2.5 + vec2(cos(t * 0.5), sin(t * 0.35)) * 0.6;
  float f2 = fbm(q2 * 4.0 - t * 0.15);

  // 纸色系调色板
  vec3 paper = vec3(0.969, 0.957, 0.933); // #f7f4ee
  vec3 cream = vec3(0.925, 0.906, 0.863); // 稍深纸色
  vec3 brass = vec3(0.541, 0.427, 0.231); // #8a6d3b
  vec3 sage = vec3(0.620, 0.663, 0.596);  // 灰绿晕染

  vec3 color = mix(paper, cream, f1);
  color = mix(color, brass, f2 * 0.18);
  color = mix(color, sage, fbm(centered * 5.0 + t * 0.1) * 0.12);

  // 柔和纸面暗角（压暗而非压黑）
  float vignette = 1.0 - length(centered) * 0.5;
  color *= mix(0.92, 1.0, smoothstep(0.0, 1.0, vignette));

  // 细腻纸纹
  float grain = hash(uv + fract(u_time * 0.01)) * 0.02;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
```

验证 shader 检查脚本通过：

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run check:shaders`
Expected: `PASS: all shaders clean`（未使用 varying/#version/iTime/iResolution/iMouse）

- [ ] **Step 2: 实现 `src/EntryHall.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShaderBackground } from './components/shader/ShaderBackground';
import { isWebGLSupported } from './engine/support';
import nebulaLightShader from './shaders/background/nebula-light.glsl?raw';

interface EntryHallProps {
  onEnter: () => void;
}

export default function EntryHall({ onEnter }: EntryHallProps) {
  const { t } = useTranslation();
  const [webglOk, setWebglOk] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isWebGLSupported()) setWebglOk(false);
  }, []);

  // 点击 / 滚动 / 触摸 / 键盘进入
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 30) onEnter();
    };
    const onTouch = () => onEnter();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'Enter' || e.key === ' ')
        onEnter();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('keydown', onKey);
    };
  }, [onEnter]);

  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const animProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };
  const tr = shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease };

  return (
    <div className="entry-hall">
      {webglOk ? (
        <ShaderBackground fragmentShader={nebulaLightShader} />
      ) : (
        <div className="entry-hall__nogl-bg" />
      )}

      {/* 纸白渐变罩，保证文字可读性 */}
      <div className="entry-hall__veil" />

      <div className="entry-hall__content">
        <motion.p
          {...animProps}
          transition={{ ...tr, delay: shouldReduceMotion ? 0 : 0.1 }}
          className="entry-hall__kicker"
        >
          {t('entry.subtitle')}
        </motion.p>

        <motion.h1
          {...animProps}
          transition={{ ...tr, delay: shouldReduceMotion ? 0 : 0.2 }}
          className="entry-hall__title"
        >
          {t('museum.name')}
        </motion.h1>

        {!webglOk && <p className="entry-hall__nogl-note">{t('webgl.unsupported')}</p>}

        <motion.div
          className="entry-hall__hint"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          <span className="entry-hall__hint-line" />
          <span>{t('entry.hint')}</span>
        </motion.div>

        <motion.button
          type="button"
          onClick={onEnter}
          className="entry-hall__enter"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
        >
          {t('entry.enter')}
        </motion.button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/index.css` 追加 EntryHall 样式**（MuseumNav 块之后）

```css
/* ================================================================
   Entry Hall — 浅色入口大厅
   ================================================================ */

.entry-hall {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-primary);
}

.entry-hall__nogl-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: var(--color-bg-primary);
}

.entry-hall__veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    to bottom,
    rgba(247, 244, 238, 0.35) 0%,
    transparent 40%,
    rgba(247, 244, 238, 0.6) 100%
  );
}

.entry-hall__content {
  position: absolute;
  bottom: 12%;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 0 48px;
  max-width: 900px;
}

.entry-hall__kicker {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 14px;
}

.entry-hall__title {
  font-family: var(--font-display);
  font-size: clamp(44px, 7vw, 88px);
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-text-primary);
  margin-bottom: 20px;
}

.entry-hall__nogl-note {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  max-width: 420px;
  margin-bottom: 16px;
}

.entry-hall__hint {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-tertiary);
  font-size: 13px;
  margin-top: 40px;
}

.entry-hall__hint-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--color-text-tertiary), transparent);
}

.entry-hall__enter {
  margin-top: 28px;
  padding: 12px 36px;
  font-family: var(--font-body);
  font-size: 15px;
  letter-spacing: 0.06em;
  color: var(--color-accent);
  background: transparent;
  border: 1px solid var(--color-accent);
  border-radius: 9999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.entry-hall__enter:hover {
  background: var(--color-accent);
  color: #ffffff;
}

@media (max-width: 768px) {
  .entry-hall__content {
    padding: 0 24px;
  }
}
```

- [ ] **Step 4: 门 + Commit**

无独立单测（进入交互与渲染由 e2e Task 12 背书）。

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run format && npm run lint && npx tsc -b && npm test && npm run check:shaders`
Expected: 全绿

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/EntryHall.tsx src/shaders/background/nebula-light.glsl src/index.css && git commit -m "feat: EntryHall — light museum entry with paper-tone nebula"
```

---

### Task 7: ShaderControls 双变体（gallery / room）

加 `variant` prop；把 Tailwind 任意值内联样式换成语义 CSS 类，使展厅暗色换皮成为可能。行为不变（滑杆/预设回调签名不变）。

**Files:**
- Modify: `src/components/shader/ShaderControls.tsx`（整体重写）
- Modify: `src/index.css`（EntryHall 块之后追加）
- Test: `tests/unit/ShaderControls.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 1 token + 全局 range 基底
- Produces: `ShaderControls` 新增可选 prop `variant?: 'gallery' | 'room'`（默认 `'gallery'`），其余 props 签名不变——Task 9 FocusRoom 以 `variant="room"` 消费；FramedArtwork 不传（默认 gallery）

- [ ] **Step 1: 写失败测试 `tests/unit/ShaderControls.test.tsx`**

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ShaderControls } from '../../src/components/shader/ShaderControls';
import type { ShaderParam, ShaderPreset } from '../../src/shader/types';

const params: ShaderParam[] = [
  { name: 'speed', label: 'Speed', labelZh: '速度', min: 0, max: 2, step: 0.1, default: 1 },
];
const presets: ShaderPreset[] = [{ name: 'calm', nameZh: '平静', values: { speed: 0.5 } }];

function renderControls(variant?: 'gallery' | 'room') {
  const onParamChange = vi.fn();
  const onPresetSelect = vi.fn();
  const utils = render(
    <ShaderControls
      params={params}
      presets={presets}
      values={{ speed: 1 }}
      onParamChange={onParamChange}
      onPresetSelect={onPresetSelect}
      activePreset={null}
      lang="en"
      {...(variant ? { variant } : {})}
    />,
  );
  return { onParamChange, onPresetSelect, ...utils };
}

describe('ShaderControls', () => {
  afterEach(cleanup);

  it('applies the gallery variant class by default', () => {
    const { container } = renderControls();
    expect(container.querySelector('.shader-controls--gallery')).toBeTruthy();
  });

  it('applies the room variant class for the focus room', () => {
    const { container } = renderControls('room');
    expect(container.querySelector('.shader-controls--room')).toBeTruthy();
  });

  it('calls onParamChange when a slider moves', () => {
    const { onParamChange } = renderControls();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1.5' } });
    expect(onParamChange).toHaveBeenCalledWith('speed', 1.5);
  });

  it('calls onPresetSelect when a preset is clicked', () => {
    const { onPresetSelect } = renderControls();
    fireEvent.click(screen.getByText('calm'));
    expect(onPresetSelect).toHaveBeenCalledWith(presets[0]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/ShaderControls.test.tsx`
Expected: FAIL（`.shader-controls--gallery` 等类不存在）

- [ ] **Step 3: 重写 `src/components/shader/ShaderControls.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import type { ShaderParam, ShaderPreset } from '../../shader/types';

interface ShaderControlsProps {
  params: ShaderParam[];
  presets: ShaderPreset[];
  values: Record<string, number>;
  onParamChange: (name: string, value: number) => void;
  onPresetSelect: (preset: ShaderPreset) => void;
  activePreset: string | null;
  lang: string;
  /** gallery = 画廊墙浅色（默认）；room = 展厅模式暗色 */
  variant?: 'gallery' | 'room';
}

export function ShaderControls({
  params,
  presets,
  values,
  onParamChange,
  onPresetSelect,
  activePreset,
  lang,
  variant = 'gallery',
}: ShaderControlsProps) {
  const { t } = useTranslation();

  const label = (item: { label: string; labelZh: string }) =>
    lang === 'zh' ? item.labelZh : item.label;
  const presetName = (p: ShaderPreset) => (lang === 'zh' ? p.nameZh : p.name);

  return (
    <div className={`shader-controls shader-controls--${variant}`}>
      {presets.length > 0 && (
        <div>
          <span className="shader-controls__heading">{t('common.presets')}</span>
          <div className="shader-controls__presets">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => onPresetSelect(preset)}
                className={`shader-controls__preset${activePreset === preset.name ? ' active' : ''}`}
              >
                {presetName(preset)}
              </button>
            ))}
          </div>
        </div>
      )}

      {params.length > 0 && (
        <div>
          <span className="shader-controls__heading">{t('common.params')}</span>
          <div className="shader-controls__sliders">
            {params.map((param) => (
              <div key={param.name} className="shader-controls__row">
                <span className="shader-controls__name">{label(param)}</span>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={values[param.name] ?? param.default}
                  onChange={(e) => onParamChange(param.name, parseFloat(e.target.value))}
                />
                <span className="shader-controls__value">
                  {(values[param.name] ?? param.default).toFixed(param.step < 1 ? 1 : 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `src/index.css` 追加 ShaderControls 样式**（EntryHall 块之后）

```css
/* ================================================================
   Shader Controls — gallery（浅色）/ room（展厅暗色）双变体
   ================================================================ */

.shader-controls {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shader-controls__heading {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-text-tertiary);
}

.shader-controls__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.shader-controls__preset {
  padding: 2px 10px;
  font-size: 11px;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.shader-controls__preset:hover {
  border-color: var(--color-text-tertiary);
}

.shader-controls__preset.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.shader-controls__sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.shader-controls__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shader-controls__name {
  font-size: 10px;
  color: var(--color-text-secondary);
  width: 56px;
  flex-shrink: 0;
  text-align: right;
}

.shader-controls__row input[type='range'] {
  flex: 1;
}

.shader-controls__value {
  font-size: 10px;
  color: var(--color-text-secondary);
  width: 32px;
  font-variant-numeric: tabular-nums;
}

/* 展厅暗色变体 */
.shader-controls--room .shader-controls__heading {
  color: rgba(255, 255, 255, 0.45);
}

.shader-controls--room .shader-controls__name,
.shader-controls--room .shader-controls__value {
  color: rgba(255, 255, 255, 0.6);
}

.shader-controls--room .shader-controls__preset {
  border-color: rgba(255, 255, 255, 0.22);
  color: var(--color-room-text);
}

.shader-controls--room .shader-controls__preset:hover {
  border-color: rgba(255, 255, 255, 0.45);
}

.shader-controls--room .shader-controls__preset.active {
  border-color: var(--color-room-accent);
  color: var(--color-room-accent);
}

.shader-controls--room input[type='range'] {
  background: rgba(255, 255, 255, 0.16);
}

.shader-controls--room input[type='range']::-webkit-slider-thumb {
  background: var(--color-room-accent);
}

.shader-controls--room input[type='range']::-moz-range-thumb {
  background: var(--color-room-accent);
}
```

- [ ] **Step 5: 跑测试确认通过 + 门**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/ShaderControls.test.tsx tests/unit/FramedArtwork.test.tsx && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿（FramedArtwork 测试一并回归——它内嵌 ShaderControls）

- [ ] **Step 6: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/components/shader/ShaderControls.tsx tests/unit/ShaderControls.test.tsx src/index.css && git commit -m "feat: ShaderControls gallery/room variants"
```

---

### Task 8: ShaderCodeEditor `alwaysOpen` 模式

展厅模式里代码直接展开、无折叠切换。`alwaysOpen` 默认 false（现有行为不变）。编辑器容器内联样式换为 `.editor-shell` 类以便展厅内覆盖边框色。

**Files:**
- Modify: `src/components/shader/ShaderCodeEditor.tsx`
- Modify: `src/index.css`（ShaderControls 块之后追加）
- Test: `tests/unit/ShaderCodeEditor.test.tsx`（新建）

**Interfaces:**
- Consumes: 现有 CodeMirror 装配逻辑
- Produces: `ShaderCodeEditor` 新增可选 prop `alwaysOpen?: boolean`——Task 9 FocusRoom 消费；CSS 类 `.editor-shell`（`.focus-room .editor-shell` 覆盖在 Task 9 CSS 中定义）

- [ ] **Step 1: 写失败测试 `tests/unit/ShaderCodeEditor.test.tsx`**

jsdom 缺少 ResizeObserver / Range.getClientRects，CodeMirror 无法在 jsdom 真实运行——mock `@codemirror/view`（组件静态 import 的唯一 CM 模块；`@codemirror/commands`、`theme-one-dark` 与动态 import 的 legacy-modes/language 均为纯数据结构，用真模块）。mock 的 `EditorView` 构造时向 parent 追加 `<div class="cm-editor">` 作为挂载标记：

```tsx
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ShaderCodeEditor } from '../../src/components/shader/ShaderCodeEditor';

vi.mock('@codemirror/view', () => {
  class EditorView {
    static updateListener = { of: () => ({}) };
    static theme = () => ({});
    state = { doc: { toString: () => '' } };
    destroy(): void {}
    dispatch(): void {}
    constructor(config: { parent?: HTMLElement }) {
      const dom = document.createElement('div');
      dom.className = 'cm-editor';
      config.parent?.appendChild(dom);
    }
  }
  return { EditorView, keymap: { of: () => ({}) } };
});

const CODE = 'void main() { gl_FragColor = vec4(1.0); }';

function renderEditor(alwaysOpen?: boolean) {
  return render(
    <ShaderCodeEditor
      code={CODE}
      onChange={() => {}}
      onReset={() => {}}
      error={null}
      {...(alwaysOpen ? { alwaysOpen } : {})}
    />,
  );
}

describe('ShaderCodeEditor', () => {
  afterEach(cleanup);

  it('renders expanded without a toggle when alwaysOpen', async () => {
    const { container } = renderEditor(true);
    expect(screen.queryByText('View Code')).toBeNull();
    expect(screen.queryByText('Hide Code')).toBeNull();
    const shell = container.querySelector('.editor-shell');
    expect(shell).toBeTruthy();
    await waitFor(() => {
      expect(container.querySelector('.cm-editor')).toBeTruthy();
    });
  });

  it('stays collapsed behind a toggle by default', () => {
    const { container } = renderEditor();
    expect(screen.getByText('View Code')).toBeTruthy();
    expect(container.querySelector('.cm-editor')).toBeNull();
  });

  it('expands on toggle click in default mode', async () => {
    const { container } = renderEditor();
    fireEvent.click(screen.getByText('View Code'));
    await waitFor(() => {
      expect(container.querySelector('.cm-editor')).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/ShaderCodeEditor.test.tsx`
Expected: FAIL（`alwaysOpen` prop 不存在 → toggle 仍渲染 → 第 1 个测试失败；`.editor-shell` 类不存在）

- [ ] **Step 3: 修改 `src/components/shader/ShaderCodeEditor.tsx`**

精确改动 4 处（其余行不动）：

1. props 接口加字段：

```ts
interface ShaderCodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onReset: () => void;
  error: string | null;
  /** 展厅模式：直接展开且隐藏 查看/收起 切换 */
  alwaysOpen?: boolean;
}
```

2. 函数签名与 open 初始值：

```ts
export function ShaderCodeEditor({
  code,
  onChange,
  onReset,
  error,
  alwaysOpen = false,
}: ShaderCodeEditorProps) {
  const [open, setOpen] = useState(alwaysOpen);
```

3. 切换按钮仅在非 alwaysOpen 渲染（替换现有 `<button onClick={toggleOpen} ...>...</button>` 整块）：

```tsx
        {!alwaysOpen && (
          <button
            onClick={toggleOpen}
            aria-expanded={open}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {open ? t('common.hideCode') : t('common.viewCode')}
          </button>
        )}
```

4. 编辑器容器内联样式换类（替换 `<div ref={containerRef} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }} />`）：

```tsx
            <div ref={containerRef} className="editor-shell" />
```

- [ ] **Step 4: `src/index.css` 追加编辑器样式**（ShaderControls 块之后）

```css
/* ================================================================
   Shader Code Editor
   ================================================================ */

.editor-shell {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}
```

- [ ] **Step 5: 跑测试确认通过 + 门**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/ShaderCodeEditor.test.tsx && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

- [ ] **Step 6: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/components/shader/ShaderCodeEditor.tsx tests/unit/ShaderCodeEditor.test.tsx src/index.css && git commit -m "feat: ShaderCodeEditor alwaysOpen mode for focus room"
```

---

### Task 9: FocusRoom 展厅模式 overlay

全站唯一暗空间。左画布 58% + 右栏 27%（kicker/作品名/媒介年份/策展文案/参数面板/常开代码）。Esc/×/暗区关闭；body 滚动锁定；独立 canvas pool；参数不回写。

**Files:**
- Modify: `src/hooks/useCanvasSlot.ts`（追加 `focusCanvasPool`）
- Modify: `src/hooks/useShaderCanvas.ts`（加 `pool` 选项）
- Create: `src/components/focus/FocusRoom.tsx`
- Modify: `src/index.css`（Shader Code Editor 块之后追加）
- Test: `tests/unit/FocusRoom.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 7 `ShaderControls variant="room"`；Task 8 `ShaderCodeEditor alwaysOpen`；Task 2 `artwork.medium`、`focus.close`；fake IO helper；现有 `useShaderSource`、`CanvasErrorBoundary`、`WebcamCapture`
- Produces:
  - `focusCanvasPool: CanvasPool`（`src/hooks/useCanvasSlot.ts`）
  - `useShaderCanvas` options 新增 `pool?: CanvasPool`
  - `FocusRoom({ demo: ShaderDemo; kicker: string; variant: 'shader' | 'filter'; onClose: () => void })` named export —— Task 10 MainLayout 消费
  - DOM 钩子：`data-testid="focus-room"`、`data-testid="focus-room-canvas"`、`.focus-room`（e2e 消费）

- [ ] **Step 1: 扩展 canvas pool**

`src/hooks/useCanvasSlot.ts` 在 `cardCanvasPool` 行之后追加：

```ts
/** 展厅模式 canvas 独立预算：不占用卡片池，关闭即释放 */
export const focusCanvasPool = new CanvasPool(1);
```

`src/hooks/useShaderCanvas.ts` 三处改动：

1. 顶部 import 加类型：
```ts
import type { CanvasPool } from '../engine/CanvasPool';
```
2. `UseShaderCanvasOptions` 加字段（放在 `canvasClassName` 之后）：
```ts
  /** 展厅模式传入 focusCanvasPool；缺省用卡片池 */
  pool?: CanvasPool;
```
3. 解构与调用：
```ts
export function useShaderCanvas({
  fragmentShader,
  uniforms,
  canvasClassName = '',
  pool,
  onCompileError,
}: UseShaderCanvasOptions): UseShaderCanvasResult {
```
```ts
  const slotGranted = useCanvasSlot(visible, pool);
```
（`useCanvasSlot(active, pool = cardCanvasPool)` 的默认参数在实参为 `undefined` 时生效，行为不变。）

- [ ] **Step 2: 写失败测试 `tests/unit/FocusRoom.test.tsx`**

mock `ShaderCodeEditor`（CodeMirror 不能在 jsdom 跑；本测试聚焦状态机而非编辑器）：

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FocusRoom } from '../../src/components/focus/FocusRoom';
import { installFakeIntersectionObserver } from '../helpers/fakeIntersectionObserver';
import type { ShaderDemo } from '../../src/shader/types';

vi.mock('../../src/components/shader/ShaderCodeEditor', () => ({
  ShaderCodeEditor: () => <div data-testid="code-editor-stub" />,
}));

const demo: ShaderDemo = {
  id: 'starry',
  title: 'Starry Vortex',
  titleZh: '星夜涡旋',
  description: 'A swirling night sky.',
  descriptionZh: '旋转的夜空。',
  source: 'basics/colors/01-hsb-spectrum.glsl',
  params: [
    { name: 'speed', label: 'Speed', labelZh: '速度', min: 0, max: 2, step: 0.1, default: 1 },
  ],
  presets: [],
};

function renderRoom(onClose: () => void = () => {}) {
  return render(<FocusRoom demo={demo} kicker="Gallery I" variant="shader" onClose={onClose} />);
}

describe('FocusRoom', () => {
  beforeEach(() => {
    installFakeIntersectionObserver();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = renderRoom();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the dark backdrop outside the body', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.click(screen.getByTestId('focus-room'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the rail content', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.click(screen.getByText('A swirling night sky.'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes via the × button with an accessible label', () => {
    const onClose = vi.fn();
    renderRoom(onClose);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows kicker, localized title, medium line and curatorial text', () => {
    renderRoom();
    // jsdom navigator = en-US
    expect(screen.getByText('Gallery I')).toBeTruthy();
    expect(screen.getByText('Starry Vortex')).toBeTruthy();
    expect(screen.getByText('Fragment Shader · 2026')).toBeTruthy();
    expect(screen.getByText('A swirling night sky.')).toBeTruthy();
  });

  it('renders room-variant controls and the always-open code editor', async () => {
    const { container } = renderRoom();
    expect(container.querySelector('.shader-controls--room')).toBeTruthy();
    expect(await screen.findByTestId('code-editor-stub')).toBeTruthy();
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/FocusRoom.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现 `src/components/focus/FocusRoom.tsx`**

```tsx
import { useState, useCallback, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useShaderCanvas } from '../../hooks/useShaderCanvas';
import { focusCanvasPool } from '../../hooks/useCanvasSlot';
import { CanvasErrorBoundary } from '../ui/CanvasErrorBoundary';
import { WebcamCapture } from '../ui/WebcamCapture';
import { ShaderControls } from '../shader/ShaderControls';
import { ShaderCodeEditor } from '../shader/ShaderCodeEditor';
import { useShaderSource } from '../../hooks/useShaderSource';
import type { ShaderDemo, ShaderPreset } from '../../shader/types';

interface FocusRoomProps {
  demo: ShaderDemo;
  /** 所属展厅名（调用方按当前语言解析好传入） */
  kicker: string;
  variant: 'shader' | 'filter';
  onClose: () => void;
}

interface FocusCanvasProps {
  source: string;
  values: Record<string, number>;
  interactive?: boolean;
  onCompileError: (msg: string | null) => void;
}

/** 展厅大画布：独立 GL context + 独立 pool，关闭即销毁 */
function FocusCanvas({ source, values, interactive = false, onCompileError }: FocusCanvasProps) {
  const { containerRef, rendererRef } = useShaderCanvas({
    fragmentShader: source,
    uniforms: values,
    canvasClassName: 'focus-room__glcanvas',
    pool: focusCanvasPool,
    onCompileError,
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      rendererRef.current?.setMouse(
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height,
      );
    },
    [interactive, rendererRef],
  );

  return (
    <div
      ref={containerRef}
      data-testid="focus-room-canvas"
      className="focus-room__canvas"
      onMouseMove={handleMouseMove}
    />
  );
}

export function FocusRoom({ demo, kicker, variant, onClose }: FocusRoomProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const shouldReduceMotion = useReducedMotion();
  const originalSource = useShaderSource(demo.source);

  const initialValues: Record<string, number> = {};
  for (const p of demo.params) {
    initialValues[p.name] = p.default;
  }

  // 展厅内参数/代码状态完全独立：关闭即销毁，不回写卡片（spec §4）
  const [values, setValues] = useState<Record<string, number>>(initialValues);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [editedSource, setEditedSource] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const activeSource = editedSource ?? originalSource ?? '';

  // Esc 关闭 + 背景滚动锁定
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleParamChange = useCallback((name: string, value: number) => {
    setActivePreset(null);
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePresetSelect = useCallback((preset: ShaderPreset) => {
    setActivePreset(preset.name);
    setValues((prev) => ({ ...prev, ...preset.values }));
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    setEditedSource(newCode);
  }, []);

  const handleCodeReset = useCallback(() => {
    setEditedSource(null);
    setCompileError(null);
  }, []);

  const handleWebcamRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  const title = lang === 'zh' ? demo.titleZh : demo.title;
  const description = lang === 'zh' ? demo.descriptionZh : demo.description;

  return (
    <motion.div
      className="focus-room"
      data-testid="focus-room"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="focus-room__body" onClick={(e) => e.stopPropagation()}>
        <div className="focus-room__stage">
          {originalSource ? (
            variant === 'filter' ? (
              <WebcamCapture
                key={retryKey}
                fragmentShader={activeSource}
                uniforms={values}
                className="focus-room__glcanvas"
                onRetry={handleWebcamRetry}
              />
            ) : (
              <CanvasErrorBoundary>
                <FocusCanvas
                  source={activeSource}
                  values={values}
                  interactive={demo.interactive}
                  onCompileError={setCompileError}
                />
              </CanvasErrorBoundary>
            )
          ) : (
            <div className="skeleton focus-room__canvas" />
          )}
        </div>

        <aside className="focus-room__rail">
          <p className="focus-room__kicker">{kicker}</p>
          <h2 className="focus-room__title">{title}</h2>
          <p className="focus-room__meta">{t('artwork.medium')} · 2026</p>
          <p className="focus-room__desc">{description}</p>
          <ShaderControls
            params={demo.params}
            presets={demo.presets}
            values={values}
            onParamChange={handleParamChange}
            onPresetSelect={handlePresetSelect}
            activePreset={activePreset}
            lang={lang}
            variant="room"
          />
          {originalSource && (
            <ShaderCodeEditor
              alwaysOpen
              code={originalSource}
              onChange={handleCodeChange}
              onReset={handleCodeReset}
              error={compileError}
            />
          )}
        </aside>
      </div>

      <button
        type="button"
        className="focus-room__close"
        aria-label={t('focus.close')}
        onClick={onClose}
      >
        ×
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 5: `src/index.css` 追加 FocusRoom 样式**（Shader Code Editor 块之后）

```css
/* ================================================================
   Focus Room — 展厅模式（全站唯一暗空间）
   ================================================================ */

.focus-room {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(16, 16, 20, 0.97);
}

.focus-room__body {
  display: grid;
  grid-template-columns: 58fr 27fr;
  gap: 40px;
  height: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 48px 56px;
}

.focus-room__stage {
  min-height: 0;
  display: flex;
  align-items: center;
}

.focus-room__canvas {
  width: 100%;
  height: 100%;
}

.focus-room__rail {
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  color: var(--color-room-text);
}

.focus-room__kicker {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-room-accent);
  margin-bottom: 10px;
}

.focus-room__title {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-room-text);
}

.focus-room__meta {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 6px;
}

.focus-room__desc {
  font-size: 14px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.72);
  margin-top: 18px;
}

.focus-room .editor-shell {
  border-color: rgba(255, 255, 255, 0.14);
  margin-top: 4px;
}

.focus-room__close {
  position: fixed;
  top: 20px;
  right: 24px;
  z-index: 101;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.focus-room__close:hover {
  border-color: rgba(255, 255, 255, 0.7);
  color: #ffffff;
}

@media (max-width: 768px) {
  .focus-room__body {
    grid-template-columns: 1fr;
    grid-template-rows: 50vh minmax(0, 1fr);
    gap: 20px;
    padding: 20px;
    overflow-y: auto;
  }
  .focus-room__rail {
    overflow: visible;
  }
}
```

- [ ] **Step 6: 跑测试确认通过 + 门**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npx vitest run tests/unit/FocusRoom.test.tsx && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

- [ ] **Step 7: Commit**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add src/hooks/useCanvasSlot.ts src/hooks/useShaderCanvas.ts src/components/focus/FocusRoom.tsx tests/unit/FocusRoom.test.tsx src/index.css && git commit -m "feat: FocusRoom — dark overlay gallery with dedicated canvas pool"
```

---

### Task 10: MainLayout / App 接线 + 旧组件删除

新组件全部就位后一次切换：MainLayout 用 MuseumNav/GallerySection/FocusRoom；App 用 EntryHall。删除 Navigation/ShaderSection/DemoCard/EntryPage。无新测试——装配正确性由既有单测回归 + Task 12 e2e 背书。

**Files:**
- Modify: `src/components/layout/MainLayout.tsx`（整体重写）
- Modify: `src/App.tsx`
- Delete: `src/components/layout/Navigation.tsx`、`src/components/sections/ShaderSection.tsx`、`src/components/shader/DemoCard.tsx`、`src/EntryPage.tsx`

**Interfaces:**
- Consumes: Task 3/4/5/6/9 全部新组件
- Produces: 完整可用的美术馆站点（spec §2 信息架构落地）；`focusedDemo` 状态流（spec §5）

- [ ] **Step 1: 重写 `src/components/layout/MainLayout.tsx`**

```tsx
import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import MuseumNav from './MuseumNav';
import GallerySection from '../sections/GallerySection';
import { FocusRoom } from '../focus/FocusRoom';
import { getCategories } from '../../shader/registry';
import { isWebGLSupported } from '../../engine/support';
import type { ShaderDemo } from '../../shader/types';

export default function MainLayout() {
  const { t } = useTranslation();
  const categories = getCategories();
  const [webglOk] = useState(() => isWebGLSupported());
  const [focusedDemo, setFocusedDemo] = useState<ShaderDemo | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const closeFocusRoom = useCallback(() => setFocusedDemo(null), []);

  if (!webglOk) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
          {t('webgl.unsupported')}
        </p>
      </div>
    );
  }

  const focusedCategory = focusedDemo
    ? categories.find((cat) =>
        cat.series.some((s) => s.demos.some((d) => d.id === focusedDemo.id)),
      )
    : undefined;

  return (
    <motion.div
      style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <MuseumNav sentinelRef={sentinelRef} />
      <main>
        {/* 导航双形态哨兵：在视口内 = 首屏馆签 */}
        <div ref={sentinelRef} aria-hidden="true" />
        {categories.map((cat, index) => (
          <GallerySection
            key={cat.id}
            id={cat.id}
            title={cat.title}
            titleZh={cat.titleZh}
            description={cat.description}
            descriptionZh={cat.descriptionZh}
            series={cat.series}
            cardType={cat.cardType}
            alt={index % 2 === 1}
            onFocus={setFocusedDemo}
          />
        ))}
      </main>
      <footer className="py-8 text-center border-t" style={{ borderColor: 'var(--color-border)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Shader Portfolio &copy; {new Date().getFullYear()} &mdash; Built with WebGL &amp; React
        </p>
      </footer>
      <AnimatePresence>
        {focusedDemo && focusedCategory && (
          <FocusRoom
            demo={focusedDemo}
            kicker={t(`museum.hall.${focusedCategory.id}`)}
            variant={focusedCategory.cardType}
            onClose={closeFocusRoom}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

- [ ] **Step 2: 更新 `src/App.tsx`**

完整替换：

```tsx
import { useState } from 'react';
import EntryHall from './EntryHall';
import MainLayout from './components/layout/MainLayout';
import './i18n';
import './shader/categories'; // Boot: registers all shader metadata

export default function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <EntryHall onEnter={() => setEntered(true)} />;
  }

  return <MainLayout />;
}
```

- [ ] **Step 3: 删除旧组件**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git rm src/components/layout/Navigation.tsx src/components/sections/ShaderSection.tsx src/components/shader/DemoCard.tsx src/EntryPage.tsx
```

- [ ] **Step 4: 验证无残留引用**

Run:
```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && grep -rn "Navigation\|ShaderSection\|DemoCard\|EntryPage" src/ --include="*.tsx" --include="*.ts" | grep -v "MuseumNav" || echo "CLEAN"
```
Expected: `CLEAN`

- [ ] **Step 5: 门 + Commit**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add -A src/ && git commit -m "feat: wire museum layout, replace legacy components"
```

---

### Task 11: 残余清理（useTheme / tone / legacy CSS / dead key）

**Files:**
- Delete: `src/hooks/useTheme.ts`
- Modify: `src/shader/types.ts`（删 `tone` 字段）
- Modify: `src/shader/categories/basics.ts`、`paintings.ts`、`effects.ts`、`filters.ts`（各删一行 `tone: ...`）
- Modify: `src/i18n/index.ts`（删 `entry.title` zh+en——EntryHall 用 `museum.name`，该 key 已死）
- Modify: `src/index.css`（删 Legacy 整块）

**Interfaces:**
- Consumes: Task 10 完成态
- Produces: 无新接口；`ShaderCategory` 不再含 `tone`

- [ ] **Step 1: 删除 useTheme 并验证无引用**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git rm src/hooks/useTheme.ts && grep -rn "useTheme" src/ tests/ || echo "CLEAN"
```
Expected: `CLEAN`

- [ ] **Step 2: 从 `ShaderCategory` 删除 `tone`**

`src/shader/types.ts` 中删除：

```ts
  tone: 'dark' | 'light';
```

4 个 category 文件中各删除对应行（`tone: 'dark',` 或 `tone: 'light',`）：

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && grep -n "tone:" src/shader/categories/basics.ts src/shader/categories/paintings.ts src/shader/categories/effects.ts src/shader/categories/filters.ts
```
Expected: 各 1 行，用编辑器删除（`filters.ts` 里 "sepia tones" 等文案行含 "tone" 字样但不是 `tone:` 字段，勿误删——grep 模式带冒号已区分）。

- [ ] **Step 3: 删除 `entry.title` key**

`src/i18n/index.ts`：zh 删 `title: '着色器作品集',`，en 删 `title: 'Shader Portfolio',`。验证：

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && grep -rn "entry.title" src/ || echo "CLEAN"
```
Expected: `CLEAN`

- [ ] **Step 4: 删除 `src/index.css` Legacy 整块**

从 `/* ================================================================
   Legacy — 旧组件过渡样式（Task 11 整块删除）` 起到文件末尾全部删除。

- [ ] **Step 5: 验证无 legacy 类残留引用**

Run:
```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && grep -rn "glass\|nav-link\|btn-icon\|carousel\|entry-page\|entry-content\|entry-title\|entry-subtitle\|entry-scroll\|section-title\|section-desc\|theme-switching\|data-theme" src/ --include="*.tsx" --include="*.ts" || echo "CLEAN"
```
Expected: `CLEAN`（若有命中，回到对应文件改为美术馆类名后再继续）

- [ ] **Step 6: 门 + Commit**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run format && npm run lint && npx tsc -b && npm test`
Expected: 全绿

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add -A src/ && git commit -m "refactor: remove theme system, tone field and legacy CSS"
```

---

### Task 12: Playwright e2e 扩展（展厅流程）

更新入口选择器（`.entry-page button` → `.entry-hall__enter`）；新增展厅全流程用例；过滤 Google Fonts 离线加载失败的 console error（网络问题 ≠ 站点错误）。

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`（整体重写）

**Interfaces:**
- Consumes: Task 10 完成态的全部 DOM 钩子（`.entry-hall__enter`、`.framed-artwork__canvas`、`data-testid="focus-room"`、`data-testid="focus-room-canvas"`、`canvas.shader-canvas`）
- Produces: e2e 背书 spec §7 冒烟清单

- [ ] **Step 1: 重写 `tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

// Google Fonts 在离线/内网环境加载失败会打 console error，与站点本身无关，过滤
function isFontResourceError(url: string | undefined): boolean {
  return (
    url !== undefined &&
    (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'))
  );
}

test.describe('portfolio smoke', () => {
  test('entry hall renders WebGL with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isFontResourceError(msg.location()?.url)) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/Portfolio/');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000); // 渲染数帧

    const size = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      return { width: c.width, height: c.height };
    });
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);

    // preserveDrawingBuffer: true 使画面可被 2d canvas 读回
    const hasNonBlackPixels = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const probe = document.createElement('canvas');
      probe.width = 8;
      probe.height = 8;
      const ctx = probe.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(c, 0, 0, 8, 8);
      const data = ctx.getImageData(0, 0, 8, 8).data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        if (r + g + b > 24) return true;
      }
      return false;
    });
    expect(hasNonBlackPixels).toBe(true);
    expect(errors).toEqual([]);
  });

  test('entering the gallery renders artwork canvases on the wall', async ({ page }) => {
    await page.goto('/Portfolio/');
    await page.locator('.entry-hall__enter').click();
    await expect(page.locator('main')).toBeVisible();
    const cardCanvas = page.locator('canvas.shader-canvas').first();
    await expect(cardCanvas).toBeAttached({ timeout: 10_000 });
    const width = await cardCanvas.evaluate((el) => (el as HTMLCanvasElement).width);
    expect(width).toBeGreaterThan(0);
  });

  test('clicking an artwork opens the focus room; Escape returns to the wall', async ({
    page,
  }) => {
    await page.goto('/Portfolio/');
    await page.locator('.entry-hall__enter').click();
    await expect(page.locator('main')).toBeVisible();

    const artwork = page.locator('.framed-artwork__canvas').first();
    await expect(artwork).toBeVisible();
    // 等墙上第一张画布真正挂载，避免点到 skeleton
    await expect(artwork.locator('canvas.shader-canvas')).toBeAttached({ timeout: 10_000 });
    await artwork.click();

    const room = page.getByTestId('focus-room');
    await expect(room).toBeVisible();

    const roomCanvas = page.getByTestId('focus-room-canvas').locator('canvas.shader-canvas');
    await expect(roomCanvas).toBeAttached({ timeout: 10_000 });
    await page.waitForTimeout(500); // 渲染数帧

    const hasPixels = await roomCanvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      if (c.width === 0) return false;
      const probe = document.createElement('canvas');
      probe.width = 8;
      probe.height = 8;
      const ctx = probe.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(c, 0, 0, 8, 8);
      const data = ctx.getImageData(0, 0, 8, 8).data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        if (r + g + b > 24) return true;
      }
      return false;
    });
    expect(hasPixels).toBe(true);

    await page.keyboard.press('Escape');
    await expect(room).toBeHidden();
    await expect(page.locator('.framed-artwork').first()).toBeVisible();
  });
});
```

- [ ] **Step 2: 跑 e2e**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run test:e2e`
Expected: 3 passed（webServer 会自动 build + preview；若字体加载慢导致首个用例偶发失败，retries: 1 兜底）

- [ ] **Step 3: 门 + Commit**

Run: `cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run format && npm run lint && npx tsc -b && npm test && npm run test:e2e`
Expected: 全绿

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && git add tests/e2e/smoke.spec.ts && git commit -m "test(e2e): focus room flow + font-resource error filter"
```

---

### Task 13: 全门链收口 + 人工走查交接

**Files:** 无新文件；修复性改动视情况

- [ ] **Step 1: 全门链**

Run:
```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && npm run lint && npx tsc -b && npm test && npm run format:check && npm run build && npm run check:shaders && npm run test:e2e
```
Expected: 全绿。任何一环红了，修到绿为止（修复直接提交 `fix: ...`）。

- [ ] **Step 2: 政策核查**

Run:
```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio && grep -rn "= [^=].*!\.\|)!\." src/ --include="*.ts" --include="*.tsx" | grep -v "!==" | grep -v "!=" || echo "NO-BANG-CHECK-DONE"; grep -rn "eslint-disable\|oxlint-disable" src/ tests/ || echo "CLEAN: no lint disables"
```
人工扫一眼输出确认无非空断言（`!.` / `)!`）。Expected: 无可疑命中 + 无 lint disable。

- [ ] **Step 3: 交接人工视觉走查**

向用户输出走查清单（spec §7），请其在浏览器逐项确认：

1. 入口大厅：浅色 shader 背景、衬线馆名、进入按钮
2. 滚动后：极简馆签换成固定纸白导航栏，四展厅锚点黄铜 active 态
3. 画廊墙：3 列网格、白 mat 装裱、馆签、相邻展厅底色交替
4. 点作品画布进展厅：暗空间、左大画布、右栏 文案→滑杆→代码
5. 展厅内调参数/编辑代码：画布实时响应；关闭后卡片参数保持原状
6. Esc / × / 点暗区关闭，回到原滚动位置
7. 移动端宽度：网格 1 列、导航汉堡、展厅上下堆叠
8. 语言切换：中英文案全量切换（馆名/展厅 kicker/馆签/展厅模式）

---

## Self-Review 记录

**Spec 覆盖核对：**
- §1 设计系统 → Task 1（token/字体/保留机制）✓；删 `.light`/`useTheme`/`.glass`/主题切换 → Task 1（CSS）+ Task 10（Navigation 删除）+ Task 11（useTheme）✓
- §2 入口大厅 → Task 6 ✓；导航双形态 → Task 5 ✓；展厅/网格/series 平铺/交替底色 → Task 4 ✓；页脚 → Task 10（沿用）✓
- §3 装裱卡片 → Task 3 ✓（装裱/馆签/滑杆/点击隔离/移除代码按钮）
- §4 展厅模式 → Task 9 ✓（布局/关闭三方式/滚动锁/独立 context/状态隔离/暗色代码）+ Task 7/8（换皮与常开）✓
- §5 数据流 → Task 10 ✓（focusedDemo、AnimatePresence 挂载卸载）；i18n key → Task 2 ✓
- §6 错误处理 → CanvasErrorBoundary 沿用（Task 9 包裹展厅画布）✓；WebGL fallback 纸白 → Task 1 `.webgl-fallback` 换色 + Task 10 MainLayout 沿用 ✓；ShaderCompileError 行内标注 → ShaderCodeEditor 保留 ✓
- §7 测试 → Vitest 三项（Task 3/5/9）✓；Playwright 扩展 → Task 12 ✓；人工走查 → Task 13 ✓
- 组件替换总表 → Task 3/4/5/6/9 新建、Task 10 删除旧件 ✓
- 成功标准 1/2/3/4/5 → Task 13 ✓

**Placeholder 扫描：** 全部代码步骤含完整可粘贴实现；无 TBD/TODO/"适当处理"。

**类型一致性：**
- `FramedArtwork({demo, variant, onFocus})` — Task 3 定义 = Task 4 调用 ✓
- `GallerySection({id, title, titleZh, description, descriptionZh, series, cardType?, alt?, onFocus})` — Task 4 定义 = Task 10 调用 ✓
- `MuseumNav({sentinelRef: RefObject<HTMLElement | null>})` — Task 5 定义 = Task 10 传 `RefObject<HTMLDivElement | null>`（协变兼容）✓
- `FocusRoom({demo, kicker, variant, onClose})` — Task 9 定义 = Task 10 调用 ✓
- `ShaderControls` 加 `variant?`（可选，旧调用方 FramedArtwork 不传仍编译）✓
- `ShaderCodeEditor` 加 `alwaysOpen?`（可选）✓
- `useShaderCanvas` 加 `pool?: CanvasPool`；`useCanvasSlot(visible, pool)` 实参 undefined 走默认参数 ✓
- i18n key 路径 `museum.hall.${id}`：id 为 ShaderCategoryId，四个 key 齐备 ✓
