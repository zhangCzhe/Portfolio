# 子项目 2：美术馆设计系统 + 站点重构 — 设计文档

日期：2026-08-08
状态：已经过 brainstorming 逐节确认，待用户最终审阅
依赖：子项目 1（工程基线 + 渲染引擎）已完成并合并

## 背景

shader-portfolio 总重构的第 2 个子项目。子项目 1 已交付分层渲染引擎（`src/engine/` + `src/hooks/useShaderCanvas`）、strict TS、测试与 CI 基线。本子项目在其上做**全站视觉与交互重构**：从 Apple 暗色体系转向"明亮美术馆"，并新增展厅模式 overlay。

**对外行为变化大**（这是与子项目 1 的本质区别）：整个站点的视觉、布局、交互全部重做。

### 已确认决策（brainstorming 逐项选定）

| #   | 问题         | 决策                                                                          |
| --- | ------------ | ----------------------------------------------------------------------------- |
| 1   | 入口页基调   | 浅色统一，无暗入口                                                            |
| 2   | 画廊布局     | 网格画廊墙（取消横向 carousel）                                               |
| 3   | 导航         | 首屏极简馆签 + 滚动后收缩固定栏                                               |
| 4   | 装裱样式     | 经典美术馆装裱（白 mat + 细深色框 + 馆签）                                    |
| 5   | 展厅模式布局 | 左画布 58% + 右栏 27% 单栏滚动                                                |
| 6   | 墙面交互     | 卡片保留参数滑杆；代码只在展厅模式                                            |
| 7   | 字体         | 现代高对比衬线（Playfair Display + 思源宋体）                                 |
| 8   | 入口背景     | 保留全屏 shader，浅色调（本子项目用 nebula 浅色变体占位，正式视觉属子项目 3） |
| 9   | 实现路径     | Token 先行分层构建                                                            |

## 1. 设计系统（Design Tokens）

浅色唯一主题。删除暗色体系：`.light` 覆盖块、`useTheme` hook、导航主题切换按钮、`.glass` 玻璃拟态。

### 色彩

```css
@theme {
  /* 纸白基调 */
  --color-bg-primary: #f7f4ee; /* 纸白（墙面） */
  --color-bg-secondary: #efeadf; /* 稍深纸色（交替展厅） */
  --color-mat: #ffffff; /* 装裱卡纸白 */

  /* 墨色文字 */
  --color-text-primary: #221f18; /* 墨色 */
  --color-text-secondary: #6b6353; /* 灰墨 */
  --color-text-tertiary: #a39a86; /* 淡墨 */

  /* 点缀 */
  --color-accent: #8a6d3b; /* 黄铜（kicker、馆签、active、聚焦态） */
  --color-frame: #3d332a; /* 画框深木色 */
  --color-border: #ddd5c5; /* 纸面分隔线 */

  /* 展厅模式（全站唯一暗空间） */
  --color-room-bg: #101014;
  --color-room-text: rgba(255, 255, 255, 0.92);
  --color-room-accent: #e8b4c8; /* 展厅点缀（滑杆 thumb、标签） */
}
```

### 字体

- 标题：Playfair Display（西文）+ Noto Serif SC / Songti SC / 宋体（中文）
- 正文：EB Garamond（西文）+ 宋体（中文）
- 代码：沿用现有 `--font-mono`
- 加载策略：Google Fonts `<link>` 引入 Playfair Display + EB Garamond + Noto Serif SC；失败回退系统衬线（Georgia / Songti SC / SimSun），不阻塞渲染

### 保留

- 缓动变量 `--ease-enter/move/press`
- `prefers-reduced-motion` 全局降级
- `:focus-visible` 聚焦样式
- 骨架屏 shimmer、WebGL fallback、scrollbar 样式（换色保留机制）

## 2. 信息架构与页面结构

单页无路由（不变）。自上而下：**入口大厅 → 四个展厅（画廊墙）→ 页脚**。

### 入口大厅（EntryHall，重做 EntryPage）

- 全屏浅色 shader 背景（本子项目以现有 nebula.glsl 调浅色变体占位；正式浅色流体视觉属子项目 3）
- 底部左侧：衬线大标题（馆名）+ 小字 label + 进入按钮
- 进入交互保留：点击 / 滚动 / 键盘（wheel deltaY>30、touchstart、ArrowDown/PageDown/Enter/Space）
- WebGL 不可用：静态纸白背景 + 说明文字（沿用检测逻辑 `isWebGLSupported`）

### 导航（MuseumNav 替换 Navigation，双形态）

- **首屏形态**：非固定，一行极简馆签——左衬线馆名，右语言切换。无背景，随滚动画走
- **滚动后形态**：固定顶栏，纸白底 + 1px 纸色底线。左侧四个展厅锚点链接（黄铜 active 态，无 pill 背景），右侧语言切换。framer-motion 滑入/滑出
- 触发：IntersectionObserver 观察入口大厅底部（或 scrollY > 大厅高度），大厅离视口 → 固定栏出现
- 移动端：固定栏收敛为汉堡菜单（交互沿用现有模式，样式换皮）
- 删除：主题切换按钮、玻璃拟态、pill 动画

### 展厅（GalleryWall 替换 CarouselRow）

- 展厅标题区：黄铜 kicker（"第一展厅 / Gallery I"）+ 衬线大标题 + 策展导语（沿用 categories 元数据）
- 画廊墙：CSS grid——桌面 3 列 / 平板 2 列 / 手机 1 列，统一间距
- **series 分组标题不再渲染**：作品在墙内按 series 顺序平铺、平等陈列（series 概念保留在数据层）
- 相邻展厅 bg-primary / bg-secondary 交替
- 删除 CarouselRow 全部逻辑（wheel 转换、拖拽、边缘渐隐、箭头）

### 页脚

细线分隔 + 一行淡墨衬线小字（沿用现有文案）。

## 3. 装裱卡片（FramedArtwork 替换 DemoCard）

自上而下结构：

1. **装裱区**：白 mat padding（`--color-mat`）+ 1px `--color-frame` 细框 + 柔和投影；内部 4:3 活 shader 画布（沿用 `useShaderCanvas`；相机滤镜展厅换 `WebcamCapture`）
2. **馆签**：作品名（衬线粗体）+ 一行小字 `Fragment Shader · 2026`；中文环境显示中文名
3. **参数滑杆区**：沿用 `ShaderControls`，样式换为美术馆风（黄铜 thumb、细轨道）
4. **点击进入展厅**：画布区 onClick → 打开 FocusRoom；滑杆区点击不触发（事件隔离）

**移除**：卡片上的"查看代码"按钮与 `ShaderCodeEditor` 内嵌——代码只在展厅模式。

## 4. 展厅模式（FocusRoom）

全站唯一暗空间。全屏 overlay，任意时刻最多一个。

### 打开 / 关闭

- 打开：点击画廊墙作品画布区
- 关闭：右上角 ×、Esc、点击画布外暗区；关闭后回到原滚动位置
- 打开时锁定背景滚动（body overflow hidden）

### 布局（桌面）

- 背景：`--color-room-bg`，透明度 ~97%（隐约透出背后画廊）
- **左侧 58%**：大画布，`useShaderCanvas` 独立 context（进展厅新建、关闭销毁）；滤镜作品换 `WebcamCapture`
- **右栏 27%**，单栏滚动，自上而下：
  1. 黄铜 kicker（所属展厅名）+ 衬线作品名 + 媒介/年份小字
  2. 策展文案（复用 descriptionZh/description；深化属子项目 3）
  3. 参数面板（`ShaderControls` 暗色换皮，room-accent 滑杆）
  4. 代码（`ShaderCodeEditor` 直接展开，CodeMirror 暗色主题，`ShaderCompileError` 行内标注沿用）
- 移动端：上下堆叠——画布 50vh 在上，右栏内容在下滚动

### 过渡动画

- 打开：画廊整体渐暗 + 展厅从中心淡入（200–300ms，`--ease-enter`），framer-motion `AnimatePresence` 管理
- 关闭：反向
- `prefers-reduced-motion`：直接闪现

### 状态隔离

展厅内调参数只影响展厅画布，**不回写**卡片滑杆状态（两处独立上下文，关闭展厅后卡片保持原状）——避免状态镜像复杂度。

## 5. 数据流

- `App`：`entered` 状态不变
- `MainLayout`：新增 `focusedDemo: ShaderDemo | null`；画廊墙画布区 onClick 冒泡设置，FocusRoom 关闭置 null
- FocusRoom 打开即挂载、关闭即卸载（无缓存）。WebGL context 预算：5 卡片池 + 1 背景 + 1 展厅，远低于浏览器上限
- i18n：展厅模式全部文本走 i18n，新增 key 见下

### i18n 新增 key

```
museum.name        馆名，固定值 "Shader 美术馆" / "Shader Museum"
museum.hall        kicker 用展厅前缀（"第X展厅" / "Gallery X"，X ∈ 一二三四 / I II III IV）——替换现 PART_NUMS "第X部分"
artwork.medium     "Fragment Shader"（媒介标注，馆签与展厅共用）
focus.close        关闭按钮 aria-label
```

现有 `nav.*`、`common.*`、`editor.*`、`webcam.*`、`canvas.*`、`webgl.*` key 全部保留。

## 6. 错误处理

- FocusRoom 画布编译失败 → `CanvasErrorBoundary`，展厅内显示"此作品暂时无法展出"占位，关闭操作不受影响
- WebGL 不可用 → MainLayout 顶层 fallback 沿用（样式换皮为纸白）
- 展厅内编辑代码编译错误 → `ShaderCompileError` 行内标注（暗色主题下保持可读）

## 7. 测试

### Vitest

- MuseumNav：双形态切换逻辑（observer/scroll 触发）
- FramedArtwork：画布区点击开进展厅、滑杆区点击不触发（事件隔离）
- FocusRoom：打开/关闭/Esc/背景锁定状态机

### Playwright 冒烟扩展

- 现有：首页零 console error、入口 canvas 非纯黑、画廊 canvas 有渲染
- 新增：点击作品 → 展厅打开 → 展厅画布渲染出像素 → Esc 关闭 → 回到画廊

### 人工视觉走查（merge 前）

入口大厅 → 滚动出导航 → 画廊墙网格 → 进展厅 → 调参数 → 看代码 → 关闭 → 移动端形态

## 组件替换总表

| 新组件           | 替换/来源             | 说明                      |
| ---------------- | --------------------- | ------------------------- |
| `FramedArtwork`  | `DemoCard`            | 白 mat 装裱 + 馆签 + 滑杆 |
| `GalleryWall`    | `CarouselRow`（删除） | CSS grid                  |
| `GallerySection` | `ShaderSection`       | 展厅标题区 + 画廊墙       |
| `MuseumNav`      | `Navigation`          | 双形态                    |
| `FocusRoom`      | 全新                  | 展厅模式 overlay          |
| `EntryHall`      | `EntryPage` 重做      | 浅色大厅                  |

保留不动：`ShaderCanvas`、`WebcamCapture`、`ShaderControls`（样式换皮）、`ShaderCodeEditor`（移入展厅，暗色主题）、`CanvasErrorBoundary`、`useShaderCanvas` 及全部引擎模块、registry/categories 数据层。

## 成功标准

1. `npm run lint && npx tsc -b && npm test && npm run test:e2e` 全绿
2. 全站浅色唯一主题；展厅模式为唯一暗空间
3. 装裱卡片网格墙渲染全部现有作品；点击进入展厅、Esc 关闭（e2e 背书）
4. 零 `!` 断言、零 eslint-disable（延续子项目 1 基线）
5. 人工视觉走查清单全部通过

## Out of Scope（留给子项目 3）

- shader 内容增删、视觉升级、新增高级效果（流体、ray marching）
- 策展文案撰写与深化
- 入口大厅正式浅色 shader 视觉（本子项目用 nebula 浅色变体占位）
- uniform 参数元数据 schema 深化、参数面板控件升级
