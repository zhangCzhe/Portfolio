# 子项目 1：工程基线 + 渲染引擎重构 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把渲染层重写为分层、可测试的引擎（`src/engine/`），建立 strict TS / Prettier / Vitest / Playwright / CI 工程基线，落地画质分级与自适应降质，对外行为完全不变。

**Architecture:** 详见 `docs/superpowers/specs/2026-08-08-engine-foundation-design.md`（已批准，含接口细化：GLRenderer 的 `init()` 与构造函数分离、`setQuality(tier)` 替代 `setResolutionScale`、CanvasPool 的 ticket/cancel 模式）。纯逻辑模块（quality/compile/governor/pool）先行 TDD，然后是 GLRenderer（fake GL 测试），最后 hook 与组件迁移。

**Tech Stack:** React 19 · TypeScript 6（strict）· Vite 8 · WebGL2 · Vitest 3 + jsdom + @testing-library/react · Playwright · oxlint · Prettier

## Global Constraints

- `strict: true` + `noUncheckedIndexedAccess: true`（Task 2 起生效，之后所有新代码必须过 strict 编译）
- **新代码零 `!` 非空断言、零 eslint-disable 注释**；用守卫或可选链替代。注意 `arr[i]` 在 noUncheckedIndexedAccess 下是 `T | undefined`
- Prettier 风格：`singleQuote: true, semi: true, printWidth: 100`（Task 1 起生效）
- 对外行为与视觉**零变化**：迁移任务完成后 UI 表现必须与现状一致
- 每个 Task 结束时 `npm run lint && npx tsc -b && npm test`（已有的命令）必须全绿，然后 commit
- commit message 风格跟随仓库：`feat:` / `refactor:` / `test:` / `chore:` / `ci:` 开头，英文
- vite `base: '/Portfolio/'` 不可改；shader 的 `.glsl` 文件不可动
- i18n 改动必须 zh/en 双份
- 引擎公共接口签名以 spec 的"核心接口"一节为准（含其中的接口细化注释）

---

### Task 1: 引入 Prettier + 全仓库格式化

**Files:**
- Create: `.prettierrc.json`、`.prettierignore`
- Modify: `package.json`（scripts + devDependencies）
- Modify: 全部源文件（纯格式化，无语义改动）

**Interfaces:**
- Consumes: 无
- Produces: `npm run format`、`npm run format:check` 两个命令；后续所有任务在格式化后的代码基线上工作

- [ ] **Step 1: 安装并配置**

```bash
cd /home/zhangchenzhe2/projects/Resume/shader-portfolio
npm install -D prettier
```

`.prettierrc.json`：
```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100
}
```

`.prettierignore`：
```
dist
node_modules
package-lock.json
.superpowers
```

- [ ] **Step 2: 加 scripts**

`package.json` 的 `scripts` 中增加（保留现有全部 scripts）：
```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 3: 格式化全仓库**

Run: `npm run format`
Expected: 大量文件被改写（纯空格/引号/换行差异）

- [ ] **Step 4: 验证格式化后一切正常**

Run: `npm run format:check && npm run lint && npx tsc -b && npm run build`
Expected: 全部通过（build 成功说明格式化没有破坏任何语法）

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Prettier and format entire codebase"
```

---

### Task 2: 开启 strict 模式 + 修复存量违规

**Files:**
- Modify: `tsconfig.app.json`（加 strict）
- Modify: `src/utils/webgl.ts:2,23,54`（`!` 断言）
- Modify: `src/shader/registry.ts:10`（`!` 断言）
- Modify: `src/shader/CanvasPool.ts:10`（`!` 断言）
- Modify: `src/shader/WebGLRenderer.ts`（多处 `this.gl!` / `this.program!`）
- Modify: `src/components/shader/ShaderCodeEditor.tsx:7`（`any`）、`:139`（noUncheckedIndexedAccess）

**Interfaces:**
- Consumes: Task 1 的格式化基线
- Produces: strict 编译环境；后续任务的代码都受 strict 约束。本任务只做机械守卫式修复，**不改变任何运行时行为**

- [ ] **Step 1: 开启 strict**

`tsconfig.app.json` 的 `compilerOptions` 增加：
```json
"strict": true,
"noUncheckedIndexedAccess": true
```

- [ ] **Step 2: 运行 tsc 收集全部错误**

Run: `npx tsc -b 2>&1 | head -50`
Expected: 列出一批错误（`!` 断言相关、可能的隐式 any、索引访问）

- [ ] **Step 3: 修复已知违规（机械守卫式）**

`src/utils/webgl.ts` — `createShader`：
```ts
const shader = gl.createShader(type);
if (!shader) throw new Error('Failed to create shader');
```
`createProgram`：`const program = gl.createProgram();` 后加 `if (!program) throw new Error('Failed to create program');`
`createFullscreenQuad`：`const buffer = gl.createBuffer();` 后加 `if (!buffer) throw new Error('Failed to create buffer');`

`src/shader/registry.ts` 的 `loadSource` 开头改为：
```ts
const cached = sourceCache.get(path);
if (cached !== undefined) return cached;
```

`src/shader/CanvasPool.ts` 的 `notifyNext`：
```ts
function notifyNext() {
  if (waiters.size === 0 || activeCount >= MAX_ACTIVE) return;
  const next = waiters.entries().next();
  if (next.done) return;
  const [id, resolve] = next.value;
  waiters.delete(id);
  activeCount++;
  resolve();
}
```

`src/shader/WebGLRenderer.ts` — 每个 `this.gl!` / `this.program!` 改为守卫：
- `compile()` 开头：`const gl = this.gl; if (!gl) return { ok: false, error: 'No GL context' };`
- `discoverUniforms()` 开头：`const gl = this.gl; const program = this.program; if (!gl || !program) return;`
- `setupGeometry()` 开头：同上
- `render()` 开头：`const gl = this.gl; const program = this.program; if (!gl || !program || this.lost || this.disposed) return;`（合并已有 lost/disposed 检查）
- `onContextRestored()` 开头：`const gl = this.gl; if (!gl) return;`

`src/components/shader/ShaderCodeEditor.tsx`：
- 第 7 行 `any` 改为类型化：
```ts
import type { Extension } from '@codemirror/state';
let glslExtension: Extension | null = null;
async function loadGLSLExtension(): Promise<Extension> {
```
- 第 139 行附近 `lineMatch[1]` 改为：
```ts
const lineMatch = /ERROR:\s*\d+:(\d+)/.exec(error);
const lineNo = lineMatch && lineMatch[1] !== undefined ? parseInt(lineMatch[1], 10) : null;
```

- [ ] **Step 4: 迭代修复剩余错误**

Run: `npx tsc -b`
Expected: PASS。若仍有错误：只允许机械守卫式修复（if 守卫、可选链、显式类型），禁止新增 `!`、禁止 `as any`、禁止改行为。

- [ ] **Step 5: 全量验证 + Commit**

Run: `npm run lint && npm run format:check && npx tsc -b && npm run build`
Expected: 全绿

```bash
git add -A
git commit -m "refactor: enable strict TypeScript and remove non-null assertions"
```

---

### Task 3: Vitest 基础设施

**Files:**
- Create: `vitest.config.ts`、`tests/setup.ts`、`tests/unit/smoke.test.ts`
- Modify: `package.json`（scripts + devDependencies）、`.gitignore`（如有需要）

**Interfaces:**
- Consumes: strict 基线
- Produces: `npm test`（vitest run）、`npm run test:watch`；`tests/setup.ts` 初始化 i18n 供组件测试用；后续所有单测放在 `tests/unit/`

- [ ] **Step 1: 安装**

```bash
npm install -D vitest jsdom @testing-library/react
```

- [ ] **Step 2: 配置文件**

`vitest.config.ts`：
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
```

`tests/setup.ts`：
```ts
import '../src/i18n';
```

`package.json` scripts 增加：
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: 写冒烟测试**

`tests/unit/smoke.test.ts`：
```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs in jsdom with i18n initialized', () => {
    expect(document.createElement('div')).toBeInstanceOf(HTMLDivElement);
  });
});
```

- [ ] **Step 4: 验证**

Run: `npm test`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/ package.json package-lock.json
git commit -m "test: add Vitest infrastructure with jsdom"
```

---

### Task 4: engine/types.ts + engine/quality.ts（TDD）

**Files:**
- Create: `src/engine/types.ts`、`src/engine/quality.ts`
- Test: `tests/unit/quality.test.ts`

**Interfaces:**
- Consumes: Vitest 基础设施
- Produces（后续任务依赖的确切签名）:
  - `type QualityTier = 'high' | 'medium' | 'low'`
  - `type UniformValue = number | [number, number] | [number, number, number] | [number, number, number, number]`
  - `type UniformSchema = Record<string, UniformValue>`
  - `QUALITY_LEVELS: Record<QualityTier, { tier: QualityTier; maxDpr: number; resolutionScale: number }>`
  - `detectInitialTier(env: DeviceEnvironment): QualityTier`
  - `readDeviceEnvironment(): DeviceEnvironment`

- [ ] **Step 1: 写失败的测试**

`tests/unit/quality.test.ts`：
```ts
import { describe, it, expect } from 'vitest';
import { detectInitialTier, QUALITY_LEVELS } from '../../src/engine/quality';

describe('detectInitialTier', () => {
  it('returns medium for mobile devices', () => {
    expect(detectInitialTier({ isMobile: true, hardwareConcurrency: 8 })).toBe('medium');
  });
  it('returns medium for low-memory devices', () => {
    expect(detectInitialTier({ isMobile: false, deviceMemory: 4, hardwareConcurrency: 8 })).toBe('medium');
  });
  it('returns medium for few-core devices', () => {
    expect(detectInitialTier({ isMobile: false, deviceMemory: 8, hardwareConcurrency: 4 })).toBe('medium');
  });
  it('returns high for capable desktops', () => {
    expect(detectInitialTier({ isMobile: false, deviceMemory: 16, hardwareConcurrency: 12 })).toBe('high');
  });
  it('returns high when hardware hints are unavailable', () => {
    expect(detectInitialTier({ isMobile: false })).toBe('high');
  });
});

describe('QUALITY_LEVELS', () => {
  it('low tier caps dpr at 1 and scales resolution down', () => {
    expect(QUALITY_LEVELS.low.maxDpr).toBe(1);
    expect(QUALITY_LEVELS.low.resolutionScale).toBeLessThan(1);
  });
  it('high tier allows dpr 2 at full resolution', () => {
    expect(QUALITY_LEVELS.high.maxDpr).toBe(2);
    expect(QUALITY_LEVELS.high.resolutionScale).toBe(1);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/unit/quality.test.ts`
Expected: FAIL（Cannot find module '../../src/engine/quality'）

- [ ] **Step 3: 实现**

`src/engine/types.ts`：
```ts
export type QualityTier = 'high' | 'medium' | 'low';

export type UniformValue =
  | number
  | [number, number]
  | [number, number, number]
  | [number, number, number, number];

export type UniformSchema = Record<string, UniformValue>;
```

`src/engine/quality.ts`：
```ts
import type { QualityTier } from './types';

export interface QualityLevel {
  tier: QualityTier;
  maxDpr: number;
  resolutionScale: number;
}

export const QUALITY_LEVELS: Record<QualityTier, QualityLevel> = {
  high: { tier: 'high', maxDpr: 2, resolutionScale: 1 },
  medium: { tier: 'medium', maxDpr: 1.5, resolutionScale: 1 },
  low: { tier: 'low', maxDpr: 1, resolutionScale: 0.75 },
};

export interface DeviceEnvironment {
  isMobile: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export function detectInitialTier(env: DeviceEnvironment): QualityTier {
  if (env.isMobile) return 'medium';
  if (env.deviceMemory !== undefined && env.deviceMemory <= 4) return 'medium';
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 4) return 'medium';
  return 'high';
}

export function readDeviceEnvironment(): DeviceEnvironment {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    isMobile: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/unit/quality.test.ts && npx tsc -b`
Expected: 7 passed；类型检查绿

- [ ] **Step 5: Commit**

```bash
git add src/engine/ tests/unit/quality.test.ts
git commit -m "feat(engine): add quality tiers and initial device detection"
```

---

### Task 5: engine/compile.ts（TDD）

**Files:**
- Create: `src/engine/compile.ts`
- Test: `tests/unit/compile.test.ts`

**Interfaces:**
- Consumes: 无（纯函数 + Error 子类）
- Produces:
  - `interface ShaderError { line: number; message: string }`
  - `class ShaderCompileError extends Error`，字段：`errors: ShaderError[]`、`stage: 'compile' | 'link'`；`message` 为 WebGL 原始 info log（保证 ShaderCodeEditor 现有的 `ERROR:\s*\d+:(\d+)` 正则继续可用）
  - `parseShaderLog(log: string): ShaderError[]`
  - `compileShaderProgram(gl, vertexSource, fragmentSource): WebGLProgram`（失败抛 ShaderCompileError）

- [ ] **Step 1: 写失败的测试**

`tests/unit/compile.test.ts`：
```ts
import { describe, it, expect } from 'vitest';
import { parseShaderLog, compileShaderProgram, ShaderCompileError } from '../../src/engine/compile';

describe('parseShaderLog', () => {
  it('parses a single error with line number', () => {
    const log = "ERROR: 0:7: 'foo' : undeclared identifier";
    expect(parseShaderLog(log)).toEqual([{ line: 7, message: "'foo' : undeclared identifier" }]);
  });
  it('parses multiple errors', () => {
    const log = "ERROR: 0:3: 'a' : error one\nERROR: 0:9: 'b' : error two";
    const errors = parseShaderLog(log);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({ line: 3, message: "'a' : error one" });
    expect(errors[1]).toEqual({ line: 9, message: "'b' : error two" });
  });
  it('falls back to line 0 for non-standard logs', () => {
    expect(parseShaderLog('Something went wrong')).toEqual([
      { line: 0, message: 'Something went wrong' },
    ]);
  });
  it('returns empty array for empty log', () => {
    expect(parseShaderLog('')).toEqual([]);
    expect(parseShaderLog('  \n  ')).toEqual([]);
  });
});

function makeFakeGL(overrides: { failCompile?: boolean; failLink?: boolean }) {
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => !overrides.failCompile,
    getShaderInfoLog: () => "ERROR: 0:4: 'x' : syntax error",
    deleteShader: () => {},
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => !overrides.failLink,
    getProgramInfoLog: () => 'Link failed: stage mismatch',
    deleteProgram: () => {},
  } as unknown as WebGL2RenderingContext;
}

describe('compileShaderProgram', () => {
  it('throws ShaderCompileError with stage=compile on shader failure', () => {
    const gl = makeFakeGL({ failCompile: true });
    try {
      compileShaderProgram(gl, 'vert', 'frag');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ShaderCompileError);
      const err = e as ShaderCompileError;
      expect(err.stage).toBe('compile');
      expect(err.errors[0]?.line).toBe(4);
      expect(err.message).toContain("ERROR: 0:4");
    }
  });
  it('throws ShaderCompileError with stage=link on link failure', () => {
    const gl = makeFakeGL({ failLink: true });
    try {
      compileShaderProgram(gl, 'vert', 'frag');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ShaderCompileError);
      expect((e as ShaderCompileError).stage).toBe('link');
    }
  });
  it('returns program on success', () => {
    const gl = makeFakeGL({});
    expect(compileShaderProgram(gl, 'vert', 'frag')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/unit/compile.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/engine/compile.ts`：
```ts
export interface ShaderError {
  line: number;
  message: string;
}

export class ShaderCompileError extends Error {
  readonly errors: ShaderError[];
  readonly stage: 'compile' | 'link';

  constructor(message: string, errors: ShaderError[], stage: 'compile' | 'link') {
    super(message);
    this.name = 'ShaderCompileError';
    this.errors = errors;
    this.stage = stage;
  }
}

export function parseShaderLog(log: string): ShaderError[] {
  const errors: ShaderError[] = [];
  for (const rawLine of log.split('\n')) {
    const m = /ERROR:\s*\d+:(\d+):\s*(.+)/.exec(rawLine);
    const lineStr = m?.[1];
    const msg = m?.[2];
    if (lineStr !== undefined && msg !== undefined) {
      errors.push({ line: Number.parseInt(lineStr, 10), message: msg.trim() });
    }
  }
  if (errors.length === 0 && log.trim().length > 0) {
    errors.push({ line: 0, message: log.trim() });
  }
  return errors;
}

type GL = WebGL2RenderingContext | WebGLRenderingContext;

function compileShader(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new ShaderCompileError('Failed to create shader', [], 'compile');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new ShaderCompileError(log, parseShaderLog(log), 'compile');
  }
  return shader;
}

export function compileShaderProgram(
  gl: GL,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) throw new ShaderCompileError('Failed to create program', [], 'link');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'Unknown program link error';
    gl.deleteProgram(program);
    throw new ShaderCompileError(log, parseShaderLog(log), 'link');
  }
  return program;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/unit/compile.test.ts && npx tsc -b`
Expected: 7 passed；类型绿

- [ ] **Step 5: Commit**

```bash
git add src/engine/compile.ts tests/unit/compile.test.ts
git commit -m "feat(engine): add shader compile module with structured errors"
```

---

### Task 6: engine/PerformanceGovernor.ts（TDD）

**Files:**
- Create: `src/engine/PerformanceGovernor.ts`
- Test: `tests/unit/PerformanceGovernor.test.ts`

**Interfaces:**
- Consumes: `QualityTier`（Task 4）
- Produces:
  - `class PerformanceGovernor`，构造参数 `GovernorOptions { initial, onTierChange, now?, windowSize?, downgradeFps?, downgradeSustainMs?, upgradeFps?, upgradeSustainMs?, upgradeCooldownMs? }`
  - `sample(frameMs: number): void`、`readonly tier: QualityTier`
  - 语义：满 60 帧窗口后才开始决策；<45fps 持续 1500ms 降一档（low 到底）；>58fps 持续 5000ms 升一档；升档后 10000ms 冷却；`now` 可注入便于测试

- [ ] **Step 1: 写失败的测试**

`tests/unit/PerformanceGovernor.test.ts`：
```ts
import { describe, it, expect, vi } from 'vitest';
import { PerformanceGovernor } from '../../src/engine/PerformanceGovernor';
import type { QualityTier } from '../../src/engine/types';

function makeGovernor(initial: QualityTier, startAt = 0) {
  let now = startAt;
  const changes: QualityTier[] = [];
  const governor = new PerformanceGovernor({
    initial,
    onTierChange: (t) => changes.push(t),
    now: () => now,
  });
  return {
    governor,
    changes,
    advance(ms: number) { now += ms; },
    feed(frames: number, frameMs: number, stepMs = frameMs) {
      for (let i = 0; i < frames; i++) {
        now += stepMs;
        governor.sample(frameMs);
      }
    },
  };
}

describe('PerformanceGovernor', () => {
  it('does not decide until the sample window is full', () => {
    const g = makeGovernor('high');
    g.feed(59, 50); // 20fps but incomplete window
    expect(g.governor.tier).toBe('high');
    expect(g.changes).toEqual([]);
  });

  it('downgrades after sustained low fps', () => {
    const g = makeGovernor('high');
    g.feed(60, 22); // ~45fps boundary — just above downgrade threshold
    expect(g.governor.tier).toBe('high');
    g.feed(60, 50); // 20fps, spans > 1500ms of sustained slowness
    expect(g.governor.tier).toBe('medium');
    expect(g.changes).toEqual(['medium']);
  });

  it('does not downgrade on a brief dip', () => {
    const g = makeGovernor('high');
    g.feed(60, 10);
    g.feed(20, 50); // dip
    g.feed(60, 10); // recover — window average back up
    expect(g.governor.tier).toBe('high');
  });

  it('never goes below low', () => {
    const g = makeGovernor('low');
    g.feed(300, 100); // 10fps for a long time
    expect(g.governor.tier).toBe('low');
    expect(g.changes).toEqual([]);
  });

  it('upgrades after sustained high fps and notifies', () => {
    const g = makeGovernor('medium');
    g.feed(400, 10, 16); // 100fps, ~6.4s elapsed
    expect(g.governor.tier).toBe('high');
    expect(g.changes).toEqual(['high']);
  });

  it('respects upgrade cooldown', () => {
    const g = makeGovernor('low');
    g.feed(400, 10, 16); // upgrade to medium at ~5s
    expect(g.governor.tier).toBe('medium');
    g.feed(200, 10, 16); // ~3.2s more — still within 10s cooldown
    expect(g.governor.tier).toBe('medium');
    expect(g.changes).toEqual(['medium']);
  });

  it('ignores non-positive frame samples', () => {
    const onTierChange = vi.fn();
    const governor = new PerformanceGovernor({ initial: 'high', onTierChange });
    governor.sample(0);
    governor.sample(-5);
    expect(governor.tier).toBe('high');
  });
});
```

注意：`feed(frames, frameMs, stepMs)` 中 stepMs 控制注入时钟的前进速度（模拟持续时间的流逝），与 frameMs（帧耗时采样）解耦。

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/unit/PerformanceGovernor.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/engine/PerformanceGovernor.ts`：
```ts
import type { QualityTier } from './types';

export interface GovernorOptions {
  initial: QualityTier;
  onTierChange: (tier: QualityTier) => void;
  now?: () => number;
  windowSize?: number;
  downgradeFps?: number;
  downgradeSustainMs?: number;
  upgradeFps?: number;
  upgradeSustainMs?: number;
  upgradeCooldownMs?: number;
}

function lower(tier: QualityTier): QualityTier {
  return tier === 'high' ? 'medium' : 'low';
}

function higher(tier: QualityTier): QualityTier {
  return tier === 'low' ? 'medium' : 'high';
}

export class PerformanceGovernor {
  private readonly samples: number[] = [];
  private readonly windowSize: number;
  private readonly now: () => number;
  private readonly downgradeFps: number;
  private readonly downgradeSustainMs: number;
  private readonly upgradeFps: number;
  private readonly upgradeSustainMs: number;
  private readonly upgradeCooldownMs: number;
  private readonly onTierChange: (tier: QualityTier) => void;
  private badSince: number | null = null;
  private goodSince: number | null = null;
  private lastUpgradeAt = Number.NEGATIVE_INFINITY;
  private currentTier: QualityTier;

  constructor(opts: GovernorOptions) {
    this.currentTier = opts.initial;
    this.onTierChange = opts.onTierChange;
    this.now = opts.now ?? (() => performance.now());
    this.windowSize = opts.windowSize ?? 60;
    this.downgradeFps = opts.downgradeFps ?? 45;
    this.downgradeSustainMs = opts.downgradeSustainMs ?? 1500;
    this.upgradeFps = opts.upgradeFps ?? 58;
    this.upgradeSustainMs = opts.upgradeSustainMs ?? 5000;
    this.upgradeCooldownMs = opts.upgradeCooldownMs ?? 10000;
  }

  get tier(): QualityTier {
    return this.currentTier;
  }

  sample(frameMs: number): void {
    if (frameMs <= 0) return;
    this.samples.push(frameMs);
    if (this.samples.length > this.windowSize) this.samples.shift();
    if (this.samples.length < this.windowSize) return;

    const avgMs = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const fps = 1000 / avgMs;
    const now = this.now();

    if (fps < this.downgradeFps) {
      this.goodSince = null;
      if (this.currentTier !== 'low') {
        this.badSince ??= now;
        if (now - this.badSince >= this.downgradeSustainMs) {
          this.currentTier = lower(this.currentTier);
          this.badSince = null;
          this.onTierChange(this.currentTier);
        }
      }
      return;
    }
    this.badSince = null;

    if (fps > this.upgradeFps && this.currentTier !== 'high') {
      this.goodSince ??= now;
      const cooledDown = now - this.lastUpgradeAt >= this.upgradeCooldownMs;
      if (cooledDown && now - this.goodSince >= this.upgradeSustainMs) {
        this.currentTier = higher(this.currentTier);
        this.goodSince = null;
        this.lastUpgradeAt = now;
        this.onTierChange(this.currentTier);
      }
    } else {
      this.goodSince = null;
    }
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/unit/PerformanceGovernor.test.ts && npx tsc -b`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/PerformanceGovernor.ts tests/unit/PerformanceGovernor.test.ts
git commit -m "feat(engine): add PerformanceGovernor with hysteresis tier control"
```

---

### Task 7: engine/FrameLoop.ts（TDD）

**Files:**
- Create: `src/engine/FrameLoop.ts`
- Test: `tests/unit/FrameLoop.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `type FrameTick = (timeMs: number, frameMs: number) => void`
  - `class FrameLoop`：`constructor(tick: FrameTick)`、`start()`、`stop()`、`dispose()`、`readonly running: boolean`
  - 语义：start 幂等；每帧回调 `(timeMs, frameMs)`，首帧 frameMs 用 16.7 兜底；`document.hidden` 时自动暂停、回到可见时若之前在跑则恢复；`document.hidden` 时 start 为空操作

- [ ] **Step 1: 写失败的测试**

`tests/unit/FrameLoop.test.ts`：
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FrameLoop } from '../../src/engine/FrameLoop';

let rafQueue: FrameRequestCallback[];
let hidden: boolean;

function flushFrames(times: number[]) {
  for (const t of times) {
    const cbs = rafQueue.splice(0);
    for (const cb of cbs) cb(t);
  }
}

beforeEach(() => {
  rafQueue = [];
  hidden = false;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FrameLoop', () => {
  it('ticks with timeMs and frameMs after start', () => {
    const ticks: [number, number][] = [];
    const loop = new FrameLoop((timeMs, frameMs) => ticks.push([timeMs, frameMs]));
    loop.start();
    flushFrames([100, 132, 165]);
    loop.dispose();
    expect(ticks).toHaveLength(3);
    expect(ticks[0]).toEqual([100, 16.7]); // first frame fallback
    expect(ticks[1]).toEqual([132, 32]);
    expect(ticks[2]).toEqual([165, 33]);
  });

  it('stop halts ticking', () => {
    const ticks: number[] = [];
    const loop = new FrameLoop((t) => ticks.push(t));
    loop.start();
    flushFrames([100]);
    loop.stop();
    flushFrames([132]);
    expect(ticks).toEqual([100]);
    loop.dispose();
  });

  it('start is idempotent', () => {
    const loop = new FrameLoop(() => {});
    loop.start();
    loop.start();
    expect(rafQueue).toHaveLength(1);
    loop.dispose();
  });

  it('does not start while document is hidden', () => {
    hidden = true;
    const loop = new FrameLoop(() => {});
    loop.start();
    expect(loop.running).toBe(false);
    loop.dispose();
  });

  it('pauses on hidden and resumes on visible', () => {
    const ticks: number[] = [];
    const loop = new FrameLoop((t) => ticks.push(t));
    loop.start();
    flushFrames([100]);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.running).toBe(false);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.running).toBe(true);
    flushFrames([200]);
    expect(ticks).toEqual([100, 200]);
    loop.dispose();
  });

  it('stays stopped on visible if it was not running before hidden', () => {
    const loop = new FrameLoop(() => {});
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(loop.running).toBe(false);
    loop.dispose();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/unit/FrameLoop.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/engine/FrameLoop.ts`：
```ts
export type FrameTick = (timeMs: number, frameMs: number) => void;

export class FrameLoop {
  private rafId: number | null = null;
  private lastTimeMs: number | null = null;
  private wasRunningBeforeHidden = false;

  constructor(private readonly tick: FrameTick) {
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  get running(): boolean {
    return this.rafId !== null;
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.lastTimeMs = null;
    this.rafId = requestAnimationFrame(this.step);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  dispose(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  private step = (timeMs: number): void => {
    if (this.rafId === null) return;
    const frameMs = this.lastTimeMs === null ? 16.7 : timeMs - this.lastTimeMs;
    this.lastTimeMs = timeMs;
    this.tick(timeMs, frameMs);
    this.rafId = requestAnimationFrame(this.step);
  };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.wasRunningBeforeHidden = this.running;
      this.stop();
    } else if (this.wasRunningBeforeHidden) {
      this.wasRunningBeforeHidden = false;
      this.start();
    }
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/unit/FrameLoop.test.ts && npx tsc -b`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/engine/FrameLoop.ts tests/unit/FrameLoop.test.ts
git commit -m "feat(engine): add FrameLoop with visibility-aware rAF management"
```

---

### Task 8: engine/CanvasPool.ts + hooks/useCanvasSlot.ts（TDD）

**Files:**
- Create: `src/engine/CanvasPool.ts`、`src/hooks/useCanvasSlot.ts`
- Modify: `src/shader/CanvasPool.ts`（改为兼容 re-export shim，保持现有组件不崩）
- Test: `tests/unit/CanvasPool.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `interface CanvasSlot { id: number; release(): void }`（重复 release 为 no-op）
  - `interface CanvasTicket { id: number; promise: Promise<CanvasSlot>; cancel(): void }`
  - `class CanvasPool { constructor(maxContexts: number); acquire(): CanvasTicket; readonly activeCount: number; readonly pendingCount: number }`
  - `cardCanvasPool = new CanvasPool(5)`（卡片预算 5，背景独立占第 6 个 context，沿用现状）
  - `useCanvasSlot(active: boolean, pool?: CanvasPool): boolean`（默认用 cardCanvasPool）
  - 排队语义：满载时 acquire 挂起；有 slot 释放时 FIFO 唤醒下一个等待者（active 计数不变）；ticket.cancel() 用于"等待中被卸载/离屏"

- [ ] **Step 1: 写失败的测试**

`tests/unit/CanvasPool.test.ts`：
```ts
import { describe, it, expect } from 'vitest';
import { CanvasPool, type CanvasSlot } from '../../src/engine/CanvasPool';

async function slotOf(pool: CanvasPool): Promise<CanvasSlot> {
  return pool.acquire().promise;
}

describe('CanvasPool', () => {
  it('grants immediately under budget', async () => {
    const pool = new CanvasPool(2);
    const slot = await slotOf(pool);
    expect(pool.activeCount).toBe(1);
    slot.release();
    expect(pool.activeCount).toBe(0);
  });

  it('queues acquires beyond budget and grants FIFO on release', async () => {
    const pool = new CanvasPool(1);
    const first = await slotOf(pool);
    const order: string[] = [];
    const t2 = pool.acquire();
    const t3 = pool.acquire();
    void t2.promise.then(() => order.push('second'));
    void t3.promise.then(() => order.push('third'));
    expect(pool.activeCount).toBe(1);
    expect(pool.pendingCount).toBe(2);

    first.release();
    await t2.promise;
    expect(order).toEqual(['second']);
    expect(pool.activeCount).toBe(1); // slot handed off, not freed

    (await t2.promise).release();
    await t3.promise;
    expect(order).toEqual(['second', 'third']);
  });

  it('cancel removes a pending waiter', async () => {
    const pool = new CanvasPool(1);
    const first = await slotOf(pool);
    const ticket = pool.acquire();
    ticket.cancel();
    expect(pool.pendingCount).toBe(0);
    first.release();
    expect(pool.activeCount).toBe(0);
  });

  it('double release is a safe no-op', async () => {
    const pool = new CanvasPool(1);
    const slot = await slotOf(pool);
    slot.release();
    slot.release();
    expect(pool.activeCount).toBe(0);
  });

  it('released slot wakes the next waiter instead of decrementing', async () => {
    const pool = new CanvasPool(1);
    const first = await slotOf(pool);
    const ticket = pool.acquire();
    first.release();
    const second = await ticket.promise;
    expect(pool.activeCount).toBe(1);
    second.release();
    expect(pool.activeCount).toBe(0);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/unit/CanvasPool.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/engine/CanvasPool.ts`：
```ts
export interface CanvasSlot {
  readonly id: number;
  release(): void;
}

export interface CanvasTicket {
  readonly id: number;
  readonly promise: Promise<CanvasSlot>;
  cancel(): void;
}

export class CanvasPool {
  private active = 0;
  private nextId = 0;
  private readonly waiters = new Map<number, () => void>();

  constructor(readonly maxContexts: number) {}

  get activeCount(): number {
    return this.active;
  }

  get pendingCount(): number {
    return this.waiters.size;
  }

  acquire(): CanvasTicket {
    const id = ++this.nextId;
    if (this.active < this.maxContexts) {
      this.active++;
      return { id, promise: Promise.resolve(this.makeSlot(id)), cancel: () => {} };
    }
    let resolveWaiter: () => void = () => {};
    const promise = new Promise<CanvasSlot>((resolve) => {
      resolveWaiter = () => resolve(this.makeSlot(id));
    });
    this.waiters.set(id, resolveWaiter);
    return {
      id,
      promise,
      cancel: () => {
        this.waiters.delete(id);
      },
    };
  }

  private makeSlot(id: number): CanvasSlot {
    let released = false;
    return {
      id,
      release: () => {
        if (released) return;
        released = true;
        this.handOffOrFree();
      },
    };
  }

  private handOffOrFree(): void {
    const next = this.waiters.entries().next();
    if (next.done) {
      this.active = Math.max(0, this.active - 1);
      return;
    }
    const [waiterId, resolve] = next.value;
    this.waiters.delete(waiterId);
    resolve(); // slot 直接移交，active 计数不变
  }
}
```

`src/hooks/useCanvasSlot.ts`：
```ts
import { useEffect, useRef, useState } from 'react';
import { CanvasPool } from '../engine/CanvasPool';
import type { CanvasSlot, CanvasTicket } from '../engine/CanvasPool';

/** 卡片 canvas 的 context 预算（背景 canvas 独立占用第 6 个） */
export const cardCanvasPool = new CanvasPool(5);

export function useCanvasSlot(active: boolean, pool: CanvasPool = cardCanvasPool): boolean {
  const [granted, setGranted] = useState(false);
  const slotRef = useRef<CanvasSlot | null>(null);
  const ticketRef = useRef<CanvasTicket | null>(null);

  useEffect(() => {
    if (!active) return;
    const ticket = pool.acquire();
    ticketRef.current = ticket;
    let cancelled = false;
    void ticket.promise.then((slot) => {
      if (cancelled) {
        slot.release();
        return;
      }
      slotRef.current = slot;
      setGranted(true);
    });
    return () => {
      cancelled = true;
      ticket.cancel();
      ticketRef.current = null;
      slotRef.current?.release();
      slotRef.current = null;
      setGranted(false);
    };
  }, [active, pool]);

  return granted;
}
```

`src/shader/CanvasPool.ts` 整体替换为兼容 shim（保持 `import { useCanvasSlot } from '../../shader/CanvasPool'` 继续工作）：
```ts
// 兼容层：引擎迁移完成后删除（见重构计划 Task 13）
export { useCanvasSlot } from '../hooks/useCanvasSlot';
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- tests/unit/CanvasPool.test.ts && npx tsc -b && npm run lint && npm run build`
Expected: 5 passed；全绿（现有组件经 shim 无感切换）

- [ ] **Step 5: Commit**

```bash
git add src/engine/CanvasPool.ts src/hooks/useCanvasSlot.ts src/shader/CanvasPool.ts tests/unit/CanvasPool.test.ts
git commit -m "feat(engine): rewrite CanvasPool as injectable class with ticket cancel"
```

---

### Task 9: tests/helpers/fakeGL.ts + engine/GLRenderer.ts（TDD · 核心任务）

**Files:**
- Create: `tests/helpers/fakeGL.ts`、`src/engine/GLRenderer.ts`
- Test: `tests/unit/GLRenderer.test.ts`

**Interfaces:**
- Consumes: `compileShaderProgram` / `ShaderCompileError`（Task 5）、`QUALITY_LEVELS`（Task 4）、`UniformSchema`（Task 4）
- Produces（Task 10+ 依赖）:
  - `class GLRenderer`：`constructor(canvas, opts?: { initialTier?: QualityTier })`、`init(): boolean`、`setFragmentShader(source): void`（抛 ShaderCompileError）、`setUniforms(u: Partial<UniformSchema>): void`、`setVideoTexture(v: HTMLVideoElement | null): void`、`setMouse(x, y): void`、`setQuality(tier): void`、`resize(): void`、`render(timeMs): void`、`onContextChange(kind: 'lost' | 'restored', fn: () => void): void`、`dispose(): void`
  - 内置 uniform：`u_time`（秒）、`u_resolution`（canvas 像素宽高）、`u_mouse`、`u_texture`/`u_videoSize`（仅 video 模式）；自定义 uniform 按值长度分发 1f/2f/3f/4f
  - context 属性：`{ alpha: true, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }`（webgl2 优先，webgl 兜底）

- [ ] **Step 1: 写 FakeGL 测试替身**

`tests/helpers/fakeGL.ts`：
```ts
export interface FakeActiveUniform {
  name: string;
  type: number;
}

/** 最小 WebGL2 替身：只实现 GLRenderer 用到的方法，全部调用可断言 */
export class FakeGL {
  readonly VERTEX_SHADER = 0x8b31;
  readonly FRAGMENT_SHADER = 0x8b30;
  readonly COMPILE_STATUS = 0x8b81;
  readonly LINK_STATUS = 0x8b82;
  readonly ACTIVE_UNIFORMS = 0x8b86;
  readonly ARRAY_BUFFER = 0x8892;
  readonly STATIC_DRAW = 0x88e4;
  readonly FLOAT = 0x1406;
  readonly TRIANGLES = 0x0004;
  readonly TEXTURE_2D = 0x0de1;
  readonly TEXTURE0 = 0x84c0;
  readonly TEXTURE_MIN_FILTER = 0x2801;
  readonly TEXTURE_MAG_FILTER = 0x2800;
  readonly TEXTURE_WRAP_S = 0x2802;
  readonly TEXTURE_WRAP_T = 0x2803;
  readonly CLAMP_TO_EDGE = 0x812f;
  readonly LINEAR = 0x2601;
  readonly RGBA = 0x1908;
  readonly UNSIGNED_BYTE = 0x1401;
  readonly UNPACK_FLIP_Y_WEBGL = 0x9240;

  activeUniforms: FakeActiveUniform[] = [];
  failNextCompile = false;
  drawCallCount = 0;
  viewportArgs: number[] = [];
  loseContextCalled = false;
  deletedPrograms = 0;
  deletedBuffers = 0;
  deletedTextures = 0;
  readonly uniformCalls: { method: string; args: unknown[] }[] = [];
  private failCompileFlag = false;

  createShader(): object {
    return {};
  }
  shaderSource(): void {}
  compileShader(): void {
    this.failCompileFlag = this.failNextCompile;
    this.failNextCompile = false;
  }
  getShaderParameter(): boolean {
    return !this.failCompileFlag;
  }
  getShaderInfoLog(): string {
    return "ERROR: 0:4: 'x' : syntax error";
  }
  deleteShader(): void {}
  createProgram(): object {
    return {};
  }
  attachShader(): void {}
  linkProgram(): void {}
  getProgramParameter(_p: unknown, pname: number): unknown {
    if (pname === this.LINK_STATUS) return true;
    if (pname === this.ACTIVE_UNIFORMS) return this.activeUniforms.length;
    return null;
  }
  getProgramInfoLog(): string {
    return 'link error';
  }
  deleteProgram(): void {
    this.deletedPrograms++;
  }
  useProgram(): void {}
  createBuffer(): object {
    return {};
  }
  bindBuffer(): void {}
  bufferData(): void {}
  deleteBuffer(): void {
    this.deletedBuffers++;
  }
  getAttribLocation(): number {
    return 0;
  }
  enableVertexAttribArray(): void {}
  vertexAttribPointer(): void {}
  createTexture(): object {
    return {};
  }
  bindTexture(): void {}
  texParameteri(): void {}
  texImage2D(): void {}
  deleteTexture(): void {
    this.deletedTextures++;
  }
  activeTexture(): void {}
  pixelStorei(): void {}
  getActiveUniform(_p: unknown, index: number): FakeActiveUniform | null {
    return this.activeUniforms[index] ?? null;
  }
  getUniformLocation(_p: unknown, name: string): object | null {
    return { name };
  }
  uniform1f(_loc: unknown, x: number): void {
    this.uniformCalls.push({ method: 'uniform1f', args: [x] });
  }
  uniform2f(_loc: unknown, x: number, y: number): void {
    this.uniformCalls.push({ method: 'uniform2f', args: [x, y] });
  }
  uniform3f(_loc: unknown, x: number, y: number, z: number): void {
    this.uniformCalls.push({ method: 'uniform3f', args: [x, y, z] });
  }
  uniform4f(_loc: unknown, x: number, y: number, z: number, w: number): void {
    this.uniformCalls.push({ method: 'uniform4f', args: [x, y, z, w] });
  }
  uniform1i(_loc: unknown, x: number): void {
    this.uniformCalls.push({ method: 'uniform1i', args: [x] });
  }
  viewport(x: number, y: number, w: number, h: number): void {
    this.viewportArgs = [x, y, w, h];
  }
  drawArrays(): void {
    this.drawCallCount++;
  }
  getExtension(name: string): object | null {
    if (name === 'WEBGL_lose_context') {
      return { loseContext: () => { this.loseContextCalled = true; } };
    }
    return null;
  }
}

export function makeFakeCanvas(gl: FakeGL, rectWidth = 300, rectHeight = 200): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getContext', {
    value: (type: string) => (type.startsWith('webgl') ? gl : null),
  });
  canvas.getBoundingClientRect = () =>
    ({ width: rectWidth, height: rectHeight, top: 0, left: 0, right: rectWidth, bottom: rectHeight, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return canvas;
}
```

- [ ] **Step 2: 写失败的测试**

`tests/unit/GLRenderer.test.ts`：
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GLRenderer } from '../../src/engine/GLRenderer';
import { ShaderCompileError } from '../../src/engine/compile';
import { FakeGL, makeFakeCanvas } from '../helpers/fakeGL';

let gl: FakeGL;

beforeEach(() => {
  gl = new FakeGL();
  vi.stubGlobal('devicePixelRatio', 2);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GLRenderer', () => {
  it('init acquires context and sizes canvas by DPR', () => {
    const canvas = makeFakeCanvas(gl, 300, 200);
    const renderer = new GLRenderer(canvas);
    expect(renderer.init()).toBe(true);
    expect(canvas.width).toBe(600); // 300 * dpr2 * scale1
    expect(canvas.height).toBe(400);
    expect(gl.viewportArgs).toEqual([0, 0, 600, 400]);
    renderer.dispose();
  });

  it('init returns false when WebGL is unavailable', () => {
    const canvas = document.createElement('canvas');
    const renderer = new GLRenderer(canvas);
    expect(renderer.init()).toBe(false);
  });

  it('setFragmentShader throws ShaderCompileError on bad source', () => {
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    gl.failNextCompile = true;
    expect(() => renderer.setFragmentShader('bad')).toThrow(ShaderCompileError);
    renderer.dispose();
  });

  it('render feeds built-in uniforms and draws', () => {
    gl.activeUniforms = [{ name: 'u_time', type: 0x1406 }, { name: 'u_resolution', type: 0x8b50 }];
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    renderer.render(2000);
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform1f', args: [2] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform2f', args: [600, 400] });
    expect(gl.drawCallCount).toBe(1);
    renderer.dispose();
  });

  it('setUniforms dispatches by value shape', () => {
    gl.activeUniforms = [
      { name: 'u_a', type: 0x1406 },
      { name: 'u_b', type: 0x8b50 },
      { name: 'u_c', type: 0x8b51 },
      { name: 'u_d', type: 0x8b52 },
    ];
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    renderer.setUniforms({ u_a: 1, u_b: [1, 2], u_c: [1, 2, 3], u_d: [1, 2, 3, 4], u_unknown: 9 });
    renderer.render(0);
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform1f', args: [1] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform2f', args: [1, 2] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform3f', args: [1, 2, 3] });
    expect(gl.uniformCalls).toContainEqual({ method: 'uniform4f', args: [1, 2, 3, 4] });
    // u_unknown 不在 activeUniforms 中，不应产生第 5 个 1f 调用
    expect(gl.uniformCalls.filter((c) => c.method === 'uniform1f')).toHaveLength(1);
    renderer.dispose();
  });

  it('setQuality low shrinks canvas resolution', () => {
    const canvas = makeFakeCanvas(gl, 300, 200);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setQuality('low'); // dpr min(2,1)=1, scale 0.75
    expect(canvas.width).toBe(225); // 300 * 1 * 0.75
    expect(canvas.height).toBe(150);
    renderer.dispose();
  });

  it('context lost stops rendering, restored recompiles', () => {
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    const events: string[] = [];
    renderer.onContextChange('lost', () => events.push('lost'));
    renderer.onContextChange('restored', () => events.push('restored'));
    canvas.dispatchEvent(new Event('webglcontextlost'));
    renderer.render(16);
    expect(gl.drawCallCount).toBe(0);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(events).toEqual(['lost', 'restored']);
    renderer.render(16);
    expect(gl.drawCallCount).toBe(1);
    renderer.dispose();
  });

  it('dispose releases GL resources and loses context', () => {
    const canvas = makeFakeCanvas(gl);
    const renderer = new GLRenderer(canvas);
    renderer.init();
    renderer.setFragmentShader('ok');
    renderer.dispose();
    expect(gl.deletedPrograms).toBe(1);
    expect(gl.deletedBuffers).toBe(1);
    expect(gl.loseContextCalled).toBe(true);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npm test -- tests/unit/GLRenderer.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 4: 实现**

`src/engine/GLRenderer.ts`：
```ts
import { compileShaderProgram } from './compile';
import { QUALITY_LEVELS } from './quality';
import type { QualityTier, UniformSchema } from './types';

type GL = WebGL2RenderingContext | WebGLRenderingContext;
type ContextEventKind = 'lost' | 'restored';

const FULLSCREEN_VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const QUAD_VERTICES = new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1, -1, 1, 1, -1]);

export interface GLRendererOptions {
  initialTier?: QualityTier;
}

export class GLRenderer {
  private gl: GL | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private readonly uniformLocations = new Map<string, WebGLUniformLocation>();
  private customUniforms: UniformSchema = {};
  private video: HTMLVideoElement | null = null;
  private mouse = { x: 0.5, y: 0.5 };
  private maxDpr: number;
  private resolutionScale: number;
  private fragmentSource: string | null = null;
  private lost = false;
  private disposed = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly listeners: Record<ContextEventKind, Set<() => void>> = {
    lost: new Set(),
    restored: new Set(),
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: GLRendererOptions = {},
  ) {
    const level = QUALITY_LEVELS[opts.initialTier ?? 'high'];
    this.maxDpr = level.maxDpr;
    this.resolutionScale = level.resolutionScale;
  }

  init(): boolean {
    if (this.gl) return true;
    const gl = (this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    }) ?? this.canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    })) as GL | null;
    if (!gl) return false;
    this.gl = gl;
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
    }
    this.resize();
    return true;
  }

  setFragmentShader(source: string): void {
    const gl = this.requireGL();
    this.fragmentSource = source;
    const program = compileShaderProgram(gl, FULLSCREEN_VERTEX_SHADER, source);
    if (this.program) gl.deleteProgram(this.program);
    this.program = program;
    gl.useProgram(program);
    this.discoverUniforms();
    this.setupGeometry();
  }

  setUniforms(uniforms: Partial<UniformSchema>): void {
    this.customUniforms = { ...this.customUniforms, ...uniforms };
  }

  setVideoTexture(video: HTMLVideoElement | null): void {
    this.video = video;
    const gl = this.gl;
    if (video && gl && !this.texture) {
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  setMouse(x: number, y: number): void {
    this.mouse = { x, y };
  }

  setQuality(tier: QualityTier): void {
    const level = QUALITY_LEVELS[tier];
    this.maxDpr = level.maxDpr;
    this.resolutionScale = level.resolutionScale;
    this.resize();
  }

  resize(): void {
    const gl = this.gl;
    if (!gl) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio, this.maxDpr) * this.resolutionScale;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(timeMs: number): void {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program || this.lost || this.disposed) return;
    gl.useProgram(program);
    const t = timeMs * 0.001;
    for (const [name, location] of this.uniformLocations) {
      switch (name) {
        case 'u_time':
          gl.uniform1f(location, t);
          break;
        case 'u_resolution':
          gl.uniform2f(location, this.canvas.width, this.canvas.height);
          break;
        case 'u_mouse':
          gl.uniform2f(location, this.mouse.x, this.mouse.y);
          break;
        case 'u_texture':
          this.uploadVideoFrame(gl, location);
          break;
        case 'u_videoSize':
          this.uploadVideoSize(gl, location);
          break;
        default:
          this.applyCustomUniform(gl, name, location);
      }
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  onContextChange(kind: ContextEventKind, fn: () => void): void {
    this.listeners[kind].add(fn);
  }

  dispose(): void {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    const gl = this.gl;
    if (gl) {
      try { if (this.program) gl.deleteProgram(this.program); } catch { /* ignore */ }
      try { if (this.buffer) gl.deleteBuffer(this.buffer); } catch { /* ignore */ }
      try { if (this.texture) gl.deleteTexture(this.texture); } catch { /* ignore */ }
      try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* ignore */ }
    }
    this.program = null;
    this.buffer = null;
    this.texture = null;
    this.gl = null;
  }

  // ── internal ──

  private requireGL(): GL {
    const gl = this.gl;
    if (!gl) throw new Error('GLRenderer: init() must succeed before use');
    return gl;
  }

  private discoverUniforms(): void {
    const gl = this.requireGL();
    const program = this.program;
    if (!program) return;
    this.uniformLocations.clear();
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const location = gl.getUniformLocation(program, info.name);
      if (!location) continue;
      this.uniformLocations.set(info.name, location);
    }
  }

  private setupGeometry(): void {
    const gl = this.requireGL();
    const program = this.program;
    if (!program) return;
    if (this.buffer) gl.deleteBuffer(this.buffer);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  }

  private uploadVideoFrame(gl: GL, location: WebGLUniformLocation): void {
    const video = this.video;
    if (!this.texture || !video || video.readyState < video.HAVE_CURRENT_DATA) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.uniform1i(location, 0);
  }

  private uploadVideoSize(gl: GL, location: WebGLUniformLocation): void {
    const video = this.video;
    if (video && video.videoWidth > 0) {
      gl.uniform2f(location, video.videoWidth, video.videoHeight);
    } else {
      gl.uniform2f(location, 640, 480);
    }
  }

  private applyCustomUniform(gl: GL, name: string, location: WebGLUniformLocation): void {
    const value = this.customUniforms[name];
    if (value === undefined) return;
    if (typeof value === 'number') {
      gl.uniform1f(location, value);
      return;
    }
    switch (value.length) {
      case 2:
        gl.uniform2f(location, value[0], value[1]);
        break;
      case 3:
        gl.uniform3f(location, value[0], value[1], value[2]);
        break;
      case 4:
        gl.uniform4f(location, value[0], value[1], value[2], value[3]);
        break;
    }
  }

  private emit(kind: ContextEventKind): void {
    for (const fn of this.listeners[kind]) fn();
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.lost = true;
    this.emit('lost');
  };

  private handleContextRestored = (): void => {
    this.lost = false;
    try {
      if (this.fragmentSource) this.setFragmentShader(this.fragmentSource);
      this.resize();
    } catch { /* 重建失败时保持无 program，render 空转 */ }
    this.emit('restored');
  };
}
```

- [ ] **Step 5: 运行确认通过**

Run: `npm test && npx tsc -b && npm run lint`
Expected: 全绿（含此前所有测试）

- [ ] **Step 6: Commit**

```bash
git add src/engine/GLRenderer.ts tests/unit/GLRenderer.test.ts tests/helpers/fakeGL.ts
git commit -m "feat(engine): add GLRenderer with quality scaling and context-loss recovery"
```

---

### Task 10: hooks/useShaderCanvas.ts（TDD）

**Files:**
- Create: `src/hooks/useShaderCanvas.ts`
- Test: `tests/unit/useShaderCanvas.test.tsx`

**Interfaces:**
- Consumes: `GLRenderer`、`FrameLoop`、`PerformanceGovernor`、`detectInitialTier`/`readDeviceEnvironment`、`useCanvasSlot`、`ShaderCompileError`
- Produces（Task 11/12 的组件依赖）:
  ```ts
  interface UseShaderCanvasOptions {
    fragmentShader: string;
    uniforms?: UniformSchema;
    interactive?: boolean;
    canvasClassName?: string;
    onCompileError?: (message: string | null) => void;
  }
  interface UseShaderCanvasResult {
    containerRef: RefObject<HTMLDivElement | null>;
    rendererRef: RefObject<GLRenderer | null>;
    active: boolean;
    glError: string | null;
  }
  function useShaderCanvas(opts: UseShaderCanvasOptions): UseShaderCanvasResult
  ```
  语义：IntersectionObserver（首帧 rAF 后挂载，避免所有卡片同时触发）→ visible → useCanvasSlot → active 时创建 canvas + GLRenderer + Governor + FrameLoop；失活时全部销毁释放；fragmentShader 变化时热重编译；编译错误经 `ShaderCompileError.message`（原始 log 字符串）透传给 onCompileError，保持现有编辑器报错 UX

- [ ] **Step 1: 写失败的测试**

`tests/unit/useShaderCanvas.test.tsx`：
```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { useShaderCanvas } from '../../src/hooks/useShaderCanvas';
import { cardCanvasPool } from '../../src/hooks/useCanvasSlot';
import { FakeGL } from '../helpers/fakeGL';

let fakeGLs: FakeGL[];
let rafQueue: FrameRequestCallback[];
let intersectionCbs: IntersectionObserverCallback[];

function flushRaf(times: number[]) {
  for (const t of times) {
    const cbs = rafQueue.splice(0);
    for (const cb of cbs) cb(t);
  }
}

function triggerIntersection(isIntersecting: boolean) {
  for (const cb of intersectionCbs.splice(0)) {
    cb(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  }
}

class FakeIntersectionObserver {
  constructor(private cb: IntersectionObserverCallback) {
    intersectionCbs.push(cb);
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function Host({ fragmentShader, onCompileError }: { fragmentShader: string; onCompileError?: (m: string | null) => void }) {
  const { containerRef, active, glError } = useShaderCanvas({ fragmentShader, onCompileError });
  return (
    <div>
      <div ref={containerRef} data-testid="container" />
      <span data-testid="active">{String(active)}</span>
      <span data-testid="glError">{glError ?? 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  fakeGLs = [];
  rafQueue = [];
  intersectionCbs = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('devicePixelRatio', 1);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: function (this: HTMLCanvasElement, type: string) {
      if (!type.startsWith('webgl')) return null;
      const gl = new FakeGL();
      fakeGLs.push(gl);
      return gl;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useShaderCanvas', () => {
  it('creates a rendering canvas when visible, destroys on hide', () => {
    const { getByTestId, unmount } = render(<Host fragmentShader="void main(){}" />);
    const container = getByTestId('container');
    expect(container.querySelector('canvas')).toBeNull();

    act(() => flushRaf([16])); // observer 挂载
    act(() => triggerIntersection(true));
    act(() => flushRaf([32, 48, 64])); // 渲染数帧

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(fakeGLs).toHaveLength(1);
    expect(fakeGLs[0]?.drawCallCount).toBeGreaterThan(0);
    expect(getByTestId('active').textContent).toBe('true');

    act(() => triggerIntersection(false));
    expect(container.querySelector('canvas')).toBeNull();
    expect(cardCanvasPool.activeCount).toBe(0);
    unmount();
  });

  it('reports compile errors via onCompileError', () => {
    const errors: (string | null)[] = [];
    const { getByTestId, unmount } = render(
      <Host fragmentShader="bad source" onCompileError={(m) => errors.push(m)} />,
    );
    // 让所有 FakeGL 编译失败：patch prototype 的 getShaderParameter
    const orig = FakeGL.prototype.getShaderParameter;
    FakeGL.prototype.getShaderParameter = () => false;
    act(() => flushRaf([16]));
    act(() => triggerIntersection(true));
    FakeGL.prototype.getShaderParameter = orig;

    expect(errors.at(-1)).toContain('ERROR: 0:4');
    expect(getByTestId('glError').textContent).toContain('ERROR: 0:4');
    unmount();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/unit/useShaderCanvas.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/hooks/useShaderCanvas.ts`：
```ts
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { GLRenderer } from '../engine/GLRenderer';
import { FrameLoop } from '../engine/FrameLoop';
import { PerformanceGovernor } from '../engine/PerformanceGovernor';
import { detectInitialTier, readDeviceEnvironment } from '../engine/quality';
import { ShaderCompileError } from '../engine/compile';
import type { UniformSchema } from '../engine/types';
import { useCanvasSlot } from './useCanvasSlot';

export interface UseShaderCanvasOptions {
  fragmentShader: string;
  uniforms?: UniformSchema;
  interactive?: boolean;
  canvasClassName?: string;
  onCompileError?: (message: string | null) => void;
}

export interface UseShaderCanvasResult {
  containerRef: RefObject<HTMLDivElement | null>;
  rendererRef: RefObject<GLRenderer | null>;
  active: boolean;
  glError: string | null;
}

function toErrorMessage(e: unknown): string {
  return e instanceof ShaderCompileError ? e.message : String(e);
}

export function useShaderCanvas({
  fragmentShader,
  uniforms,
  canvasClassName = '',
  onCompileError,
}: UseShaderCanvasOptions): UseShaderCanvasResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GLRenderer | null>(null);
  const [visible, setVisible] = useState(false);
  const [glError, setGlError] = useState<string | null>(null);
  const slotGranted = useCanvasSlot(visible);
  const active = visible && slotGranted;

  const fragmentRef = useRef(fragmentShader);
  fragmentRef.current = fragmentShader;
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;
  const errorCbRef = useRef(onCompileError);
  errorCbRef.current = onCompileError;

  // 可见性观察 —— 首帧 rAF 后再挂载，避免所有卡片在首绘前同时触发
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let observer: IntersectionObserver | null = null;
    const raf = requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setVisible(entry.isIntersecting);
        },
        { threshold: 0 },
      );
      observer.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  // 渲染器生命周期：active 时创建，失活/卸载时销毁
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = `shader-canvas ${canvasClassName}`;
    container.appendChild(canvas);

    const initialTier = detectInitialTier(readDeviceEnvironment());
    const renderer = new GLRenderer(canvas, { initialTier });
    if (!renderer.init()) {
      setGlError('WebGL not supported');
      canvas.remove();
      return;
    }
    rendererRef.current = renderer;

    try {
      renderer.setFragmentShader(fragmentRef.current);
      setGlError(null);
      errorCbRef.current?.(null);
    } catch (e) {
      const msg = toErrorMessage(e);
      setGlError(msg);
      errorCbRef.current?.(msg);
    }
    if (uniformsRef.current) renderer.setUniforms(uniformsRef.current);

    const governor = new PerformanceGovernor({
      initial: initialTier,
      onTierChange: (tier) => renderer.setQuality(tier),
    });
    const loop = new FrameLoop((timeMs, frameMs) => {
      governor.sample(frameMs);
      renderer.render(timeMs);
    });
    loop.start();

    return () => {
      loop.dispose();
      renderer.dispose();
      rendererRef.current = null;
      canvas.remove();
    };
  }, [active, canvasClassName]);

  // 热重编译（实时编辑）
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    try {
      renderer.setFragmentShader(fragmentShader);
      setGlError(null);
      errorCbRef.current?.(null);
    } catch (e) {
      const msg = toErrorMessage(e);
      setGlError(msg);
      errorCbRef.current?.(msg);
    }
  }, [fragmentShader]);

  // uniforms 同步
  useEffect(() => {
    if (uniforms) rendererRef.current?.setUniforms(uniforms);
  }, [uniforms]);

  return { containerRef, rendererRef, active, glError };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test && npx tsc -b && npm run lint`
Expected: 全绿

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useShaderCanvas.ts tests/unit/useShaderCanvas.test.tsx
git commit -m "feat(engine): add useShaderCanvas hook unifying canvas lifecycle"
```

---

### Task 11: CanvasErrorBoundary + 迁移 ShaderCanvas 与 DemoCard

**Files:**
- Create: `src/components/ui/CanvasErrorBoundary.tsx`
- Modify: `src/components/shader/ShaderCanvas.tsx`（整体重写为薄封装）
- Modify: `src/components/shader/DemoCard.tsx`（包 ErrorBoundary）
- Modify: `src/i18n/index.ts`（加 `canvas.unavailable` 双语 key）
- Test: `tests/unit/CanvasErrorBoundary.test.tsx`

**Interfaces:**
- Consumes: `useShaderCanvas`（Task 10）
- Produces:
  - `CanvasErrorBoundary`（class 组件，`{ children: ReactNode }`）
  - ShaderCanvas 对外 props 签名**不变**：`{ fragmentShader, uniforms?, className?, interactive?, onCompileError? }`（`uniforms` 类型从 `Record<string, number>` 升级为 `UniformSchema`，现调用方传的都是 number，兼容）

- [ ] **Step 1: 写 ErrorBoundary 的失败测试**

`tests/unit/CanvasErrorBoundary.test.tsx`：
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasErrorBoundary } from '../../src/components/ui/CanvasErrorBoundary';

function Bomb(): never {
  throw new Error('boom');
}

describe('CanvasErrorBoundary', () => {
  it('renders children when healthy', () => {
    render(
      <CanvasErrorBoundary>
        <div>fine</div>
      </CanvasErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeTruthy();
  });

  it('shows fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <CanvasErrorBoundary>
        <Bomb />
      </CanvasErrorBoundary>,
    );
    expect(document.querySelector('.webgl-fallback')).toBeTruthy();
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- tests/unit/CanvasErrorBoundary.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 ErrorBoundary + i18n key**

`src/components/ui/CanvasErrorBoundary.tsx`：
```tsx
import { Component } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function Fallback() {
  const { t } = useTranslation();
  return (
    <div
      className="webgl-fallback rounded-lg w-full flex items-center justify-center"
      style={{ aspectRatio: '4 / 3', padding: 24, fontSize: 14 }}
    >
      {t('canvas.unavailable')}
    </div>
  );
}

export class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('Canvas crashed:', error);
  }

  render() {
    return this.state.hasError ? <Fallback /> : this.props.children;
  }
}
```

`src/i18n/index.ts` 在 zh、en 两个资源对象中各加（放在 `webcam` 相关 key 附近）：
```ts
// zh
canvas: { unavailable: '此作品暂时无法展出' },
// en
canvas: { unavailable: 'This artwork is temporarily unavailable' },
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/unit/CanvasErrorBoundary.test.tsx`
Expected: 2 passed

- [ ] **Step 5: 重写 ShaderCanvas 为薄封装**

`src/components/shader/ShaderCanvas.tsx` 整体替换：
```tsx
import { useCallback } from 'react';
import { useShaderCanvas } from '../../hooks/useShaderCanvas';
import type { UniformSchema } from '../../engine/types';

interface ShaderCanvasProps {
  fragmentShader: string;
  uniforms?: UniformSchema;
  className?: string;
  interactive?: boolean;
  onCompileError?: (error: string | null) => void;
}

export function ShaderCanvas({
  fragmentShader,
  uniforms,
  className = '',
  interactive = false,
  onCompileError,
}: ShaderCanvasProps) {
  const { containerRef, rendererRef, active, glError } = useShaderCanvas({
    fragmentShader,
    uniforms,
    interactive,
    canvasClassName: className,
    onCompileError,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
      className="relative w-full overflow-hidden rounded-lg"
      style={{ aspectRatio: '4 / 3' }}
      onMouseMove={handleMouseMove}
    >
      {(!active || glError) && (
        <div className="webgl-fallback rounded-lg" style={{ position: 'absolute', inset: 0 }} />
      )}
    </div>
  );
}
```

`src/components/shader/DemoCard.tsx`：把渲染分支包进 boundary（其余不变）：
```tsx
{variant === 'filter' ? (
  <WebcamCapture fragmentShader={activeSource} uniforms={values} className="w-full" />
) : (
  <CanvasErrorBoundary>
    <ShaderCanvas
      fragmentShader={activeSource}
      uniforms={values}
      interactive={demo.interactive}
      className="w-full"
      onCompileError={setCompileError}
    />
  </CanvasErrorBoundary>
)}
```
并加 import：`import { CanvasErrorBoundary } from '../ui/CanvasErrorBoundary';`

- [ ] **Step 6: 全量验证（含人工视觉走查）**

Run: `npm test && npx tsc -b && npm run lint && npm run build`
Expected: 全绿

Run: `npm run dev`，浏览器打开画廊，确认 shader 卡片正常渲染、参数滑块生效、"查看代码"实时编辑与报错提示正常
Expected: 与迁移前表现一致

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/i18n/index.ts tests/unit/CanvasErrorBoundary.test.tsx
git commit -m "refactor: migrate ShaderCanvas to useShaderCanvas, add CanvasErrorBoundary"
```

---

### Task 12: 迁移 WebcamCapture

**Files:**
- Modify: `src/components/ui/WebcamCapture.tsx`（重写渲染生命周期，保留摄像头与错误 UX）

**Interfaces:**
- Consumes: `useShaderCanvas`（Task 10）。注意：hook 的 `uniforms` 参数接受 `UniformSchema`，现有 `Record<string, number>` 兼容
- Produces: WebcamCapture 对外 props 签名**不变**：`{ fragmentShader, uniforms?, className? }`；错误 key（denied/unavailable/start/nogl/lost/insecure/shader）与重试 UX 不变

- [ ] **Step 1: 重写 WebcamCapture**

要点：组件自己管理 video 元素与 getUserMedia stream 生命周期（挂在 `active` 上）；渲染交给 `useShaderCanvas`；video 元素创建后经 `rendererRef.current?.setVideoTexture(video)` 挂到渲染器（在 video state 变化的 effect 里做）。`fragmentShader`/`uniforms` 同步已由 hook 处理。

整体替换 `src/components/ui/WebcamCapture.tsx`：
```tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShaderCanvas } from '../../hooks/useShaderCanvas';
import type { UniformSchema } from '../../engine/types';

interface WebcamCaptureProps {
  fragmentShader: string;
  uniforms?: UniformSchema;
  className?: string;
}

const ERROR_KEYS = ['denied', 'unavailable', 'start', 'nogl', 'lost', 'insecure', 'shader'] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];

export function WebcamCapture({ fragmentShader, uniforms, className = '' }: WebcamCaptureProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<ErrorKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { containerRef, rendererRef, active, glError } = useShaderCanvas({
    fragmentShader,
    uniforms,
    canvasClassName: className,
    onCompileError: (msg) => {
      if (msg) {
        setError('shader');
        setLoading(false);
      }
    },
  });

  // glError（WebGL 不可用 / context lost）映射到错误态
  useEffect(() => {
    if (glError === 'WebGL not supported') {
      setError('nogl');
      setLoading(false);
    }
  }, [glError]);

  // 摄像头生命周期：active 时开启，失活/卸载时停止
  useEffect(() => {
    if (!active) return;

    if (!navigator.mediaDevices) {
      setError('insecure');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.addEventListener('loadeddata', () => setLoading(false), { once: true });
    videoRef.current = video;
    rendererRef.current?.setVideoTexture(video);

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.play().catch(() => {
          if (!cancelled) {
            setError('start');
            setLoading(false);
          }
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const name = err instanceof DOMException ? err.name : '';
          setError(name === 'NotAllowedError' ? 'denied' : 'unavailable');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      rendererRef.current?.setVideoTexture(null);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      video.pause();
      video.srcObject = null;
      videoRef.current = null;
    };
  }, [active, retryKey, rendererRef]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  };

  if (error) {
    return (
      <div
        className="webgl-fallback rounded-lg w-full"
        style={{
          aspectRatio: '4 / 3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          fontSize: 14,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.27A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.89L15 14m-2 0H5a2 2 0 01-2-2V8a2 2 0 012-2h8a2 2 0 012 2v4z" />
        </svg>
        <span>{t(`webcam.${error}`)}</span>
        {error !== 'lost' && (
          <button onClick={handleRetry} className="btn" style={{ fontSize: 12, padding: '6px 16px' }}>
            {t('webcam.retry')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '4 / 3' }}>
      {(!active || loading) && (
        <div
          className="skeleton"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {loading ? t('webcam.starting') : ''}
          </span>
        </div>
      )}
    </div>
  );
}
```

注意：`'lost'` 状态目前由 onError 文案匹配产生，新实现在 Task 13 的 context-lost 回调里接；本任务先保留 key 与 UX 结构。

- [ ] **Step 2: 全量验证 + 人工走查**

Run: `npm test && npx tsc -b && npm run lint && npm run build`
Expected: 全绿

Run: `npm run dev`，打开 Camera Filters 区块，确认摄像头滤镜正常（授权后画面 + 滤镜生效；拒绝授权显示 denied 提示）
Expected: 与迁移前一致

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/WebcamCapture.tsx
git commit -m "refactor: migrate WebcamCapture to useShaderCanvas video branch"
```

---

### Task 13: 迁移 ShaderBackground + support 工具 + 删除旧文件 + 清除残余 eslint-disable

**Files:**
- Create: `src/engine/support.ts`
- Modify: `src/components/shader/ShaderBackground.tsx`（重写）
- Modify: `src/EntryPage.tsx`（用 support 工具）
- Modify: `src/components/layout/MainLayout.tsx`（WebGL 不可用 fallback）
- Modify: `src/components/shader/ShaderCodeEditor.tsx:92`（修依赖数组，删 disable）
- Modify: `src/hooks/useShaderSource.ts`（重构缓存逻辑，删 disable）
- Modify: `src/components/ui/WebcamCapture.tsx`（接 context-lost → 'lost' 错误态）
- Delete: `src/shader/WebGLRenderer.ts`、`src/utils/webgl.ts`、`src/shader/CanvasPool.ts`

**Interfaces:**
- Consumes: 全部引擎模块与 hook
- Produces:
  - `isWebGLSupported(): boolean`（`src/engine/support.ts`）
  - 旧渲染栈完全移除；仓库零 `!` 断言、零 eslint-disable（用 grep 验证）

- [ ] **Step 1: support.ts**

`src/engine/support.ts`：
```ts
export function isWebGLSupported(): boolean {
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
}
```

`EntryPage.tsx` 第 16-20 行的内联检测替换为：
```ts
useEffect(() => {
  if (!isWebGLSupported()) setWebglOk(false);
}, []);
```
（加 `import { isWebGLSupported } from './engine/support';`）

`MainLayout.tsx`：在组件顶部加 WebGL 支持检测，不支持时渲染静态 fallback：
```tsx
import { isWebGLSupported } from '../../engine/support';
// 组件内：
const [webglOk] = useState(() => isWebGLSupported());
if (!webglOk) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>{t('webgl.unsupported')}</p>
    </div>
  );
}
```
MainLayout 目前没有 useTranslation——加 `import { useTranslation } from 'react-i18next';` 并在组件内 `const { t } = useTranslation();`。i18n 双语 key：
```ts
// zh
webgl: { unsupported: '您的浏览器不支持 WebGL，无法展示这些作品。请使用最新版 Chrome / Edge / Safari 访问。' },
// en
webgl: { unsupported: 'Your browser does not support WebGL. Please visit with the latest Chrome, Edge or Safari.' },
```

- [ ] **Step 2: 重写 ShaderBackground**

`src/components/shader/ShaderBackground.tsx` 整体替换（不走 pool，直接用 GLRenderer + FrameLoop；保留 resize 与离屏暂停）：
```tsx
import { useEffect, useRef, useState } from 'react';
import { GLRenderer } from '../../engine/GLRenderer';
import { FrameLoop } from '../../engine/FrameLoop';
import { detectInitialTier, readDeviceEnvironment } from '../../engine/quality';

interface ShaderBackgroundProps {
  fragmentShader: string;
  className?: string;
}

export function ShaderBackground({ fragmentShader, className }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new GLRenderer(canvas, {
      initialTier: detectInitialTier(readDeviceEnvironment()),
    });
    if (!renderer.init()) {
      setError('WebGL not supported');
      return;
    }
    try {
      renderer.setFragmentShader(fragmentShader);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }

    const resize = () => {
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      renderer.resize();
    };
    window.addEventListener('resize', resize);
    resize();

    const loop = new FrameLoop((timeMs) => renderer.render(timeMs));
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) loop.start();
        else loop.stop();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);
    loop.start();

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
      loop.dispose();
      renderer.dispose();
    };
  }, [fragmentShader]);

  if (error) {
    return <div className="webgl-fallback fixed inset-0" style={{ zIndex: 0 }} />;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full ${className ?? ''}`}
      style={{ zIndex: 0 }}
    />
  );
}
```

- [ ] **Step 3: WebcamCapture 接 context-lost**

在 Task 12 版本的摄像头生命周期 effect 中，`rendererRef.current?.setVideoTexture(video)` 之后加：
```ts
const renderer = rendererRef.current;
renderer?.onContextChange('lost', () => {
  setError('lost');
  setLoading(false);
});
```

- [ ] **Step 4: 修掉剩余 eslint-disable**

`src/components/shader/ShaderCodeEditor.tsx` 初始化 effect（现 92 行）：
```ts
  }, [open, handleChange]);
```
（`handleChange` 已是 useCallback 且其依赖 `onChange` 由 DemoCard 用 useCallback 稳定传入，语义不变。）

`src/hooks/useShaderSource.ts` 整体替换：
```ts
import { useState, useEffect } from 'react';
import { loadSource, getSource } from '../shader/registry';

export function useShaderSource(sourcePath: string): string | null {
  const [source, setSource] = useState<string | null>(() => getSource(sourcePath) ?? null);

  useEffect(() => {
    const cached = getSource(sourcePath);
    if (cached !== undefined) {
      setSource(cached);
      return;
    }
    let cancelled = false;
    void loadSource(sourcePath).then((s) => {
      if (!cancelled) setSource(s);
    });
    return () => {
      cancelled = true;
    };
  }, [sourcePath]);

  return source;
}
```

- [ ] **Step 5: 删除旧文件并验证零引用**

```bash
rm src/shader/WebGLRenderer.ts src/utils/webgl.ts src/shader/CanvasPool.ts
grep -rn "WebGLRenderer\|utils/webgl\|shader/CanvasPool" src/ || echo "CLEAN: no references"
grep -rn "eslint-disable" src/ || echo "CLEAN: no eslint-disable"
grep -rEn "(\w+)!\.|(\w+)!\[|\)!\b" src/ || echo "CLEAN: no non-null assertions"
```
Expected: 三条 CLEAN（如 ShaderCanvas/WebcamCapture 还有旧 import，改为从 `../../hooks/useCanvasSlot` 导入 useCanvasSlot——但按 Task 11/12 的重写它们已不再直接引用，若 grep 命中则按报错修正 import 路径）

- [ ] **Step 6: 全量验证 + 人工走查**

Run: `npm test && npx tsc -b && npm run lint && npm run format:check && npm run build`
Expected: 全绿

Run: `npm run dev` 全站走查：入口页动画 → 进入画廊 → 四个区块渲染 → 实时编辑 → 摄像头滤镜
Expected: 与重构前一致

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy WebGLRenderer stack, add WebGL support fallbacks"
```

---

### Task 14: Playwright 冒烟测试

**Files:**
- Create: `playwright.config.ts`、`tests/e2e/smoke.spec.ts`
- Modify: `package.json`（scripts + devDependencies）

**Interfaces:**
- Consumes: 已迁移完成的站点
- Produces: `npm run test:e2e`；CI（Task 15）将调用它

- [ ] **Step 1: 安装**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: 配置**

`playwright.config.ts`：
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: {
      // CI 无 GPU：允许 SwiftShader 软件渲染 WebGL
      args: ['--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/Portfolio/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

`package.json` scripts 增加：
```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: 写冒烟测试**

`tests/e2e/smoke.spec.ts`：
```ts
import { test, expect } from '@playwright/test';

test.describe('portfolio smoke', () => {
  test('entry page renders WebGL with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
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

  test('entering the gallery renders shader card canvases', async ({ page }) => {
    await page.goto('/Portfolio/');
    await page.locator('.entry-page button').click();
    await expect(page.locator('main')).toBeVisible();
    const cardCanvas = page.locator('canvas.shader-canvas').first();
    await expect(cardCanvas).toBeAttached({ timeout: 10_000 });
    const width = await cardCanvas.evaluate((el) => (el as HTMLCanvasElement).width);
    expect(width).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: 运行确认通过**

Run: `npm run test:e2e`
Expected: 2 passed（若像素断言在 SwiftShader 下不稳定：先把 `waitForTimeout` 加大到 2000ms 再排查，禁止直接删断言）

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/ package.json package-lock.json
git commit -m "test: add Playwright WebGL smoke tests"
```

---

### Task 15: CI quality gate + 最终全量验证

**Files:**
- Modify: `.github/workflows/deploy.yml`（quality job + Node 22 + deploy 依赖）

**Interfaces:**
- Consumes: 此前所有任务提供的命令（lint / format:check / typecheck / test / build / test:e2e / check:shaders）
- Produces: 部署前必须通过完整 quality gate

- [ ] **Step 1: 更新 workflow**

`.github/workflows/deploy.yml` 整体替换：
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Typecheck
        run: npx tsc -b

      - name: Shader conventions
        run: npm run check:shaders

      - name: Unit tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Smoke tests
        run: npm run test:e2e

  deploy:
    needs: quality
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 本地模拟 CI 全量验证**

Run:
```bash
npm run lint && npm run format:check && npx tsc -b && npm run check:shaders && npm test && npm run build && npm run test:e2e
```
Expected: 全部通过（与 CI 相同的命令序列）

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add quality gate (lint, typecheck, tests, e2e) before deploy"
```

- [ ] **Step 4: 确认验收标准**

对照 spec 成功标准逐条确认：
1. `lint && typecheck && test` 全绿，strict 下零 `!`、零 eslint-disable ✓（Task 13 的 grep 验证）
2. CI quality gate 绿才部署 ✓（本任务）
3. 降档可观察 ✓（governor 单测覆盖；真机验证留到子项目 3 性能调优时做）
4. 对外行为不变 ✓（迁移任务的人工走查 + e2e 冒烟）
5. 引擎接口就位且有测试 ✓（Tasks 4-10）

---

## Self-Review 记录

- **Spec 覆盖**：spec 四节（工程基线 T1-3/T15、引擎架构 T4-10、性能治理 T6/T9/T10、错误处理与测试 T5/T11/T13/T14）+ 成功标准逐条映射 ✓
- **接口一致性**：`setQuality`/`init()`/ticket 模式已回写 spec（接口细化注释）；Task 10 的 hook 签名与 Task 11/12 组件用法一致；`UniformSchema` 贯穿 T4→T9→T10→T11 ✓
- **已知接口偏差（有意为之）**：`useShaderCanvas` 的 `onCompileError` 保持 `(string | null)` 而非结构化错误——保持现有编辑器 UX，结构化行号标注留给子项目 3 ✓
