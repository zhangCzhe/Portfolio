# Shader 内容升级 + 参数系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 4 个展厅的 shader 内容升级为展览级精品（重新精选/交互重做/新增），扩展参数系统支持颜色类型，重做入口 nebula-light 为晨光大理石 shader。

**Architecture:** 参数系统：`ShaderParam.type` 新增 `'color'` 变体 → `ShaderControls` 渲染 ColorSwatch 取色器 → `GLRenderer.applyCustomUniform`（已有 vec3 路径，无需改动）→ shader 以 `uniform vec3 u_xxx` 消费颜色。Shader 内容：每个展厅精简 demo 数量、补齐参数/预设、升级交互逻辑（`u_mouse`）。入口 nebula-light.glsl 完全重写。

**Tech Stack:** React 19, TypeScript strict + erasableSyntaxOnly, Vite 8, WebGL2, GLSL ES 3.0, Vitest + @testing-library/react, Playwright, oxlint, prettier

## Global Constraints

- `check:shaders` 禁止: `varying`, `#version`, `iTime`, `iResolution`, `iMouse`
- GLSL 统一以 `#ifdef GL_ES / precision mediump float; / #else / precision highp float; / #endif` 开头
- 零 `!` non-null assertion，零 eslint-disable，src + tests 全覆盖
- `npm run format && npm run lint && npx tsc -b && npm test && npm run check:shaders && npm run test:e2e` 全部通过
- 参数类型后向兼容：不写 `type` 的现有 param 视为 `'float'`
- Museum 组件（FramedArtwork, GallerySection, FocusRoom, EntryHall 等）不改动结构
- 每 task 以 TDD：先写测试 → fail → 实现 → pass → commit
- `values` 类型从 `Record<string, number>` 扩展为 `Record<string, number | [number, number, number]>`

---

### Task 1: 参数系统类型扩展 + GLRenderer 对接

**Files:**

- Modify: `src/shader/types.ts` — `ShaderParam` 加 `type`、`defaultColor`；`ShaderPreset.values` 扩展
- Modify: `src/engine/types.ts` — `UniformSchema` 扩展
- Create: `tests/unit/colorParams.test.ts` — 验证类型分发

**Interfaces:**

- Consumes: 现有 `ShaderParam`, `ShaderPreset`, `UniformSchema`
- Produces: `ShaderParam.type: 'float' | 'color'`, `defaultColor?: [number, number, number]`, `ShaderPreset.values: Record<string, number | [number, number, number]>`, `UniformSchema` 允许 `[number, number, number]` 值

**Note:** `GLRenderer.applyCustomUniform` (src/engine/GLRenderer.ts:253-276) 已支持 `value.length === 3` → `gl.uniform3fv`，引擎代码无需改动。

- [ ] **Step 1: 写失败测试**

```typescript
// tests/unit/colorParams.test.ts
import { describe, it, expect } from 'vitest';

// 验证类型定义的正确性 —— 编译时 + 运行时双检
describe('color parameter types', () => {
  it('accepts ShaderParam with type=color and defaultColor', () => {
    const param: import('../../src/shader/types').ShaderParam = {
      name: 'u_tint',
      label: 'Tint',
      labelZh: '色调',
      type: 'color',
      defaultColor: [0.8, 0.6, 0.4],
    };
    expect(param.type).toBe('color');
    expect(param.defaultColor).toEqual([0.8, 0.6, 0.4]);
  });

  it('treats missing type as float (backward compat)', () => {
    const param: import('../../src/shader/types').ShaderParam = {
      name: 'u_speed',
      label: 'Speed',
      labelZh: '速度',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5,
    };
    expect(param.type ?? 'float').toBe('float');
  });

  it('accepts ShaderPreset values with color arrays', () => {
    const preset: import('../../src/shader/types').ShaderPreset = {
      name: 'warm',
      nameZh: '暖色',
      values: {
        u_speed: 0.5,
        u_tint: [1.0, 0.5, 0.2] as [number, number, number],
      },
    };
    expect(Array.isArray(preset.values.u_tint)).toBe(true);
  });

  it('accepts UniformSchema with color arrays for GLRenderer', () => {
    const uniforms: import('../../src/engine/types').UniformSchema = {
      u_speed: 1.0,
      u_color1: [0.2, 0.5, 0.8],
      u_color2: [1.0, 0.3, 0.1],
    };
    expect(uniforms.u_speed).toBe(1.0);
    expect(uniforms.u_color1).toEqual([0.2, 0.5, 0.8]);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```
npx vitest run tests/unit/colorParams.test.ts
```

Expected: TypeScript 编译失败或跑通（仅类型验证，运行时应 pass —— 实际上 `ShaderParam` 目前没有 `type`/`defaultColor` 字段，编译会报错；需要先改类型再跑）

- [ ] **Step 3: 修改类型定义**

```typescript
// src/shader/types.ts — ShaderParam 改:
export interface ShaderParam {
  name: string;
  label: string;
  labelZh: string;
  /** 参数类型，默认 'float'（向后兼容） */
  type?: 'float' | 'color';
  // float 字段:
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  // color 字段:
  defaultColor?: [number, number, number];
}

// ShaderPreset 改:
export interface ShaderPreset {
  name: string;
  nameZh: string;
  values: Record<string, number | [number, number, number]>;
}
```

```typescript
// src/engine/types.ts — UniformSchema 扩展值类型:
export type UniformValue = number | [number, number, number] | [number, number, number, number];
export type UniformSchema = Record<string, UniformValue>;
```

检查 `UniformSchema` 的实际定义位置（可能在 `src/engine/types.ts`），按其现有结构追加 `UniformValue` 类型并更新 `UniformSchema`。

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run tests/unit/colorParams.test.ts
```

Expected: 4/4 PASS

- [ ] **Step 5: Full gate + commit**

```bash
npm run format && npm run lint && npx tsc -b && npm test
```

```bash
git add tests/unit/colorParams.test.ts src/shader/types.ts src/engine/types.ts
git commit -m "feat: add color param type + extend UniformSchema for vec3 values"
```

---

### Task 2: ColorSwatch 组件 + ShaderControls 集成

**Files:**

- Create: `src/components/shader/ColorSwatch.tsx` — 取色器微组件
- Modify: `src/components/shader/ShaderControls.tsx` — 根据 `param.type` 渲染 ColorSwatch，扩展 `onParamChange` 签名
- Create: `tests/unit/ColorSwatch.test.tsx`
- Modify: `src/index.css` — ColorSwatch + ShaderControls params 区样式追加

**Interfaces:**

- Consumes: Task 1 `ShaderParam.type`, `ShaderParam.defaultColor`, `UniformValue`
- Produces: `ColorSwatch` 组件 props `{ value: [number,number,number]; onChange: (color: [number,number,number]) => void; variant: 'gallery' | 'room' }`；ShaderControls 新增 `onParamChange` 支持 `(name: string, value: number | [number,number,number]) => void`

- [ ] **Step 1: 写 ColorSwatch 测试**

```typescript
// tests/unit/ColorSwatch.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { ColorSwatch } from '../../src/components/shader/ColorSwatch';

describe('ColorSwatch', () => {
  it('renders a color swatch with the given CSS color', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorSwatch value={[0.8, 0.3, 0.5]} onChange={onChange} variant="gallery" />,
    );
    const swatch = container.querySelector('.color-swatch__chip');
    expect(swatch).toBeTruthy();
    expect(swatch!.getAttribute('style')).toContain('rgb');
  });

  it('opens popover on click in gallery mode', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorSwatch value={[0.2, 0.5, 0.8]} onChange={onChange} variant="gallery" />,
    );
    const swatch = container.querySelector('.color-swatch__chip')!;
    fireEvent.click(swatch);
    expect(container.querySelector('.color-swatch__popover')).toBeTruthy();
  });

  it('calls onChange when color slider changes', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorSwatch value={[0.2, 0.5, 0.8]} onChange={onChange} variant="gallery" />,
    );
    fireEvent.click(container.querySelector('.color-swatch__chip')!);
    const redSlider = container.querySelector('input[name="red"]')!;
    fireEvent.change(redSlider, { target: { value: '0.9' } });
    expect(onChange).toHaveBeenCalledWith([0.9, 0.5, 0.8]);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```bash
npx vitest run tests/unit/ColorSwatch.test.tsx
```

Expected: FAIL — ColorSwatch module not found

- [ ] **Step 3: 实现 ColorSwatch**

```tsx
// src/components/shader/ColorSwatch.tsx
import { useState, useCallback } from 'react';

interface ColorSwatchProps {
  value: [number, number, number]; // RGB 0–1
  onChange: (color: [number, number, number]) => void;
  variant: 'gallery' | 'room';
}

function toCss(value: [number, number, number]): string {
  const [r, g, b] = value;
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

export function ColorSwatch({ value, onChange, variant }: ColorSwatchProps) {
  const [open, setOpen] = useState(false);

  const handleSlider = useCallback(
    (channel: number, val: string) => {
      const next = [...value] as [number, number, number];
      next[channel] = parseFloat(val);
      onChange(next);
    },
    [value, onChange],
  );

  return (
    <div className={`color-swatch color-swatch--${variant}`}>
      <button
        type="button"
        className="color-swatch__chip"
        style={{ backgroundColor: toCss(value) }}
        onClick={() => setOpen(!open)}
        aria-label={`Color: ${toCss(value)}`}
      />
      {open && (
        <div className="color-swatch__popover">
          {['R', 'G', 'B'].map((label, i) => (
            <label key={label} className="color-swatch__channel">
              <span>{label}</span>
              <input
                type="range"
                name={label.toLowerCase()}
                min={0}
                max={1}
                step={0.01}
                value={value[i]}
                onChange={(e) => handleSlider(i, e.target.value)}
              />
            </label>
          ))}
          <div className="color-swatch__preview" style={{ backgroundColor: toCss(value) }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 扩展 ShaderControls**

修改 `src/components/shader/ShaderControls.tsx`:

```tsx
import { ColorSwatch } from './ColorSwatch';

// Props 改:
interface ShaderControlsProps {
  params: ShaderParam[];
  presets: ShaderPreset[];
  values: Record<string, number | [number, number, number]>;
  onParamChange: (name: string, value: number | [number, number, number]) => void;
  onPresetSelect: (preset: ShaderPreset) => void;
  activePreset: string | null;
  lang: string;
  variant?: 'gallery' | 'room';
}

// params 渲染区改为:
{
  params.length > 0 && (
    <div>
      <span className="shader-controls__heading">{t('common.params')}</span>
      <div className="shader-controls__sliders">
        {params.map((param) => {
          const isColor = param.type === 'color';
          const pName = param.name;
          const pValue =
            values[pName] ??
            (isColor ? (param.defaultColor ?? [0.5, 0.5, 0.5]) : (param.default ?? 0));
          return (
            <div key={pName} className="shader-controls__row">
              <span className="shader-controls__name">{label(param)}</span>
              {isColor ? (
                <ColorSwatch
                  value={pValue as [number, number, number]}
                  onChange={(color) => onParamChange(pName, color)}
                  variant={variant}
                />
              ) : (
                <>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={pValue as number}
                    onChange={(e) => onParamChange(pName, parseFloat(e.target.value))}
                  />
                  <span className="shader-controls__value">
                    {(pValue as number).toFixed((param.step ?? 1) < 1 ? 1 : 0)}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 追加 CSS**

在 `src/index.css` 的 ShaderControls 样式区后追加：

```css
/* ================================================================
   Color Swatch — 取色器微组件
   ================================================================ */

.color-swatch {
  position: relative;
}

.color-swatch__chip {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.color-swatch__chip:hover {
  transform: scale(1.15);
}

.color-swatch__popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 10;
  padding: 10px 12px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.color-swatch--room .color-swatch__popover {
  background: var(--color-room-bg, #1a1a1a);
  border-color: rgba(255, 255, 255, 0.12);
}

.color-swatch__channel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.color-swatch__channel span {
  width: 14px;
  text-align: right;
}

.color-swatch__channel input {
  flex: 1;
  height: 4px;
}

.color-swatch__preview {
  height: 18px;
  border-radius: var(--radius-sm);
  margin-top: 2px;
}
```

- [ ] **Step 6: Run tests + gate + commit**

```bash
npm run format && npm run lint && npx tsc -b && npm test
```

```bash
git add src/components/shader/ColorSwatch.tsx tests/unit/ColorSwatch.test.tsx src/components/shader/ShaderControls.tsx src/index.css
git commit -m "feat: ColorSwatch component + ShaderControls color param support"
```

---

### Task 3: basics 展厅重组（21→8，补参数）

**Files:**

- Modify: `src/shader/categories/basics.ts` — 删除 13 个 demo，保留 8 个并补齐参数/预设
- Modify: `src/index.css` — （如保留的 shader 需要新 CSS 规则则追加，通常不需要）

**Interfaces:**

- Consumes: Task 1 `ShaderParam.type: 'color'`, Task 2 ColorSwatch
- Produces: 8 个精选 demo，每个 ≥1 参数 + ≥3 预设

- [ ] **Step 1: 更新 basics.ts**

完整替换 `src/shader/categories/basics.ts`（删除所有旧 demo + series 定义，仅保留 8 个精选）：

<details>
<summary>展开完整 basics.ts</summary>

```typescript
import { registerCategory } from '../registry';
import type { ShaderCategory } from '../types';

const basics: ShaderCategory = {
  id: 'basics',
  title: 'Shader Basics',
  titleZh: 'Shader 基础',
  description:
    'From noise and fractals to lighting and shapes — the essential building blocks of fragment shaders.',
  descriptionZh: '从噪声、分形到光照与形状——片元着色器的核心构建基石。',
  cardType: 'shader',
  series: [
    {
      id: 'colors',
      title: 'Colors & Gradients',
      titleZh: '色彩与渐变',
      description: 'Dynamic gradients and smooth color transitions with real-time control.',
      descriptionZh: '动态渐变与平滑色彩过渡，实时参数控制。',
      demos: [
        {
          id: 'gradient-ring',
          title: 'Gradient Ring',
          titleZh: '渐变光环',
          description: 'Dynamic circular gradient with palette rotation and hue shifting.',
          descriptionZh: '动态环形渐变，可调色盘旋转变换。',
          source: 'basics/colors/02-gradient-ring.glsl',
          params: [
            {
              name: 'u_speed',
              label: 'Speed',
              labelZh: '速度',
              min: 0,
              max: 5,
              step: 0.1,
              default: 1.0,
            },
            {
              name: 'u_hue_shift',
              label: 'Hue Shift',
              labelZh: '色相偏移',
              min: 0,
              max: 1,
              step: 0.01,
              default: 0.0,
            },
          ],
          presets: [
            { name: 'slow', nameZh: '慢速', values: { u_speed: 0.3, u_hue_shift: 0.0 } },
            { name: 'normal', nameZh: '正常', values: { u_speed: 1.0, u_hue_shift: 0.25 } },
            { name: 'fast', nameZh: '快速', values: { u_speed: 3.0, u_hue_shift: 0.5 } },
          ],
        },
        {
          id: 'mix-smoothstep',
          title: 'mix() vs smoothstep()',
          titleZh: 'mix 与 smoothstep 对比',
          description:
            'Side-by-side comparison of linear mix and smooth Hermite interpolation with edge coloring.',
          descriptionZh: '线性 mix 与 smoothstep 的直观对比，可调边缘着色。',
          source: 'basics/colors/03-mix-smoothstep.glsl',
          params: [
            {
              name: 'u_transition',
              label: 'Transition',
              labelZh: '过渡位置',
              min: 0,
              max: 1,
              step: 0.01,
              default: 0.5,
            },
            {
              name: 'u_color_a',
              label: 'Color A',
              labelZh: '颜色A',
              type: 'color',
              defaultColor: [0.05, 0.08, 0.25],
            },
            {
              name: 'u_color_b',
              label: 'Color B',
              labelZh: '颜色B',
              type: 'color',
              defaultColor: [0.9, 0.5, 0.3],
            },
          ],
          presets: [
            {
              name: 'default',
              nameZh: '默认',
              values: {
                u_transition: 0.5,
                u_color_a: [0.05, 0.08, 0.25],
                u_color_b: [0.9, 0.5, 0.3],
              },
            },
            {
              name: 'sunset',
              nameZh: '日落',
              values: { u_transition: 0.6, u_color_a: [0.1, 0.0, 0.2], u_color_b: [1.0, 0.4, 0.0] },
            },
            {
              name: 'ocean',
              nameZh: '海洋',
              values: { u_transition: 0.4, u_color_a: [0.0, 0.2, 0.3], u_color_b: [0.2, 0.7, 0.8] },
            },
          ],
        },
      ],
    },
    {
      id: 'coordinates',
      title: 'Coordinate Systems',
      titleZh: '坐标系变换',
      description: 'Polar coordinates and geometric transformations.',
      descriptionZh: '极坐标与几何变换的视觉呈现。',
      demos: [
        {
          id: 'polar-flower',
          title: 'Polar Flower',
          titleZh: '极坐标之花',
          description:
            'Beautiful polar-coordinate patterns with adjustable petal count and radius.',
          descriptionZh: '极坐标生成的美丽花纹图案，可调花瓣数和半径。',
          source: 'basics/coordinates/01-polar-flower.glsl',
          params: [
            {
              name: 'u_petals',
              label: 'Petals',
              labelZh: '花瓣数',
              min: 2,
              max: 16,
              step: 1,
              default: 6,
            },
            {
              name: 'u_radius',
              label: 'Radius',
              labelZh: '半径',
              min: 0.3,
              max: 1.5,
              step: 0.05,
              default: 1.0,
            },
          ],
          presets: [
            { name: 'rose', nameZh: '玫瑰', values: { u_petals: 5, u_radius: 1.0 } },
            { name: 'daisy', nameZh: '雏菊', values: { u_petals: 8, u_radius: 0.8 } },
            { name: 'sunflower', nameZh: '向日葵', values: { u_petals: 12, u_radius: 1.2 } },
          ],
        },
      ],
    },
    {
      id: 'fractals',
      title: 'Fractals',
      titleZh: '分形',
      description: 'Classic Mandelbrot and Julia sets with interactive zoom.',
      descriptionZh: '经典 Mandelbrot 和 Julia 集合，交互式缩放探索。',
      demos: [
        {
          id: 'mandelbrot',
          title: 'Mandelbrot Set',
          titleZh: 'Mandelbrot 集合',
          description: 'The iconic fractal with smooth coloring and real-time zoom.',
          descriptionZh: '标志性分形，平滑着色与实时缩放。',
          source: 'basics/fractals/01-mandelbrot.glsl',
          params: [
            {
              name: 'u_zoom',
              label: 'Zoom',
              labelZh: '缩放',
              min: 0.3,
              max: 4,
              step: 0.05,
              default: 1.2,
            },
            {
              name: 'u_iterations',
              label: 'Iterations',
              labelZh: '迭代次数',
              min: 20,
              max: 150,
              step: 1,
              default: 60,
            },
            {
              name: 'u_color_theme',
              label: 'Theme',
              labelZh: '配色主题',
              min: 0,
              max: 3,
              step: 1,
              default: 0,
            },
          ],
          presets: [
            {
              name: 'classic',
              nameZh: '经典',
              values: { u_zoom: 1.2, u_iterations: 60, u_color_theme: 0 },
            },
            {
              name: 'deep',
              nameZh: '深探',
              values: { u_zoom: 3.2, u_iterations: 120, u_color_theme: 1 },
            },
            {
              name: 'neon',
              nameZh: '霓虹',
              values: { u_zoom: 2.0, u_iterations: 80, u_color_theme: 2 },
            },
          ],
        },
        {
          id: 'julia',
          title: 'Julia Set',
          titleZh: 'Julia 集合',
          description: 'Animated Julia set with real-time constant C control via parameters.',
          descriptionZh: '动画 Julia 集合，参数控制实常数 C。',
          source: 'basics/fractals/02-julia.glsl',
          params: [
            {
              name: 'u_c_real',
              label: 'C Real',
              labelZh: 'C 实部',
              min: -1,
              max: 1,
              step: 0.01,
              default: -0.7,
            },
            {
              name: 'u_c_imag',
              label: 'C Imag',
              labelZh: 'C 虚部',
              min: -1,
              max: 1,
              step: 0.01,
              default: 0.27,
            },
            {
              name: 'u_zoom',
              label: 'Zoom',
              labelZh: '缩放',
              min: 0.5,
              max: 3,
              step: 0.05,
              default: 1.5,
            },
          ],
          presets: [
            {
              name: 'seahorse',
              nameZh: '海马',
              values: { u_c_real: -0.75, u_c_imag: 0.11, u_zoom: 1.8 },
            },
            {
              name: 'spiral',
              nameZh: '螺旋',
              values: { u_c_real: -0.7, u_c_imag: 0.27, u_zoom: 1.5 },
            },
            {
              name: 'dendrite',
              nameZh: '树突',
              values: { u_c_real: 0.28, u_c_imag: 0.008, u_zoom: 2.0 },
            },
          ],
        },
      ],
    },
    {
      id: 'lighting',
      title: 'Lighting & Materials',
      titleZh: '光照与材质',
      description: 'Physically-inspired light scattering and refraction effects.',
      descriptionZh: '物理启发的光散射与折射效果。',
      demos: [
        {
          id: 'water-droplet',
          title: 'Water Droplet',
          titleZh: '水滴折射',
          description:
            'Realistic water droplet with refraction, caustics, and adjustable drop size.',
          descriptionZh: '逼真水滴折射与焦散效果，可调水滴大小。',
          source: 'basics/lighting/03-water-droplet.glsl',
          params: [
            {
              name: 'u_refraction',
              label: 'Refraction',
              labelZh: '折射率',
              min: 0.5,
              max: 2.0,
              step: 0.05,
              default: 1.33,
            },
            {
              name: 'u_drop_size',
              label: 'Drop Size',
              labelZh: '水滴大小',
              min: 0.1,
              max: 0.6,
              step: 0.02,
              default: 0.25,
            },
          ],
          presets: [
            { name: 'water', nameZh: '水', values: { u_refraction: 1.33, u_drop_size: 0.25 } },
            { name: 'glass', nameZh: '玻璃', values: { u_refraction: 1.5, u_drop_size: 0.35 } },
            { name: 'diamond', nameZh: '钻石', values: { u_refraction: 2.0, u_drop_size: 0.18 } },
          ],
        },
      ],
    },
    {
      id: 'noise',
      title: 'Noise & Texture',
      titleZh: '噪声与纹理',
      description: 'Procedural noise techniques with domain warping for organic textures.',
      descriptionZh: '程序化噪声技法，域扭曲生成有机纹理。',
      demos: [
        {
          id: 'domain-warp',
          title: 'Domain Warp',
          titleZh: '域扭曲',
          description:
            'Fractal Brownian motion with multi-layer domain warping producing organic, marble-like textures.',
          descriptionZh: '多层域扭曲的分形布朗运动，产生有机大理石的纹理效果。',
          source: 'basics/noise/03-domain-warp.glsl',
          params: [
            {
              name: 'u_warp',
              label: 'Warp',
              labelZh: '扭曲强度',
              min: 0.2,
              max: 5,
              step: 0.1,
              default: 2.0,
            },
            {
              name: 'u_color1',
              label: 'Color 1',
              labelZh: '颜色1',
              type: 'color',
              defaultColor: [0.05, 0.08, 0.25],
            },
            {
              name: 'u_color2',
              label: 'Color 2',
              labelZh: '颜色2',
              type: 'color',
              defaultColor: [0.1, 0.4, 0.7],
            },
          ],
          presets: [
            {
              name: 'nebula',
              nameZh: '星云',
              values: { u_warp: 2.0, u_color1: [0.05, 0.08, 0.25], u_color2: [0.1, 0.4, 0.7] },
            },
            {
              name: 'marble',
              nameZh: '大理石',
              values: { u_warp: 1.5, u_color1: [0.9, 0.85, 0.8], u_color2: [0.4, 0.35, 0.3] },
            },
            {
              name: 'lava',
              nameZh: '熔岩',
              values: { u_warp: 3.0, u_color1: [0.8, 0.2, 0.0], u_color2: [1.0, 0.7, 0.0] },
            },
          ],
        },
      ],
    },
    {
      id: 'shapes',
      title: 'Signed Distance Functions',
      titleZh: '距离场形状',
      description: 'Geometric SDF compositions with soft shadows and edge effects.',
      descriptionZh: '几何距离场组合，软阴影与边缘效果。',
      demos: [
        {
          id: 'hexagon-ring',
          title: 'Hexagon Ring',
          titleZh: '六边形环',
          description: 'A rotating ring of hexagons with smooth blending and color cycling.',
          descriptionZh: '旋转的六边形环，平滑混合与颜色循环。',
          source: 'basics/shapes/03-hexagon-ring.glsl',
          params: [
            {
              name: 'u_ring_count',
              label: 'Ring Count',
              labelZh: '环数',
              min: 3,
              max: 12,
              step: 1,
              default: 6,
            },
            {
              name: 'u_rotation_speed',
              label: 'Rotation',
              labelZh: '旋转速度',
              min: 0,
              max: 3,
              step: 0.1,
              default: 0.5,
            },
            {
              name: 'u_accent_color',
              label: 'Accent',
              labelZh: '强调色',
              type: 'color',
              defaultColor: [0.8, 0.5, 0.9],
            },
          ],
          presets: [
            {
              name: 'honeycomb',
              nameZh: '蜂巢',
              values: { u_ring_count: 6, u_rotation_speed: 0.5, u_accent_color: [0.8, 0.5, 0.9] },
            },
            {
              name: 'wheel',
              nameZh: '轮盘',
              values: { u_ring_count: 8, u_rotation_speed: 1.2, u_accent_color: [0.2, 0.7, 0.9] },
            },
            {
              name: 'minimal',
              nameZh: '极简',
              values: { u_ring_count: 4, u_rotation_speed: 0.3, u_accent_color: [0.9, 0.6, 0.3] },
            },
          ],
        },
      ],
    },
  ],
};

registerCategory(basics);
```

</details>

- [ ] **Step 2: 更新 gradient-ring shader（补 hue_shift uniform）**

在 `src/shaders/basics/colors/02-gradient-ring.glsl` 的 uniform 声明区增加 `uniform float u_hue_shift;`，并在 main() 的 palette 函数中加上 hue_shift 偏移。

- [ ] **Step 3: 更新 polar-flower shader（补参数 uniform）**

在 `src/shaders/basics/coordinates/01-polar-flower.glsl` 顶部添加 `uniform float u_petals;` 和 `uniform float u_radius;`，在 main() 中使用这两个参数控制花瓣数和半径。

- [ ] **Step 4: 更新 mandelbrot shader（补参数 uniform）**

添加 `uniform float u_zoom; uniform float u_iterations; uniform float u_color_theme;`，在迭代循环中使用 `u_iterations`，缩放用 `u_zoom`，颜色主题用 `u_color_theme` 选择 3 套调色板。

- [ ] **Step 5: 更新 julia shader（补 c_real/c_imag/zoom uniform）**

添加 `uniform float u_c_real; uniform float u_c_imag; uniform float u_zoom;`，Julia 常数 C = (u_c_real, u_c_imag)，缩放用 u_zoom。

- [ ] **Step 6: 更新 water-droplet shader（补参数 uniform）**

添加 `uniform float u_refraction; uniform float u_drop_size;`，折射率和液滴半径参数化。

- [ ] **Step 7: 更新 domain-warp shader（补参数 uniform）**

添加 `uniform float u_warp; uniform vec3 u_color1; uniform vec3 u_color2;`，替换 hardcoded 颜色和 warp 值。

- [ ] **Step 8: 更新 hexagon-ring shader（补参数 uniform）**

添加 `uniform float u_ring_count; uniform float u_rotation_speed; uniform vec3 u_accent_color;`，替换 hardcoded 值。

注意：Steps 2-8 中修改的 shader 文件需保持 `check:shaders` 通过（不使用禁止关键词），参数名与 category 定义一致。

- [ ] **Step 9: Gate + commit**

```bash
npm run format && npm run lint && npx tsc -b && npm test && npm run check:shaders
git add src/shader/categories/basics.ts src/shaders/basics/
git commit -m "feat: basics gallery — cull to 8 demos, add params + presets"
```

---

### Task 4: paintings 展厅升级（现有 8 个交互重做）

**Files:**

- Modify: `src/shader/categories/paintings.ts` — 更新 8 个 demo 的参数定义
- Modify: 8 个 shader 文件（添加交互逻辑 + 新 uniform）

**Interfaces:**

- Consumes: Task 1 (params with color type), Task 2 (ColorSwatch in ShaderControls)
- Produces: 8 个 upgraded painting demos with interactive behaviors + ≥3 presets each

- [ ] **Step 1: 更新 paintings.ts 参数定义**

完整替换 `src/shader/categories/paintings.ts`。关键改动：

- starry-night: 加 `u_star_brightness`, `u_color_shift` 参数
- water-lilies: 加 `u_splash_radius`, `u_petal_color` (color) 参数
- impression-sunrise: 加 `u_sun_angle`, `u_glow_color` (color) 参数
- mondrian: **新增** `u_wander_speed`, `u_block_size` 参数（原零参数）
- kandinsky: **新增** `u_rotation`, `u_shape_count` 参数（原零参数）
- great-wave: 加 `u_foam_density`, `u_curl_sharpness` 参数
- rothko: 加 `u_breathe_size`, `u_mood_color` (color)
- pollock: 加 `u_splash_color` (color)

所有 demo 保持 `interactive` 标记。

<details>
<summary>展开完整 paintings.ts（8 个升级后 demo 的元数据）</summary>

```typescript
import { registerCategory } from '../registry';
import type { ShaderCategory } from '../types';

const paintings: ShaderCategory = {
  id: 'paintings',
  title: 'Painting Recreations',
  titleZh: '名画重现',
  description: 'Iconic masterpieces reinterpreted as interactive procedural shaders.',
  descriptionZh: '用程序化着色器重新诠释经典名画——让世界名画动起来。',
  cardType: 'shader',
  series: [
    {
      id: 'impressionism',
      title: 'Impressionism',
      titleZh: '印象派系列',
      description:
        'Procedural brushstrokes and dynamic lighting bring Impressionist masterpieces to life.',
      descriptionZh: '程序化笔触与动态光影，让印象派名作活起来。',
      demos: [
        {
          id: 'starry-night',
          title: 'Starry Night — Van Gogh',
          titleZh: '星月夜 — 梵高',
          description: 'Swirling night sky with mouse-trailing meteor streaks and breathing stars.',
          descriptionZh: '旋转星空，鼠标划过产生流星拖尾，星星随光标呼吸明灭。',
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
            {
              name: 'u_star_brightness',
              label: 'Stars',
              labelZh: '星光亮度',
              min: 0.3,
              max: 2,
              step: 0.05,
              default: 1.0,
            },
            {
              name: 'u_color_shift',
              label: 'Color Shift',
              labelZh: '色调偏移',
              min: 0,
              max: 1,
              step: 0.01,
              default: 0.0,
            },
          ],
          presets: [
            {
              name: 'calm',
              nameZh: '平静',
              values: { u_turbulence: 0.5, u_star_brightness: 0.7, u_color_shift: 0.0 },
            },
            {
              name: 'classic',
              nameZh: '原版',
              values: { u_turbulence: 1.5, u_star_brightness: 1.0, u_color_shift: 0.15 },
            },
            {
              name: 'storm',
              nameZh: '风暴',
              values: { u_turbulence: 2.8, u_star_brightness: 1.8, u_color_shift: 0.3 },
            },
          ],
          interactive: true,
        },
        {
          id: 'water-lilies',
          title: 'Water Lilies — Monet',
          titleZh: '睡莲 — 莫奈',
          description:
            'Click the water to generate expanding ripples; lily pads drift with the waves.',
          descriptionZh: '点击水面产生涟漪扩散，睡莲叶片随波漂移。',
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
            {
              name: 'u_splash_radius',
              label: 'Splash',
              labelZh: '溅射半径',
              min: 0.05,
              max: 0.4,
              step: 0.01,
              default: 0.15,
            },
            {
              name: 'u_petal_color',
              label: 'Petal',
              labelZh: '花瓣色调',
              type: 'color',
              defaultColor: [0.95, 0.75, 0.85],
            },
          ],
          presets: [
            {
              name: 'still',
              nameZh: '静止',
              values: { u_ripple: 0.2, u_splash_radius: 0.06, u_petal_color: [0.95, 0.85, 0.75] },
            },
            {
              name: 'gentle',
              nameZh: '微风',
              values: { u_ripple: 1.0, u_splash_radius: 0.15, u_petal_color: [0.95, 0.75, 0.85] },
            },
            {
              name: 'windy',
              nameZh: '有风',
              values: { u_ripple: 2.5, u_splash_radius: 0.3, u_petal_color: [1.0, 0.6, 0.7] },
            },
          ],
          interactive: true,
        },
        {
          id: 'impression-sunrise',
          title: 'Impression, Sunrise — Monet',
          titleZh: '日出·印象 — 莫奈',
          description: 'Mouse position controls the sun height and light angle in real-time.',
          descriptionZh: '鼠标位置控制太阳升降，光照角度实时变化。',
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
            {
              name: 'u_sun_angle',
              label: 'Sun Angle',
              labelZh: '太阳角度',
              min: 0,
              max: 1,
              step: 0.02,
              default: 0.5,
            },
            {
              name: 'u_glow_color',
              label: 'Glow',
              labelZh: '光晕色',
              type: 'color',
              defaultColor: [1.0, 0.7, 0.3],
            },
          ],
          presets: [
            {
              name: 'dawn',
              nameZh: '破晓',
              values: { u_mist: 1.5, u_sun_angle: 0.3, u_glow_color: [1.0, 0.5, 0.2] },
            },
            {
              name: 'morning',
              nameZh: '清晨',
              values: { u_mist: 1.0, u_sun_angle: 0.5, u_glow_color: [1.0, 0.7, 0.3] },
            },
            {
              name: 'noon',
              nameZh: '正午',
              values: { u_mist: 0.5, u_sun_angle: 0.8, u_glow_color: [1.0, 0.9, 0.6] },
            },
          ],
          interactive: true,
        },
      ],
    },
    {
      id: 'geometric',
      title: 'Geometric Abstraction',
      titleZh: '几何抽象系列',
      description:
        'Living geometry — Mondrian blocks drift and Kandinsky shapes dance with the cursor.',
      descriptionZh: '活的几何——蒙德里安色块游走，康定斯基图形随光标起舞。',
      demos: [
        {
          id: 'mondrian',
          title: 'Composition — Mondrian',
          titleZh: '红黄蓝构成 — 蒙德里安',
          description:
            'Primary-color rectangles slowly wander; drag the mouse to rebalance the composition.',
          descriptionZh: '三原色块随时间缓慢游走，鼠标拖拽重新平衡构图。',
          source: 'paintings/geometric/01-mondrian.glsl',
          params: [
            {
              name: 'u_wander_speed',
              label: 'Wander',
              labelZh: '游走速度',
              min: 0,
              max: 1.5,
              step: 0.05,
              default: 0.3,
            },
            {
              name: 'u_block_size',
              label: 'Block Size',
              labelZh: '色块大小',
              min: 0.7,
              max: 1.5,
              step: 0.02,
              default: 1.0,
            },
          ],
          presets: [
            { name: 'stable', nameZh: '稳定', values: { u_wander_speed: 0.1, u_block_size: 1.0 } },
            { name: 'drift', nameZh: '漂移', values: { u_wander_speed: 0.5, u_block_size: 1.0 } },
            { name: 'chaos', nameZh: '混沌', values: { u_wander_speed: 1.2, u_block_size: 1.3 } },
          ],
          interactive: true,
        },
        {
          id: 'kandinsky',
          title: 'Composition VIII — Kandinsky',
          titleZh: '构图 VIII — 康定斯基',
          description:
            'Circles and lines rotate and scale with mouse movement — a dynamic sculpture.',
          descriptionZh: '圆形和线条随鼠标旋转缩放——动态雕塑。',
          source: 'paintings/geometric/02-kandinsky.glsl',
          params: [
            {
              name: 'u_rotation',
              label: 'Rotation',
              labelZh: '旋转',
              min: -1,
              max: 1,
              step: 0.02,
              default: 0.0,
            },
            {
              name: 'u_shape_count',
              label: 'Density',
              labelZh: '图形密度',
              min: 5,
              max: 30,
              step: 1,
              default: 15,
            },
          ],
          presets: [
            { name: 'sparse', nameZh: '稀疏', values: { u_rotation: 0.2, u_shape_count: 8 } },
            { name: 'balanced', nameZh: '均衡', values: { u_rotation: 0.0, u_shape_count: 15 } },
            { name: 'dense', nameZh: '密集', values: { u_rotation: -0.3, u_shape_count: 25 } },
          ],
          interactive: true,
        },
      ],
    },
    {
      id: 'modern',
      title: 'Modern & Ukiyo-e',
      titleZh: '浮世绘与现代系列',
      description:
        'The Great Wave surges, Rothko breathes, and Pollock splatters — interactive modern art.',
      descriptionZh: '巨浪翻涌、色域呼吸、滴画泼溅——可交互的现代艺术。',
      demos: [
        {
          id: 'great-wave',
          title: 'The Great Wave — Hokusai',
          titleZh: '神奈川冲浪里 — 葛饰北斋',
          description:
            'Mouse movement whips up towering waves; foam density tracks cursor intensity.',
          descriptionZh: '鼠标移动掀起巨浪，浪花泡沫跟随光标强度变化。',
          source: 'paintings/modern/01-great-wave.glsl',
          params: [
            {
              name: 'u_wave_height',
              label: 'Wave',
              labelZh: '浪高',
              min: 0.5,
              max: 2.5,
              step: 0.1,
              default: 1.5,
            },
            {
              name: 'u_foam_density',
              label: 'Foam',
              labelZh: '泡沫密度',
              min: 0.1,
              max: 2,
              step: 0.05,
              default: 1.0,
            },
            {
              name: 'u_curl_sharpness',
              label: 'Sharpness',
              labelZh: '浪尖锐度',
              min: 0.5,
              max: 3,
              step: 0.1,
              default: 1.8,
            },
          ],
          presets: [
            {
              name: 'gentle',
              nameZh: '小浪',
              values: { u_wave_height: 0.8, u_foam_density: 0.4, u_curl_sharpness: 1.2 },
            },
            {
              name: 'classic',
              nameZh: '经典',
              values: { u_wave_height: 1.5, u_foam_density: 1.0, u_curl_sharpness: 1.8 },
            },
            {
              name: 'tsunami',
              nameZh: '巨浪',
              values: { u_wave_height: 2.3, u_foam_density: 1.8, u_curl_sharpness: 2.6 },
            },
          ],
          interactive: true,
        },
        {
          id: 'rothko',
          title: 'Color Fields — Rothko',
          titleZh: '色域画 — 罗斯科',
          description:
            'Color rectangles breathe (expand/contract) with mouse proximity; mood shifts with cursor.',
          descriptionZh: '色块随鼠标位置呼吸式膨胀收缩，情绪色调随光标变化。',
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
            {
              name: 'u_breathe_size',
              label: 'Breathe',
              labelZh: '呼吸幅度',
              min: 0,
              max: 0.1,
              step: 0.002,
              default: 0.04,
            },
            {
              name: 'u_mood_color',
              label: 'Mood',
              labelZh: '情绪色调',
              type: 'color',
              defaultColor: [0.7, 0.3, 0.2],
            },
          ],
          presets: [
            {
              name: 'calm',
              nameZh: '宁静',
              values: { u_shift: 0.0, u_breathe_size: 0.02, u_mood_color: [0.3, 0.4, 0.6] },
            },
            {
              name: 'warm',
              nameZh: '温暖',
              values: { u_shift: 0.03, u_breathe_size: 0.05, u_mood_color: [0.7, 0.3, 0.2] },
            },
            {
              name: 'intense',
              nameZh: '强烈',
              values: { u_shift: -0.05, u_breathe_size: 0.08, u_mood_color: [0.9, 0.2, 0.1] },
            },
          ],
          interactive: true,
        },
        {
          id: 'pollock',
          title: 'Drip Painting — Pollock',
          titleZh: '滴画 — 波洛克',
          description: 'Click to splatter new paint; drag to leave drip trails across the canvas.',
          descriptionZh: '点击泼溅新颜料，鼠标拖出流淌轨迹。',
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
            {
              name: 'u_splash_color',
              label: 'Splash',
              labelZh: '泼溅色',
              type: 'color',
              defaultColor: [0.9, 0.2, 0.1],
            },
          ],
          presets: [
            {
              name: 'sparse',
              nameZh: '稀疏',
              values: { u_density: 0.5, u_speed: 0.5, u_splash_color: [0.2, 0.5, 0.8] },
            },
            {
              name: 'medium',
              nameZh: '中等',
              values: { u_density: 1.0, u_speed: 1.0, u_splash_color: [0.9, 0.2, 0.1] },
            },
            {
              name: 'dense',
              nameZh: '密集',
              values: { u_density: 2.0, u_speed: 2.0, u_splash_color: [1.0, 0.7, 0.0] },
            },
          ],
          interactive: true,
        },
      ],
    },
  ],
};

registerCategory(paintings);
```

</details>

- [ ] **Step 2: 升级 8 个 shader 文件的交互逻辑**

依次修改以下 shader，每个都加入鼠标交互（`uniform vec2 u_mouse;` 已由 GLRenderer 自动注入 render loop 中）和新增参数 uniform。参考现有 shader 的代码风格。

重点：

- starry-night: 在 main() 中，根据 `u_mouse` 位置绘制流星拖尾（沿鼠标轨迹衰减的亮线）和星星明暗调制
- water-lilies: 使用环形 buffer 或简单的衰减数组追踪最近 N 次点击位置，生成涟漪环；莲花位置做 perlin 漂移
- impression-sunrise: 太阳 y 坐标 = u_sun_angle（由鼠标 y 控制），光照计算中太阳位置参数化
- mondrian: 色块中心位置 = 初始位置 + u_wander_speed * sin(time + per-block phase offset)，鼠标位置影响 wander 方向
- kandinsky: 图形旋转角度 = base + u_rotation * mouse.x，缩放 = 1 + mouse.y 偏移
- great-wave: 波浪高度 = u_wave_height + mouse 速度映射，泡沫密度调制
- rothko: 色块边界 = base + u_breathe_size * sin(time) * distance to mouse
- pollock: 存储鼠标点击位置，在附近生成 splatter 粒子，颜色用 u_splash_color

每个 shader 修改完成后运行 `npm run check:shaders` 确认不引入禁止关键词。

- [ ] **Step 3: Gate + commit**

```bash
npm run format && npm run lint && npx tsc -b && npm test && npm run check:shaders
git add src/shader/categories/paintings.ts src/shaders/paintings/
git commit -m "feat: paintings — interactive upgrades to all 8 demos"
```

---

### Task 5: paintings 新增 2 个 shader

**Files:**

- Create: `src/shaders/paintings/surrealism/01-dali-melting.glsl` — 达利·记忆的永恒
- Create: `src/shaders/paintings/secession/01-klimt-kiss.glsl` — 克里姆特·吻
- Modify: `src/shader/categories/paintings.ts` — 追加 2 个新 series + demo

**Interfaces:**

- Consumes: Task 1 (params), Task 4 (paintings category structure)
- Produces: 2 new painting demo entries + 2 new GLSL files

- [ ] **Step 1: 创建达利软钟 shader**

```glsl
// src/shaders/paintings/surrealism/01-dali-melting.glsl
// Dali — The Persistence of Memory (melting clocks)
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_melt_amount;
uniform vec3 u_clock_color;
uniform vec3 u_horizon_color;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = u_mouse * 2.0 - 1.0;

  // Horizon and desert ground
  float horizon = -0.25;
  float ground = smoothstep(horizon - 0.02, horizon, uv.y);
  vec3 sky = mix(vec3(0.85, 0.75, 0.55), vec3(0.95, 0.9, 0.8), uv.y * 0.5 + 0.5);
  vec3 groundCol = mix(vec3(0.6, 0.45, 0.3), u_horizon_color, 0.3);
  vec3 col = mix(sky, groundCol, ground);

  // Melting clock (rounded rectangle that droops)
  vec2 clockCenter = vec2(0.15, 0.08);
  // Melting distortion: noise field + mouse influence pushes the shape down
  float meltFactor = u_melt_amount * (0.8 + 0.4 * mouse.y);
  float clockDist = sdRoundedBox(uv - clockCenter, vec2(0.25, 0.08), 0.02);
  float melt = fbm((uv + vec2(0.3, 0.1)) * 6.0 + u_time * 0.1) * meltFactor;
  clockDist -= melt * 0.08;

  if (clockDist < 0.0) {
    col = mix(u_clock_color, vec3(0.95, 0.9, 0.8), -clockDist * 3.0);
  }

  // Second smaller clock in background
  vec2 clock2 = vec2(-0.25, 0.02);
  float d2 = sdRoundedBox(uv - clock2, vec2(0.15, 0.05), 0.01);
  float melt2 = fbm((uv + vec2(0.5, 0.8)) * 5.0 + u_time * 0.15) * meltFactor * 0.7;
  d2 -= melt2 * 0.05;
  if (d2 < 0.0) {
    col = mix(col, u_clock_color, 0.7);
  }

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 2: 创建克里姆特金箔 shader**

```glsl
// src/shaders/paintings/secession/01-klimt-kiss.glsl
// Klimt — The Kiss (gold leaf fragments)
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_sparkle_density;
uniform float u_gold_hue;
uniform float u_fragment_size;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = u_mouse * 2.0 - 1.0;

  // Warm gold background with abstract flowing patterns
  vec3 goldBase = mix(vec3(0.7, 0.5, 0.15), vec3(0.95, 0.8, 0.3), u_gold_hue);
  float bgPattern = noise(uv * 3.0 + u_time * 0.05) * 0.3;
  vec3 col = goldBase + bgPattern * 0.1;

  // Gold leaf fragments — cells of sparkle that rotate toward mouse
  float cellSize = u_fragment_size * 0.15;
  vec2 cellUV = uv / cellSize;
  vec2 cellId = floor(cellUV);
  vec2 cellF = fract(cellUV);

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 neighbor = cellId + vec2(float(x), float(y));
      float h = hash(neighbor);
      vec2 offset = vec2(hash(neighbor + 0.1), hash(neighbor + 0.2)) - 0.5;

      // Distance from mouse influences fragment brightness
      vec2 worldPos = (neighbor + offset) * cellSize;
      float distToMouse = length(worldPos - mouse * 0.8);
      float mouseAttract = smoothstep(0.5, 0.0, distToMouse);

      // Each fragment flickers independently
      float sparkle = sin(u_time * (3.0 + h * 5.0) + h * 20.0) * 0.5 + 0.5;
      sparkle = pow(sparkle, 4.0) * u_sparkle_density;

      float d = length(cellF - 0.5 - offset * 0.3) - 0.15;
      float shape = smoothstep(0.02, 0.0, d);
      col += goldBase * shape * (sparkle * 0.8 + mouseAttract * 0.6) * 0.5;
    }
  }

  // Abstract figure silhouettes (simplified organic curves) in warm dark tones
  float figure1 = smoothstep(0.02, 0.0, abs(uv.x + 0.1 + sin(uv.y * 4.0) * 0.1) - 0.03) *
                  smoothstep(-0.3, 0.3, uv.y);
  float figure2 = smoothstep(0.02, 0.0, abs(uv.x - 0.0 + cos(uv.y * 3.5) * 0.08) - 0.025) *
                  smoothstep(-0.35, 0.35, uv.y);
  vec3 figureCol = vec3(0.2, 0.1, 0.05);
  col = mix(col, figureCol, (figure1 + figure2) * 0.7);

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 3: 追加 category 元数据**

在 `paintings.ts` 的 `series` 数组末尾追加两个新 series：

```typescript
    {
      id: 'surrealism',
      title: 'Surrealism',
      titleZh: '超现实主义',
      description: 'Melting clocks and dream-logic distortions.',
      descriptionZh: '融化的时钟与梦的逻辑。',
      demos: [
        {
          id: 'dali-melting',
          title: 'The Persistence of Memory — Dali',
          titleZh: '记忆的永恒 — 达利',
          description: 'Melting clocks droop and distort; mouse proximity accelerates the melt.',
          descriptionZh: '软钟随鼠标融化变形，光标越近融化越快。',
          source: 'paintings/surrealism/01-dali-melting.glsl',
          params: [
            { name: 'u_melt_amount', label: 'Melt', labelZh: '融化程度', min: 0, max: 1, step: 0.02, default: 0.5 },
            { name: 'u_clock_color', label: 'Clock', labelZh: '钟面色', type: 'color', defaultColor: [0.9, 0.85, 0.7] },
            { name: 'u_horizon_color', label: 'Horizon', labelZh: '地平线色', type: 'color', defaultColor: [0.55, 0.4, 0.25] },
          ],
          presets: [
            { name: 'solid', nameZh: '坚硬', values: { u_melt_amount: 0.15, u_clock_color: [0.9, 0.85, 0.7], u_horizon_color: [0.55, 0.4, 0.25] } },
            { name: 'soften', nameZh: '软化', values: { u_melt_amount: 0.5, u_clock_color: [0.85, 0.8, 0.65], u_horizon_color: [0.5, 0.35, 0.2] } },
            { name: 'melted', nameZh: '融尽', values: { u_melt_amount: 0.9, u_clock_color: [0.7, 0.65, 0.5], u_horizon_color: [0.4, 0.3, 0.2] } },
          ],
          interactive: true,
        },
      ],
    },
    {
      id: 'secession',
      title: 'Vienna Secession',
      titleZh: '维也纳分离派',
      description: 'Gold leaf fragments shimmer and gather around the cursor.',
      descriptionZh: '金箔碎片随鼠标闪烁聚拢。',
      demos: [
        {
          id: 'klimt-kiss',
          title: 'The Kiss — Klimt',
          titleZh: '吻 — 克里姆特',
          description: 'Golden fragments sparkle and drift toward the mouse; abstract figures in warm embrace.',
          descriptionZh: '金箔碎片闪烁并向光标聚拢，抽象人形在暖色调中相拥。',
          source: 'paintings/secession/01-klimt-kiss.glsl',
          params: [
            { name: 'u_sparkle_density', label: 'Sparkle', labelZh: '闪光密度', min: 0.2, max: 2, step: 0.05, default: 1.0 },
            { name: 'u_gold_hue', label: 'Gold', labelZh: '金色调', min: 0, max: 1, step: 0.02, default: 0.5 },
            { name: 'u_fragment_size', label: 'Fragment', labelZh: '碎片大小', min: 0.5, max: 2, step: 0.05, default: 1.0 },
          ],
          presets: [
            { name: 'subtle', nameZh: '含蓄', values: { u_sparkle_density: 0.5, u_gold_hue: 0.3, u_fragment_size: 0.7 } },
            { name: 'opulent', nameZh: '华丽', values: { u_sparkle_density: 1.2, u_gold_hue: 0.5, u_fragment_size: 1.0 } },
            { name: 'dazzling', nameZh: '炫目', values: { u_sparkle_density: 1.8, u_gold_hue: 0.7, u_fragment_size: 1.5 } },
          ],
          interactive: true,
        },
      ],
    },
```

- [ ] **Step 4: shader 验证 + gate + commit**

```bash
npm run check:shaders
npm run format && npm run lint && npx tsc -b && npm test
git add src/shaders/paintings/surrealism/ src/shaders/paintings/secession/ src/shader/categories/paintings.ts
git commit -m "feat: paintings — Dali melting clocks + Klimt gold leaf shaders"
```

---

### Task 6: effects 深度重做（4 个）

**Files:**

- Modify: `src/shader/categories/effects.ts` — 更新 4 个 demo 的参数定义
- Modify: 4 个 shader 文件完全重写（`src/shaders/effects/`）

**Interfaces:**

- Consumes: Task 1, Task 2 (color params)
- Produces: 4 rewritten effects demos with exhibition-level visuals

- [ ] **Step 1: 重写效果 —— mouse-particles（星云漩涡）**

在 `src/shaders/effects/particles/01-mouse-particles.glsl` 中改写为多彩粒子群 + 引力/斥力双模式：

核心逻辑：使用 hash/position-from-id 抖动分布在屏幕的 N 个粒子，每个粒子有独立的 phase 和 color index。根据 `u_attract_repel` 值（<0.5 引力, ≥0.5 斥力），粒子向鼠标加速或远离。粒子大小随距离调制，拖尾用指数衰减的 alpha 累积。

- [ ] **Step 2: 重写效果 —— flow-field（极光流场）**

重写 `src/shaders/effects/particles/02-flow-field.glsl`。核心：使用多层 FBM 噪声生成矢量场，采样精度由 `u_density` 控制；数千条流线的起点固定，沿流场步进。颜色沿流线从暖渐变到冷（通过 `u_color_theme` float 选择 4 套调色板）。鼠标位置扭曲局部流场方向。

- [ ] **Step 3: 重写效果 —— ink-diffusion（水墨画）**

重写 `src/shaders/effects/fluids/01-ink-diffusion.glsl`。核心：多色墨滴（通过储存在纹理或数组中的历史滴位置 + 扩散时间），每个墨滴向外扩散的 Gaussian kernel + noise perturbation。纸张纹理用高频 FBM noise 叠加。点击时以鼠标位置为中心生成新墨滴（用 `u_mouse` 的 delta 检测点击）。`u_ink_color` (vec3) 控制当前墨色，预设包含墨黑、青蓝、朱砂红。

- [ ] **Step 4: 重写效果 —— game-of-life（生态演化）**

重写 `src/shaders/effects/organic/01-game-of-life.glsl`。核心：在单 channel float 纹理上存储多物种（用值区间编码物种类型）。每帧采样邻居计数，不同物种有不同的存活/繁殖规则。`u_species_colors` 用单个 float 循环选择 3 套物种颜色。点击播种新细胞。演化速度由 `u_evolution_speed` 的 time 乘数控制。

- [ ] **Step 5: 更新 effects.ts 元数据**

更新 `src/shader/categories/effects.ts`，每 demo 补齐/替换参数字段。新增参数包括：

- mouse-particles: `u_attract_repel`, `u_particle_count`, `u_color_theme`, `u_trail_length`
- flow-field: `u_density`, `u_noise_scale`, `u_flow_speed`, `u_color_theme`
- ink-diffusion: `u_viscosity`, `u_ink_color` (color), `u_drop_spread`, `u_paper_texture`
- game-of-life: `u_grid_scale`, `u_evolution_speed`, `u_species_colors`

每个 demo ≥3 个预设。全部 `interactive: true`。

- [ ] **Step 6: Gate + commit**

```bash
npm run check:shaders && npm run format && npm run lint && npx tsc -b && npm test
git add src/shader/categories/effects.ts src/shaders/effects/
git commit -m "feat: effects — deep rewrite for exhibition-level visuals"
```

---

### Task 7: effects 新增 2 个 shader

**Files:**

- Create: `src/shaders/effects/reaction/01-reaction-diffusion.glsl` — Gray-Scott 反应扩散
- Create: `src/shaders/effects/reaction/02-fractal-flame.glsl` — 分形火焰
- Modify: `src/shader/categories/effects.ts` — 追加 series

**Interfaces:**

- Consumes: Task 6 (effects category structure)
- Produces: 2 new effects demos

- [ ] **Step 1: 创建反应扩散 shader**

Gray-Scott 模型的核心：两个化学物质 U 和 V 的反应扩散。使用多 pass 渲染（或单 pass 近似——用 space 维度离散化的像素邻域 Laplacian）。参数：`u_feed_rate`, `u_kill_rate`, `u_diffusion_speed`。鼠标位置注入 U 浓度扰动。产生珊瑚/斑马纹/豹纹等有机图案。

```glsl
// src/shaders/effects/reaction/01-reaction-diffusion.glsl
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_feed_rate;
uniform float u_kill_rate;
uniform float u_diffusion_speed;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 texel = 1.0 / u_resolution;

  // Seed pattern with noise — the reaction-diffusion "initial conditions"
  float n = hash(floor(uv * 200.0));
  float u_conc = n;
  float v_conc = n * 0.5 + 0.25;

  // Simplified single-pass Laplacian (neighbor sampling approximation)
  // In a full implementation, this would use a ping-pong FBO.
  // Here we generate a static-like texture that resembles RD patterns
  // via iterated local averaging + thresholding.
  float sum = 0.0;
  for (int dx = -2; dx <= 2; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      sum += hash(floor((uv + vec2(float(dx), float(dy))) * 200.0 + u_time * 0.01));
    }
  }
  sum /= 15.0;

  float reaction = u_conc * v_conc * v_conc;
  float du = u_diffusion_speed * (sum - u_conc) - reaction + u_feed_rate * (1.0 - u_conc);
  float dv = u_diffusion_speed * 0.5 * (sum - v_conc) + reaction - (u_feed_rate + u_kill_rate) * v_conc;

  float pattern = du + dv;
  pattern = smoothstep(0.3, 0.7, pattern);

  // Mouse injects perturbation
  float mouseDist = length(uv - u_mouse);
  float inject = exp(-mouseDist * 15.0) * 0.5;
  pattern = mix(pattern, 1.0 - pattern, inject);

  // Colorize based on pattern morphology
  vec3 spots = mix(vec3(0.1, 0.05, 0.02), vec3(0.9, 0.85, 0.7), pattern);
  vec3 stripes = mix(vec3(0.02, 0.05, 0.1), vec3(0.95, 0.92, 0.85), smoothstep(0.4, 0.6, pattern + 0.1 * sin(uv.x * 50.0)));

  float morph = sin(u_time * 0.1) * 0.5 + 0.5;
  vec3 col = mix(spots, stripes, morph);

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 2: 创建分形火焰 shader**

多层分形噪声叠加，从底部的深红色过渡到顶部的亮黄/白色。火焰中心亮度高、边缘暗。热浪扭曲：在采样坐标上叠加小幅度高频噪声扰动。

```glsl
// src/shaders/effects/reaction/02-fractal-flame.glsl
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_flame_height;
uniform float u_turbulence;
uniform float u_smoke_amount;
uniform float u_wind;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 mouse = u_mouse;

  // Flame base center follows mouse X
  float flameCenter = mouse.x * 0.6 + 0.5;
  uv.x += (flameCenter - 0.5) * 0.3;

  // Wind pushes flame sideways
  uv.x += u_wind * uv.y * uv.y;

  // Vertical flame profile
  float flameShape = 1.0 - uv.y / u_flame_height;
  flameShape = clamp(flameShape, 0.0, 1.0);

  // Width narrows toward top (teardrop shape)
  float widthAtY = 0.12 + flameShape * 0.08;
  float distFromCenter = abs(uv.x - 0.5);
  float inFlame = smoothstep(widthAtY, widthAtY - 0.03, distFromCenter);

  // Turbulence distortion (heat shimmer)
  float turb = fbm(uv * vec2(12.0, 8.0) + u_time * 0.3) * u_turbulence * flameShape;
  inFlame += turb * 0.08;

  inFlame = clamp(inFlame, 0.0, 1.0);

  // Layered fractal detail
  float detail = fbm(uv * vec2(20.0, 15.0) + u_time * 0.5 + turb * 3.0) * flameShape;
  float core = smoothstep(0.0, 0.4, flameShape) * (1.0 - distFromCenter / 0.05);

  // Color: bottom = deep red, middle = orange, top = yellow/white
  vec3 innerColor = vec3(1.0, 0.95, 0.7);
  vec3 midColor = vec3(1.0, 0.4, 0.05);
  vec3 outerColor = vec3(0.7, 0.1, 0.0);

  float colorT = flameShape; // 0 at top, 1 at bottom
  colorT += detail * 0.3;
  vec3 flameCol = mix(innerColor, midColor, smoothstep(0.3, 0.6, colorT));
  flameCol = mix(flameCol, outerColor, smoothstep(0.6, 0.9, colorT));
  flameCol *= 0.8 + core * 0.4;

  // Smoke above flame
  float smoke = (uv.y > u_flame_height) ?
    fbm(uv * 5.0 + u_time * 0.2 + vec2(u_wind * uv.y, 0.0)) * u_smoke_amount * smoothstep(u_flame_height, 1.0, uv.y) : 0.0;

  vec3 bg = vec3(0.02, 0.01, 0.03);
  vec3 col = mix(bg, flameCol, inFlame);
  col = mix(col, vec3(0.1, 0.08, 0.06), smoke);

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 3: 追加 effects.ts category 元数据**

```typescript
    {
      id: 'reaction',
      title: 'Reaction-Diffusion',
      titleZh: '反应扩散系统',
      description: 'Gray-Scott model producing coral, zebra stripes, and leopard spots.',
      descriptionZh: 'Gray-Scott 模型，产生珊瑚、斑马纹和豹斑等有机图案。',
      demos: [
        {
          id: 'reaction-diffusion',
          title: 'Reaction-Diffusion Patterns',
          titleZh: '反应扩散图案',
          description: 'Organic Turing patterns — inject chemical perturbations with the mouse.',
          descriptionZh: '有机图灵图案——鼠标注入化学扰动。',
          source: 'effects/reaction/01-reaction-diffusion.glsl',
          params: [
            { name: 'u_feed_rate', label: 'Feed Rate', labelZh: '供给率', min: 0.01, max: 0.1, step: 0.002, default: 0.055 },
            { name: 'u_kill_rate', label: 'Kill Rate', labelZh: '消耗率', min: 0.03, max: 0.08, step: 0.001, default: 0.062 },
            { name: 'u_diffusion_speed', label: 'Diffusion', labelZh: '扩散速度', min: 0.5, max: 3, step: 0.1, default: 1.5 },
          ],
          presets: [
            { name: 'coral', nameZh: '珊瑚', values: { u_feed_rate: 0.055, u_kill_rate: 0.062, u_diffusion_speed: 1.5 } },
            { name: 'zebra', nameZh: '斑马', values: { u_feed_rate: 0.035, u_kill_rate: 0.065, u_diffusion_speed: 2.0 } },
            { name: 'spots', nameZh: '豹纹', values: { u_feed_rate: 0.04, u_kill_rate: 0.06, u_diffusion_speed: 1.0 } },
          ],
          interactive: true,
        },
        {
          id: 'fractal-flame',
          title: 'Fractal Flame',
          titleZh: '分形火焰',
          description: 'Multi-layer fractal noise flame with heat shimmer and wind-driven smoke.',
          descriptionZh: '多层分形噪声火焰，带热浪扭曲和风驱烟尘。',
          source: 'effects/reaction/02-fractal-flame.glsl',
          params: [
            { name: 'u_flame_height', label: 'Height', labelZh: '火焰高度', min: 0.3, max: 1.2, step: 0.02, default: 0.7 },
            { name: 'u_turbulence', label: 'Turbulence', labelZh: '湍流', min: 0.2, max: 2, step: 0.05, default: 1.0 },
            { name: 'u_smoke_amount', label: 'Smoke', labelZh: '烟雾', min: 0, max: 1.5, step: 0.05, default: 0.4 },
            { name: 'u_wind', label: 'Wind', labelZh: '风', min: -0.5, max: 0.5, step: 0.02, default: 0.0 },
          ],
          presets: [
            { name: 'candle', nameZh: '烛火', values: { u_flame_height: 0.4, u_turbulence: 0.5, u_smoke_amount: 0.1, u_wind: 0.0 } },
            { name: 'campfire', nameZh: '篝火', values: { u_flame_height: 0.7, u_turbulence: 1.0, u_smoke_amount: 0.4, u_wind: 0.0 } },
            { name: 'inferno', nameZh: '烈焰', values: { u_flame_height: 1.0, u_turbulence: 1.8, u_smoke_amount: 0.8, u_wind: 0.1 } },
          ],
          interactive: true,
        },
      ],
    },
```

- [ ] **Step 4: Gate + commit**

```bash
npm run check:shaders && npm run format && npm run lint && npx tsc -b && npm test
git add src/shaders/effects/reaction/ src/shader/categories/effects.ts
git commit -m "feat: effects — reaction-diffusion + fractal flame shaders"
```

---

### Task 8: filters 重写（6 个）

**Files:**

- Modify: `src/shader/categories/filters.ts` — 更新 6 个 demo 参数（增加参数）
- Modify: 6 个 shader 文件（`src/shaders/filters/`）全部重写

**Interfaces:**

- Consumes: Task 1 (color params), Task 2 (ColorSwatch in room variant)
- Produces: 6 rewritten filter demos at exhibition quality

filter shader 的特殊约束：必须声明 `uniform sampler2D u_texture;` 供 GLRenderer 注入摄像头纹理；必须声明 `uniform vec2 u_videoSize;` 供纹理坐标归一化（GLRenderer 自动注入）。

- [ ] **Step 1: 重写 grayscale（专业 B&W）**

核心：彩色→灰度转换权重 = (u_red_weight, u_green_weight, u_blue_weight) 作为三通道 dot product。加 film grain（hash noise 调制）、暗角（径向亮度衰减 `1.0 - smoothstep(0.5, 1.5, dist) * u_vignette`）、对比度曲线（S-curve via `smoothstep` 或 `pow`）。

<details>
<summary>经典 B&W 完整 shader</summary>

```glsl
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_videoSize;
uniform float u_red_weight;
uniform float u_green_weight;
uniform float u_blue_weight;
uniform float u_grain;
uniform float u_vignette;
uniform float u_contrast;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_videoSize;
  vec3 tex = texture2D(u_texture, uv).rgb;

  // Weighted grayscale
  float gray = dot(tex, vec3(u_red_weight, u_green_weight, u_blue_weight));

  // Contrast S-curve
  gray = smoothstep(0.0, 1.0, (gray - 0.5) * (1.0 + u_contrast) + 0.5);

  // Film grain
  gray += (hash(uv * u_videoSize + fract(u_blue_weight * 100.0)) - 0.5) * u_grain * 0.15;

  // Vignette
  float dist = length(uv - 0.5) * 1.4;
  gray *= 1.0 - smoothstep(0.3, 1.0, dist) * u_vignette;

  vec3 col = vec3(clamp(gray, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
```

</details>

- [ ] **Step 2: 重写 sepia（时光胶囊）**

在现有 sepia 基础上加：彩色→sepia 矩阵变换 + 胶片划痕（基于 `fract(uv.y * u_videoSize.y + hash(floor(uv.y * 200.0)) * 100.0)` 的垂直短线）+ 漏光（顶部/边缘的暖色渐变光晕）+ 边缘褪色（四角 desaturation）。参数：`u_strength`, `u_grain`, `u_vignette`, `u_scratch_amount`。

- [ ] **Step 3: 重写 edge-detect（多风格线条）**

使用 Sobel 算子（8 邻域采样）检测边缘。新增 4 种渲染风格由 `u_style` (0-3) 选择：铅笔（灰白渐变 + grain）、墨水（纯黑线条 + 白色背景 on/off via `u_bg_alpha`）、霓虹（glow via smoothstep + `u_line_color` 发光）、粉笔（噪声调制的粗线 + 深色板背景）。参数：`u_threshold`, `u_line_color` (color), `u_bg_alpha`, `u_style`。

- [ ] **Step 4: 重写 halftone（CMYK 套印）**

将亮度值量化为网点。CMYK 四色（青、品、黄、黑）各使用不同的网角（0°, 15°, 45°, 75°）。网点形状由 `u_dot_shape` (0=圆, 1=菱形, 2=线) 选择。纸张纹理：`hash(uv * 500.0) * 0.03` 模拟纸纤维。参数：`u_dot_size`, `u_angle`, `u_dot_shape`, `u_paper_color` (color)。

- [ ] **Step 5: 重写 kaleidoscope（专业万花筒）**

核心：将 uv 坐标按 `u_slices` 折叠为楔形扇形区域 → 对各楔形做反射/旋转/蝴蝶式镜像。实现 3 种镜像模式（`u_mirror_mode` 0-2）。边缘柔化：楔形边界做 smoothstep。色彩增强：`rgb = mix(rgb, rgb * brightness, u_saturation)`。参数：`u_slices`, `u_rotation`, `u_saturation`, `u_mirror_mode`。

- [ ] **Step 6: 重写 glitch（赛博朋克故障）**

多层故障效果叠加：RGB channel split（红/绿/蓝通道水平位移，位移量 = `u_intensity * hash(floor(uv.y * lines))`），scanlines（`sin(uv.y * u_videoSize.y * 0.5) * 0.03`），像素排序（在随机行上沿 x 轴按亮度排序——用 `texture2D` 多次采样取中值），hue cycling（`hue += u_hue_shift * uv.y`）。参数：`u_intensity`, `u_scanline_amount`, `u_hue_shift`, `u_glitch_density`。

- [ ] **Step 7: 更新 filters.ts 元数据**

更新 `src/shader/categories/filters.ts` 中 6 个 demo 的参数定义，加上上述新参数。保留现有的 3 个 series 结构不变。

- [ ] **Step 8: Gate + commit**

```bash
npm run check:shaders && npm run format && npm run lint && npx tsc -b && npm test
git add src/shader/categories/filters.ts src/shaders/filters/
git commit -m "feat: filters — rewrite 6 demos for professional quality"
```

---

### Task 9: nebula-light 重做（晨光大理石）

**Files:**

- Modify: `src/shaders/background/nebula-light.glsl` — 完全重写

**Interfaces:**

- Consumes: 现有 EntryHall（不改动），只替换 shader 内容
- Produces: 晨光大理石 shader

- [ ] **Step 1: 完全重写 nebula-light.glsl**

```glsl
// "Morning Marble" — museum entrance background
// Multi-layer FBM with vein-like domain warping, paper-tone palette.
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
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  uv *= 1.8;

  // Very slow drift
  float drift = u_time * 0.015;

  // Domain warping for vein-like marble patterns
  vec2 q = vec2(
    fbm(uv + vec2(0.5, 2.0) * drift),
    fbm(uv + vec2(2.0, 0.5) * drift)
  );

  vec2 r = vec2(
    fbm(uv + 1.5 * q + vec2(1.7, 9.2) * drift),
    fbm(uv + 1.5 * q + vec2(8.3, 2.8) * drift)
  );

  float marble = fbm(uv + 2.0 * r);

  // Soften and remap for subtle paper texture
  marble = smoothstep(0.15, 0.85, marble);

  // Paper-tone palette: ivory white base (#f7f4ee) with warm gray veins
  vec3 ivory = vec3(0.969, 0.957, 0.933);     // #f7f4ee
  vec3 warmGray = vec3(0.875, 0.851, 0.804);   // #dfd9cd
  vec3 veinGold = vec3(0.831, 0.741, 0.631);   // #d4bda1
  vec3 deepVein = vec3(0.765, 0.710, 0.663);   // #c3b5a9

  // Blend layers based on marble value
  float v1 = smoothstep(0.35, 0.55, marble);
  float v2 = smoothstep(0.45, 0.6, marble);
  float v3 = smoothstep(0.5, 0.65, marble);

  vec3 col = mix(ivory, warmGray, v1 * 0.4);
  col = mix(col, veinGold, v2 * 0.25);
  col = mix(col, deepVein, v3 * 0.15);

  // Subtle grain texture overlay
  float grain = hash(uv * 800.0 + drift * 10.0) * 0.015;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 2: 验证 + gate + commit**

```bash
npm run check:shaders
npm run format && npm run lint && npx tsc -b && npm test
git add src/shaders/background/nebula-light.glsl
git commit -m "feat: nebula-light — morning marble entrance shader"
```

---

### Task 10: 测试

**Files:**

- Modify: `tests/unit/ShaderControls.test.tsx` — 追加颜色参数 UI 测试
- Modify: `tests/e2e/smoke.spec.ts` — 扩展 e2e flow
- Create: `tests/unit/colorParams.test.ts` — (Task 1 已创建)
- Create: `tests/unit/ColorSwatch.test.tsx` — (Task 2 已创建)

**Interfaces:**

- Consumes: Task 2 (ColorSwatch), Task 3-9 (shader content)
- Produces: 测试覆盖颜色参数 UI + e2e 博物馆全流程验证

- [ ] **Step 1: 扩展 ShaderControls 测试（颜色参数渲染）**

在 `tests/unit/ShaderControls.test.tsx` 追加：

```typescript
it('renders ColorSwatch for color-type params', () => {
  const colorParams: ShaderParam[] = [
    { name: 'u_tint', label: 'Tint', labelZh: '色调', type: 'color', defaultColor: [0.8, 0.3, 0.5] },
  ];
  const values: Record<string, number | [number, number, number]> = { u_tint: [0.8, 0.3, 0.5] };
  const onParamChange = vi.fn();
  const { container } = render(
    <ShaderControls
      params={colorParams}
      presets={[]}
      values={values}
      onParamChange={onParamChange}
      onPresetSelect={vi.fn()}
      activePreset={null}
      lang="en"
    />,
  );
  expect(container.querySelector('.color-swatch__chip')).toBeTruthy();
});

it('calls onParamChange with color array when color slider changes', () => {
  const colorParams: ShaderParam[] = [
    { name: 'u_tint', label: 'Tint', labelZh: '色调', type: 'color', defaultColor: [0.5, 0.5, 0.5] },
  ];
  const values: Record<string, number | [number, number, number]> = { u_tint: [0.5, 0.5, 0.5] };
  const onParamChange = vi.fn();
  const { container } = render(
    <ShaderControls
      params={colorParams}
      presets={[]}
      values={values}
      onParamChange={onParamChange}
      onPresetSelect={vi.fn()}
      activePreset={null}
      lang="en"
    />,
  );
  fireEvent.click(container.querySelector('.color-swatch__chip')!);
  const redSlider = container.querySelector('input[name="red"]')!;
  fireEvent.change(redSlider, { target: { value: '0.9' } });
  expect(onParamChange).toHaveBeenCalledWith('u_tint', [0.9, 0.5, 0.5]);
});
```

- [ ] **Step 2: 扩展 e2e**

在 `tests/e2e/smoke.spec.ts` 中追加或修改测试：

- 打开 gallery 后验证至少 4 个展厅 section 渲染（`.gallery-section` count ≥ 4）
- 点击第一个 painting 卡片 → FocusRoom 打开 → 验证 `data-testid="focus-room"` 可见 → 滑动某个 slider 参数 → Escape 关闭
- 切换到中文（`i18n.changeLanguage('zh')` 或通过导航按钮点击语言切换）→ 验证馆名/展厅 kicker 变为中文

已有 3 个 e2e 测试保持；扩展内容确保不破坏现有 assert。

- [ ] **Step 3: 运行全量测试**

```bash
npm test && npm run test:e2e
```

Expected: 全部通过（单测文件数增加 1，测试数增加 ColorSwatch + ShaderControls color 测试）

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test: color param UI tests + e2e museum flow extension"
```

---

### Task 11: 全门链收口

**Files:**

- Modify: `src/i18n/index.ts` — 可能需要补新增的 i18n key（如有）

**Verification only — no new feature code.**

- [ ] **Step 1: 全量 shader 验证**

```bash
npm run check:shaders
```

确保所有新建/修改的 shader 不含 `varying`, `#version`, `iTime`, `iResolution`, `iMouse`。

- [ ] **Step 2: 全量代码质量**

```bash
npm run format
npm run lint
npx tsc -b
```

全部 exit 0。

- [ ] **Step 3: 全量测试**

```bash
npm test
npm run test:e2e
```

全部通过。

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

Exit 0，产物正常。

- [ ] **Step 5: 零 `!` 审计**

```bash
grep -rn '!\s*\.' src/ --include="*.ts" --include="*.tsx" | grep -v '//\|\.d\.ts'
grep -rn 'eslint-disable' src/ tests/
```

Both must be empty.

- [ ] **Step 6: 全门链一次提交（如还有未提交改动）**

```bash
git status
# if dirty:
git add -A && git commit -m "chore: full gate verification pass"
```

- [ ] **Step 7: 人工视觉走查清单**（`npm run dev` 后在浏览器逐项确认）

1. 入口大厅：晨光大理石 shader 背景、衬线馆名清晰可见
2. 第一展厅 basics：8 张卡片、每张有参数滑杆+预设、颜色参数有色块选择器
3. 第二展厅 paintings：10 张卡片、鼠标交互（拖/点/移动）均有视觉反馈
4. 第三展厅 effects：6 张卡片、粒子/流场/火焰等动画流畅
5. 第四展厅 filters：6 张卡片、摄像头开启后滤镜实时生效
6. FocusRoom 中颜色参数取色器正常、滑杆/预设正常
7. 中英文切换：全量文案切换正确
8. 移动端：单列网格、参数区可操作

---
