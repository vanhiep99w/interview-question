import { expect, test } from '@playwright/test';

const route = '/security/02-ssl-tls/';

test('TLS lesson preserves its route and every manual TOC link resolves', async ({ page }) => {
  await page.goto(route);
  const article = page.locator('#nd-page');
  await expect(article.locator('h1')).toHaveCount(1);
  await expect(article.locator('h1')).toHaveText('SSL/TLS: từ nền tảng đến triển khai HTTPS và mTLS');
  for (const legacyHeading of ['Câu hỏi', 'Dành cho level', 'Câu trả lời mẫu', 'Câu hỏi follow-up']) {
    await expect(article.getByRole('heading', { name: legacyHeading, exact: true })).toHaveCount(0);
  }

  const toc = await page.evaluate(() => {
    const heading = document.getElementById('mục-lục');
    const list = heading?.nextElementSibling;
    if (list?.tagName !== 'UL') throw new Error('Manual TOC must follow its heading');
    const links = [...list.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    return {
      links: links.length,
      missing: links.map((a) => decodeURIComponent(a.hash.slice(1)))
        .filter((id) => !document.getElementById(id)),
      headings: [...document.querySelectorAll('#nd-page h2, #nd-page h3')]
        .filter((h) => h.id && h.id !== 'mục-lục')
        .map((h) => h.id),
      targets: links.map((a) => decodeURIComponent(a.hash.slice(1))),
    };
  });
  expect(toc.links).toBeGreaterThan(60);
  expect(toc.missing).toEqual([]);
  expect(toc.targets).toEqual(toc.headings);
});

test('TLS diagrams render in light and dark without client errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  const diagrams = page.locator('#nd-page .d2-diagram');
  await expect(diagrams).toHaveCount(3);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(value);
    }, theme);
    for (const diagram of await diagrams.all()) {
      await expect(diagram.locator('.d2-diagram-' + theme + ' > svg')).toBeVisible();
    }
  }
  await expect(page.locator('#nd-page')).toContainText('CertificateVerify');
  expect(errors).toEqual([]);
});

test('TLS explanation and lab remain readable on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(route);
  for (const diagram of await page.locator('#nd-page .d2-diagram').all()) {
    await expect(diagram).toBeVisible();
  }
  await expect(page.locator('#nd-page')).toContainText('-verify_return_error');
  await expect(page.locator('#nd-page')).toContainText('--cert client.crt --key client.key');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await context.close();
});
