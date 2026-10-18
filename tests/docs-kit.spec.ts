import { expect, test } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

test('every D2 fence is exported as light/dark SVG, with no Mermaid runtime', async ({ request }) => {
  const root = 'content/docs';
  let diagrams = 0;
  for (const entry of await readdir(root, { recursive: true })) {
    if (!entry.endsWith('.mdx')) continue;
    const source = await readFile(path.join(root, entry), 'utf8');
    expect(source).not.toMatch(/^```mermaid\b/m);
    const count = [...source.matchAll(/^```d2\b/gm)].length;
    if (!count) continue;
    diagrams += count;
    const response = await request.get(`/${entry.replace(/\.mdx$/, '')}/`);
    expect(response.ok(), entry).toBeTruthy();
    const html = await response.text();
    expect((html.match(/class="d2-diagram-light"/g) ?? []).length, entry).toBeGreaterThanOrEqual(count);
    expect((html.match(/class="d2-diagram-dark"/g) ?? []).length, entry).toBeGreaterThanOrEqual(count);
    expect(html).not.toContain('language-d2');
    expect(html).not.toContain('mermaid');
  }
  expect(diagrams).toBeGreaterThan(90);
});

test('D2 controls zoom, expand, switch theme and preserve source drawer links', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/web/04-module-federation-react-vue-microfrontend/');
  const diagram = page.locator('.d2-interactive').first();
  await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
  await expect(diagram.locator('image').first()).toHaveAttribute('href', /^data:image\/svg\+xml/);
  await diagram.getByRole('button', { name: /^Explore diagram:/ }).click();
  await expect(diagram.locator('.d2-viewer')).toBeVisible();
  const zoom = diagram.getByRole('button', { name: 'Reset zoom' });
  const before = await zoom.textContent();
  await diagram.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(zoom).not.toHaveText(before!);
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
  await expect(diagram.locator('.d2-diagram-light')).toBeHidden();
  await diagram.getByRole('button', { name: /Expand/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'remotes của shell', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('shell/webpack.config.cjs');
  expect(errors).toEqual([]);
});

test('failover diagram exposes before/after scenarios', async ({ page }) => {
  await page.goto('/system-design/01-distributed-system-terms/');
  const diagram = page.locator('.d2-interactive').filter({ has: page.locator('figcaption', { hasText: 'Failover: promote replica' }) });
  await diagram.getByRole('button', { name: /^Explore diagram:/ }).click();
  await diagram.getByRole('tab', { name: 'Sau failover' }).click();
  await expect(diagram.getByRole('tab', { name: 'Sau failover' })).toHaveAttribute('aria-selected', 'true');
  await expect(diagram.getByRole('tabpanel')).toContainText('Primary B');
});

test('HTTP transcript, terminal commands, real source diff and waterfall are readable', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/web/01-cors/');
  await expect(page.locator('.protocol-exchange')).toContainText('Access-Control-Allow-Origin');
  await expect(page.locator('.protocol-exchange')).toContainText('"items"');
  await page.goto('/behavioral/01-production-server-down/');
  await page.getByRole('button', { name: 'Sao chép lệnh bước 1', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('kubectl describe pod <pod-name> -n production | grep -A5 "Last State"');
  await page.goto('/web/03-webpack-tu-source-den-trinh-duyet/');
  const diff = page.locator('.code-diff');
  await expect(diff).toHaveAttribute('data-view', 'split');
  await expect(diff).toContainText('createRoot');
  await expect(diff).toContainText("'./bootstrap'");
  await diff.getByRole('button', { name: 'Sao chép bản sau', exact: true }).click();
  const entrySource = await readFile('examples/webpack-react-demo/async-bootstrap/src/main.tsx', 'utf8');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(entrySource);
  await diff.getByRole('button', { name: 'Inline', exact: true }).click();
  await expect(diff).toHaveAttribute('data-view', 'inline');
  await page.goto('/database/05-long-running-transaction/');
  await expect(page.locator('.span-waterfall')).toContainText('Trace minh họa');
  await expect(page.locator('.span-waterfall [data-span="payment"]')).toContainText('8000 ms');
});

test('mobile diagrams scroll internally and remain readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/security/02-ssl-tls/');
  await expect(page.locator('.d2-diagram').first()).toBeVisible();
  const handshake = page.locator('.d2-diagram').filter({ has: page.locator('figcaption', { hasText: 'TLS 1.3 full handshake' }) });
  await expect(handshake.locator('.d2-diagram-light')).toContainText('CertificateVerify');
  await expect(handshake.locator('.d2-diagram-light')).toContainText('Tính shared secret; verify chain, SAN, signature, Finished');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.goto('/web/01-cors/');
  await expect(page.locator('.protocol-exchange')).toContainText('Access-Control-Allow-Origin');
  await page.goto('/database/05-long-running-transaction/');
  await page.locator('.span-waterfall-table-disclosure summary').click();
  await expect(page.locator('.span-waterfall table')).toContainText('Payment API');
  await context.close();
});
