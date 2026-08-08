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
