import { expect, test } from '@playwright/test';

test('SharedWorker article links to the client, connection manager and local backend', async ({ page }) => {
  await page.goto('/web/02-shared-worker-websocket/');
  await page.getByRole('link', { name: 'connectPort', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('src/connection-manager.ts');
  await expect(page.locator('.is-highlighted').filter({ hasText: 'export function connectPort' })).toBeVisible();
  await page.getByRole('link', { name: 'Transport', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('src/realtime-client.ts');
  await expect(page.locator('.is-highlighted').filter({ hasText: "this.mode = 'dedicated'" })).toBeVisible();
  await page.getByRole('link', { name: 'server.mjs', exact: true }).first().click();
  await expect(page.locator('.source-code')).toContainText('LOCAL LAB ONLY');
  await expect(page.locator('.source-code')).toContainText('/api/realtime/ticket');
});

test('build tooling article links to the exact Vite lab and lazy import region', async ({ page }) => {
  await page.goto('/web/02-frontend-build-tooling/');
  await page.getByRole('link', { name: 'dynamic import trong App', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('src/App.tsx');
  await expect(page.locator('.is-highlighted').filter({ hasText: "await import('./admin')" })).toBeVisible();
  await page.getByRole('link', { name: 'vite.config.ts', exact: true }).first().click();
  await expect(page.locator('.source-code')).toContainText('manifest: true');
  await page.getByRole('link', { name: 'package.json', exact: true }).first().click();
  await expect(page.locator('.source-code')).toContainText('npm run typecheck && vite build');
});
