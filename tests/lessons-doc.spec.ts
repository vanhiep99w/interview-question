import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const lessons = [
  '/caching/01-redis-vs-memcached/',
  '/database/01-sql-vs-nosql/',
  '/java/02-bulk-upsert-billion-rows/',
  '/system-design/02-geo-latency-60ms-vs-6s/',
  '/system-design/03-scale-1k-to-50k-users/',
  '/system-design/04-cqrs/',
  '/system-design/05-webhook-delivery-system/',
  '/system-design/06-resumable-excel-import/',
  '/web/01-cors/',
  '/web/02-shared-worker-websocket/',
];

test('all authored and exported lessons satisfy the content contract', () => {
  expect(execFileSync(process.execPath, ['scripts/check-content.mjs', '--export'], {
    encoding: 'utf8', timeout: 30_000,
  })).toContain('Content contract passed: 24 lessons');
});

for (const route of lessons) {
  test(`${route} is a navigable explainer with readable themed diagrams`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator('#nd-page h1')).toHaveCount(1);
    await expect(page.getByRole('heading', {
      name: /^(Câu hỏi|Trả lời|Câu trả lời mẫu|Dành cho level|Câu hỏi follow-up)(?:$| Copy Anchor Link)/,
    })).toHaveCount(0);
    const toc = await page.evaluate(() => {
      const list = document.getElementById('mục-lục')?.nextElementSibling;
      return {
        links: [...(list?.querySelectorAll('a') ?? [])].map((a) => decodeURIComponent(a.hash.slice(1))),
        headings: [...document.querySelectorAll('#nd-page h2[id], #nd-page h3[id]')]
          .filter((node) => node.classList.contains('group/heading'))
          .map((node) => node.id).filter((id) => id !== 'mục-lục'),
      };
    });
    expect(toc.links.length).toBeGreaterThan(10);
    expect(toc.links).toEqual(toc.headings);
    for (const diagram of await page.locator('.d2-diagram').all()) {
      await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
      for (const icon of await diagram.locator('image').all()) {
        await expect(icon).toHaveAttribute('href', /^data:image\/svg\+xml/);
      }
    }
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    for (const diagram of await page.locator('.d2-diagram').all()) {
      await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}

test('rewritten explanations remain readable without JavaScript on narrow screens', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    for (const route of lessons) {
      await page.goto(route);
      await expect(page.locator('#mục-lục')).toBeVisible();
      for (const svg of await page.locator('.d2-diagram-light > svg').all()) await expect(svg).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBeTruthy();
    }
  } finally {
    await context.close();
  }
});
