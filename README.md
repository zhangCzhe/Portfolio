# Portfolio — Shader Gallery

Interactive WebGL fragment shader portfolio. 40+ procedural shaders across 4 categories, with live code editing, webcam filters, and responsive design.

## Categories

- **Shader Basics** — Colors, SDF shapes, patterns, noise, fractals, lighting, coordinate transforms
- **Painting Recreations** — Starry Night, Water Lilies, The Great Wave, and more
- **Interactive Effects** — Particle systems, flow fields, ink diffusion, Game of Life
- **Camera Filters** — Grayscale, sepia, edge detection, halftone, glitch, kaleidoscope

## Features

- Real-time GLSL code editing with compile error display
- WebGL context pooling (max 6 concurrent contexts)
- Lazy-loaded shader chunks via Vite code splitting
- Responsive layout with mobile hamburger navigation
- Mouse wheel horizontal carousel scrolling
- Dark/light theme + zh/en i18n

## Tech Stack

React 19 · TypeScript · Vite 8 · Tailwind v4 · WebGL2 · CodeMirror 6 · framer-motion · i18next

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
