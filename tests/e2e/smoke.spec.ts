import { test, expect } from '@playwright/test';

// Google Fonts 在离线/内网环境加载失败会打 console error，与站点本身无关，过滤
function isFontResourceError(url: string | undefined): boolean {
  return (
    url !== undefined && (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com'))
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

  test('clicking an artwork opens the focus room; Escape returns to the wall', async ({ page }) => {
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
