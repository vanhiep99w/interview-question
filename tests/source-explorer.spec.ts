import { expect, test } from '@playwright/test';

const doc = '/web/03-webpack-tu-source-den-trinh-duyet/';
const entry = '?source=webpack-react-demo&file=webpack.config.cjs&region=entry';

test('loads lazily, highlights a region, switches files, copies and restores reading position', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/source-examples/')) requests.push(request.url()); });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: {
      writeText: async (text: string) => { (window as Window & { copied?: string }).copied = text; },
    } });
  });
  await page.goto(doc);
  const ref = page.getByRole('link', { name: 'Xem cấu hình entry' });
  await ref.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  expect(requests).toHaveLength(0);
  await ref.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.is-highlighted')).toHaveCount(1);
  await expect(dialog.locator('.is-highlighted')).toContainText("entry: './src/main.tsx'");
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { copied?: string }).copied)).toContain('region=entry');
  await page.getByRole('navigation', { name: 'Files của project' }).getByRole('button', { name: 'App.tsx' }).click();
  await expect(dialog.locator('.source-code')).toContainText('useState');
  await expect(page).toHaveURL(/file=src%2FApp.tsx/);
  await expect(dialog.locator('.is-highlighted')).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy file', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { copied?: string }).copied)).toContain('export function App()');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(doc);
  await expect(ref).toBeFocused();
  expect(Math.abs(await page.evaluate(() => window.scrollY) - scroll)).toBeLessThan(4);
  await page.goForward();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.source-code')).toContainText('export function App()');
});

test('deep links work from another doc, reload and retain unrelated query/hash on close', async ({ page }) => {
  const url = '/web/02-frontend-build-tooling/?keep=yes&source=webpack-react-demo&snapshot=async-bootstrap&file=src%2Fmain.tsx&lines=1-4#test-anchor';
  await page.goto(url);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.is-highlighted')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('.is-highlighted')).toHaveCount(4);
  await page.getByRole('button', { name: 'Đóng source explorer' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page).toHaveURL('/web/02-frontend-build-tooling/?keep=yes#test-anchor');
});

test('mobile has a file picker and snapshot switch with a safe default file', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${doc}${entry}`);
  await expect(page.locator('.is-highlighted')).toHaveCount(1);
  await expect(page.getByRole('combobox', { name: 'Chọn file source' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Phiên bản source' }).selectOption('async-bootstrap');
  await expect(page.locator('.source-code')).toContainText("'./bootstrap'");
  await page.getByRole('combobox', { name: 'Chọn file source' }).selectOption('src/bootstrap.tsx');
  await expect(page.locator('.source-code')).toContainText('createRoot(element)');
  await page.getByRole('combobox', { name: 'Phiên bản source' }).selectOption('basic');
  await expect(page.locator('.source-file-tab')).toContainText('webpack.config.cjs');
  expect(await page.locator('.source-drawer').evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Đóng source explorer' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('invalid references fail gracefully and a failed request can be retried', async ({ page }) => {
  await page.route('**/source-examples/manifest.json', (route) => route.fulfill({ status: 503 }));
  await page.goto(`${doc}${entry}`);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Không tải được source');
  await page.unroute('**/source-examples/manifest.json');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.locator('.is-highlighted')).toHaveCount(1);
  await page.goto(`${doc}?source=webpack-react-demo&file=missing.ts`);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Không tìm thấy file');
  await page.getByRole('navigation', { name: 'Files của project' }).getByRole('button', { name: 'App.tsx' }).click();
  await expect(page.locator('.source-code')).toContainText('useState');
  await page.goto(`${doc}${entry.replace('region=entry', 'region=missing')}`);
  await expect(page.locator('.source-reference-error')).toContainText('không còn tồn tại');
});

test('floating button toggles a non-modal drawer and remembers the selected file', async ({ page }) => {
  await page.goto(doc);
  const launcher = page.getByRole('button', { name: 'Mở source code', exact: true });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  await launcher.click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toHaveAttribute('aria-modal', 'false');
  await expect(page.locator('.source-code')).toContainText('module.exports');
  await page.getByRole('navigation', { name: 'Files của project' }).getByRole('button', { name: 'App.tsx' }).click();
  await page.getByRole('button', { name: 'Thu source code', exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await launcher.click();
  await expect(page.locator('.source-code')).toContainText('export function App()');
  // References in the article stay usable while the source panel is open.
  await page.getByRole('link', { name: 'Xem cấu hình entry' }).click();
  await expect(page.locator('.is-highlighted')).toContainText("entry: './src/main.tsx'");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  const previousScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.move(360, 400);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(previousScroll + 100);
  await page.goBack();
  await expect(drawer).not.toBeVisible();
});

test('keyboard can leave the drawer and Escape closes it without a focus trap', async ({ page }) => {
  await page.goto(doc);
  await page.getByRole('button', { name: 'Mở source code', exact: true }).click();
  const close = page.getByRole('button', { name: 'Đóng source explorer' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Thu source code', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở source code', exact: true })).toBeFocused();
});

test('pages without source references do not show an unrelated source button', async ({ page }) => {
  await page.goto('/behavioral/01-production-server-down/');
  await expect(page.getByRole('button', { name: 'Mở source code', exact: true })).toHaveCount(0);
});
