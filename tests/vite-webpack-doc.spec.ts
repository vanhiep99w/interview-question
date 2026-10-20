import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const route = '/web/05-vite-vs-webpack/';
const title = 'Vite và webpack: khác biệt từ dev server đến production build';

test('Vite comparison is an explainer with a complete, working manual TOC', async ({ page, request }) => {
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: /^(Câu hỏi|Trả lời)$/ })).toHaveCount(0);

  const toc = await page.evaluate(() => {
    const tocHeading = document.getElementById('mục-lục');
    const headings = Array.from(tocHeading?.parentElement?.querySelectorAll('h2[id], h3[id]') ?? []);
    const list = tocHeading?.nextElementSibling;
    return {
      tag: list?.tagName,
      expected: headings.filter((heading) => heading !== tocHeading).map((heading) => heading.id),
      actual: Array.from(list?.querySelectorAll('a') ?? []).map((link) =>
        decodeURIComponent(link.hash.slice(1))),
    };
  });
  expect(toc.tag).toBe('UL');
  expect(toc.actual).toEqual(toc.expected);
  expect(toc.expected.length).toBeGreaterThan(15);

  const source = await readFile('content/docs/web/05-vite-vs-webpack.mdx', 'utf8');
  for (const [, href] of source.matchAll(/href="(\/web\/[^"#]+)"/g)) {
    expect((await request.get(href)).ok(), href).toBeTruthy();
  }
  const search = await request.get('/api/search');
  expect(search.ok()).toBeTruthy();
  expect(await search.text()).toContain('/web/05-vite-vs-webpack');
});

test('comparison opens the runnable lab at its lazy import and copies the actual Vite config', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(route);
  await page.getByRole('link', { name: 'hàm openAdmin trong React component', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('src/App.tsx');
  await expect(page.locator('.is-highlighted').filter({ hasText: "await import('./admin')" })).toBeVisible();
  await page.getByRole('link', { name: 'vite.config.ts', exact: true }).first().click();
  await expect(page.locator('.source-code')).toContainText('manifest: true');
  await page.getByRole('button', { name: 'Copy file', exact: true }).click();
  const config = await readFile('examples/frontend-build-lab/vite.config.ts', 'utf8');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(config);
});

test('both dev flows export light/dark SVG with a local embedded webpack icon', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  const diagrams = page.locator('.d2-diagram');
  await expect(diagrams).toHaveCount(2);
  await expect(page.locator('.d2-diagram-light > svg')).toHaveCount(2);
  await expect(page.locator('.d2-diagram-dark > svg')).toHaveCount(2);
  await expect(diagrams.first().locator('image').first()).toHaveAttribute('href', /^data:image\/svg\+xml/);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }, theme);
    await expect(page.locator(`.d2-diagram-${theme} > svg`).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('comparison remains readable on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
  await expect(page.locator('.d2-diagram-light > svg')).toHaveCount(2);
  await expect(page.locator('.d2-diagram-light').first()).toContainText('webpack compiler');
  await expect(page.locator('.d2-diagram-light').nth(1)).toContainText('Vite dev server');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await context.close();
});
