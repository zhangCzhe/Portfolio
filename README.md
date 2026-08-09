# Shader 美术馆 · Shader Museum

[**shader-museum.zhangczhe.com**](https://zhangczhe.github.io/Portfolio/) — 将片段着色器作为数字艺术品，陈列在一座线上美术馆中。

Interactive WebGL fragment shader portfolio presented as a museum gallery. 30 exhibition-grade procedural shaders across 4 halls, with real-time parameters, live code editing in focus mode, webcam filters, and responsive museum layout.

## 展厅 · Halls

- **第一展厅 · Shader 基础** — 色彩渐变、极坐标、分形、折射、域扭曲、六边形环
- **第二展厅 · 名画重现** — 星月夜、睡莲、日出印象、蒙德里安、康定斯基、神奈川冲浪里、罗斯科、波洛克、达利软钟、克里姆特金箔
- **第三展厅 · 交互特效** — 星云漩涡、极光流场、水墨扩散、生态演化、反应扩散、分形火焰
- **第四展厅 · 镜头滤镜** — 专业黑白、时光胶囊、多风格线条、CMYK 半色调、万花筒、故障艺术

## 特性 · Features

- 经典美术馆装裱（白 mat + 细深色框 + 馆签）+ 3 列画廊墙网格
- 双形态导航：首屏馆签 → 滚动后固定纸白导航栏
- 展厅模式：左大画布 + 右栏参数/代码编辑，AnimatePresence 进出动画
- 参数系统：float 滑杆 + 取色器（vec3），每个 demo ≥3 个预设
- 鼠标交互：名画会"动"——流星拖尾、涟漪扩散、巨浪翻涌、颜料泼溅
- 中英双语全量切换
- WebGL2 context pooling + SwiftShader e2e

## 技术栈 · Tech Stack

React 19 · TypeScript strict · Vite 8 · Tailwind v4 · WebGL2 · CodeMirror 6 · framer-motion · i18next · Playwright

## 开发 · Development

```bash
npm install
npm run dev        # localhost:5173
npm run build      # 构建到 dist/
npm test           # 91 单测
npm run test:e2e   # 6 e2e (SwiftShader)
```
