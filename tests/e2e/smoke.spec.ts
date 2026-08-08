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
