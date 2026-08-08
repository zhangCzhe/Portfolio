# 子项目 1：工程基线 + 渲染引擎重构 — 设计文档

日期：2026-08-08
状态：已经过 brainstorming 逐节确认，待用户最终审阅

## 背景与总目标

shader-portfolio（React 19 + TypeScript + Vite 8 + Tailwind v4 + WebGL2）彻底重构，核心目的是**视觉表现向求职作品集**：shader 效果、设计感、交互体验第一优先，代码质量达到工程级别。

### 全局决策（brainstorming 已确认）

- **设计方向**：明亮美术馆 —— 纸白底色、衬线排印、画作式装裱卡片；**浅色唯一主题**
- **信息架构**：单页画廊 + 点击展品进入全屏"展厅模式" overlay（大画布 + 参数面板 + 策展文案 + 代码），展厅模式是全站唯一暗空间
- **Shader 范围**：视觉质量升级 + 性能优化 + 新增高级效果 + 交互参数化
- **内容策展**：40+ shader 精选至 24-30 件（每展厅 6-8 件）
- **子项目拆分与顺序**：
  1. **工程基线 + 渲染引擎重构**（本文档）
  2. 美术馆设计系统 + 站点重构（依赖 1 的稳定接口）
  3. Shader 内容升级 + 参数系统（依赖 1 的引擎与 2 的 UI 组件）

### 本子项目的目标

把渲染层重写为分层、可测试的引擎，建立 strict TS / lint / format / 测试 / CI 工程基线，并落地性能治理（画质分级 + 自适应降质）。**对外行为完全不变**——纯内部重构，视觉变化留给子项目 2。

## 1. 工程基线

### TypeScript 严格化
- `tsconfig.app.json` 开启 `strict: true` 与 `noUncheckedIndexedAccess: true`
- 消除全部 `!` 非空断言（现状：`src/utils/webgl.ts:54`、`src/shader/WebGLRenderer.ts:157` 等）
- 消除全部 `eslint-disable` 注释（`ShaderCanvas.tsx:124`、`WebcamCapture.tsx:175`、`ShaderCodeEditor.tsx:92`、`CanvasPool.ts:78`、`useShaderSource.ts:15`）——正确补全 effect 依赖数组，而不是禁用规则

### 格式化与 lint
- 保留 oxlint（已配置），新增 Prettier 管格式化
- Prettier 配置：`{ "singleQuote": true, "semi": true, "printWidth": 100 }`（贴合现有风格）
- package.json 新增 scripts：`format`、`format:check`、`typecheck`、`test`、`test:e2e`

### 测试框架
- Vitest：引擎纯逻辑单测
- Playwright：真实浏览器（SwiftShader 软渲染 WebGL）冒烟测试

### CI 增强（`.github/workflows/deploy.yml`）
- 部署前加 quality gate 任务：`lint → typecheck → 单测 → build → 冒烟`
- Node 20 → 22，加 npm 缓存
- 现有 `check:shaders` 脚本纳入 CI

### 明确不做
- 不加 git hooks（个人项目，CI 卡口足够）
- 不引入 ESLint（oxlint 已覆盖所需规则，避免双 lint 冗余）

## 2. 引擎架构

新目录 `src/engine/` 取代 `src/shader/WebGLRenderer.ts`（273 行）与 `src/utils/webgl.ts`：

```
src/engine/
  types.ts               — UniformSchema、QualityTier 等公共类型
  compile.ts             — shader 编译 + 结构化错误（ShaderCompileError，带行号）
  GLRenderer.ts          — context / program / 全屏 quad / 纹理 / 绘制的纯粹封装
  FrameLoop.ts           — rAF 循环：start/stop、页面隐藏自动暂停
  PerformanceGovernor.ts — FPS 采样 → 档位决策 → 回调通知调分辨率
  quality.ts             — 三档画质定义 + 初始档位探测
  CanvasPool.ts          — 模块级全局变量 → 可实例化、可注入预算的 class
src/hooks/
  useShaderCanvas.ts     — 统一 canvas 生命周期（消灭 ShaderCanvas/WebcamCapture 重复逻辑）
```

### 核心接口（子项目 2/3 建立在这些签名上）

```ts
// types.ts
type QualityTier = 'high' | 'medium' | 'low';
type UniformValue = number | [number, number] | [number, number, number] | [number, number, number, number];
interface UniformSchema { [name: string]: UniformValue }

// compile.ts
class ShaderCompileError extends Error {
  readonly errors: { line: number; message: string }[];
}

// GLRenderer.ts — 只做渲染，不认识 React
class GLRenderer {
  constructor(canvas: HTMLCanvasElement, opts?: { dpr?: number })
  setFragmentShader(source: string): void       // 编译失败抛 ShaderCompileError
  setUniforms(u: Partial<UniformSchema>): void
  setVideoTexture(v: HTMLVideoElement | null): void  // webcam 滤镜用
  setResolutionScale(s: number): void            // governor 调它
  render(time: number): void
  onContextChange(cb: 'lost' | 'restored', fn: () => void): void
  dispose(): void
}

// FrameLoop.ts
class FrameLoop {
  constructor(tick: (timeMs: number, frameMs: number) => void)
  start(): void; stop(): void; readonly running: boolean
  // 内部监听 visibilitychange，hidden 时自动暂停
}

// PerformanceGovernor.ts
class PerformanceGovernor {
  constructor(opts: { initial: QualityTier, onTierChange: (t: QualityTier) => void })
  sample(frameMs: number): void  // 每帧喂入；内部做降档/升档判断
  readonly tier: QualityTier
}

// CanvasPool.ts
class CanvasPool {
  constructor(maxContexts: number)
  acquire(): Promise<CanvasSlot>
  release(slot: CanvasSlot): void
}
```

### 数据流

```
ShaderCanvas 组件
  → useShaderCanvas
    → CanvasPool.acquire（满载排队）
    → new GLRenderer(canvas)
    → FrameLoop(tick) 每帧：
        governor.sample(frameMs)
        renderer.render(timeMs)
    → governor.onTierChange → renderer.setResolutionScale(...)
```

### 组件侧迁移
- `ShaderCanvas`、`WebcamCapture`、`DemoCard` 改为消费 `useShaderCanvas`
- `ShaderBackground`（入口页常驻单 context，不走 pool）直接用 GLRenderer + FrameLoop
- 删除 `src/shader/WebGLRenderer.ts`、`src/utils/webgl.ts`；`src/shader/` 保留 registry/categories 元数据体系

## 3. 性能治理

### 三档画质（quality.ts）

| 档位 | DPR 上限 | 内部分辨率缩放 |
|---|---|---|
| high | min(dpr, 2) | 1.0 |
| medium | min(dpr, 1.5) | 1.0 |
| low | 1 | 0.75 |

初始档位：移动端 UA、`deviceMemory ≤ 4` 或 `hardwareConcurrency ≤ 4` → medium 起步；否则 high。

### PerformanceGovernor 决策规则
- 滑动窗口收集最近 60 帧 `frameMs`
- **降档**：平均 < 45fps 持续 1.5 秒 → 立即降一档（保护流畅度）
- **升档**：> 58fps 稳定 5 秒且非最高档 → 升一档；升档后 10 秒冷却（防抖动）
- low 档到底不再降，控制台 `console.info` 留痕

### 暂停策略
- `IntersectionObserver`：canvas 滚出视口 → 停 FrameLoop（保留 context，回视口秒恢复）；pool 排队压力大时才销毁最久未见的 context
- `document.hidden`：切标签页全局暂停（FrameLoop 内置）
- 入口页 ShaderBackground 迁移到同一套 FrameLoop

### Context 丢失处理
- `webglcontextlost` → 暂停渲染，卡片显示静态占位
- `webglcontextrestored` → 重建 program 恢复渲染

### Webcam 滤镜
沿用现有 cover-fit 逻辑（commit 612afb1），迁入 `useShaderCanvas` 的视频纹理分支。

## 4. 错误处理与测试

### 错误处理
- `ShaderCompileError`：解析 WebGL info log → `{ line, message }[]`，供 CodeMirror 行内标注（现有报错 UX 保留）
- 卡片级 React Error Boundary：单个 shader 崩溃 → 该卡片显示"此作品暂时无法展出"占位，整站不受影响
- WebGL 完全不可用：保留 EntryPage 检测；MainLayout 补同级 fallback（静态背景 + 说明）

### Vitest 单测（纯逻辑，fake GL）
- PerformanceGovernor：降档 / 升档 / 冷却 / 到底 决策矩阵
- CanvasPool：满载排队、释放唤醒等待者、重复释放防护
- compile.ts：各类 WebGL 错误日志 → 行号解析
- quality.ts：初始档位探测的设备组合
- FrameLoop：start/stop 幂等、hidden 自动暂停
- GLRenderer：minimal fake WebGL2 context 测 uniform 映射与 dispose 资源释放

### Playwright 冒烟（SwiftShader 软渲染真 GL）
- 首页加载零 console error
- 入口页 canvas 渲染出非纯黑像素
- 点击进入画廊，作品卡片 canvas 均有实际渲染

## 成功标准

1. `npm run lint && npm run typecheck && npm run test` 全绿，strict 模式零 `!` 非空断言、零 eslint-disable
2. CI quality gate 全绿后才允许部署
3. 人为制造低端环境（Playwright throttle），observable 降档发生且帧率回升
4. 站点对外行为与视觉与重构前一致（冒烟测试背书）
5. 子项目 2/3 所需的引擎接口（上述签名）全部就位并有单测覆盖

## Out of Scope（留给后续子项目）

- 任何视觉/样式改动、UI 组件库、展厅模式 overlay → 子项目 2
- uniform 元数据 schema（参数面板用）、shader 内容增删与视觉升级 → 子项目 3
