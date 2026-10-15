import { expect, test } from '@playwright/test';

const doc = '/web/04-module-federation-react-vue-microfrontend/';

test('Federation guide references both complete app configs and Vue SFC source', async ({ page }) => {
  await page.goto(doc);
  await expect(page.getByRole('heading', { name: 'Module Federation: microfrontend React và Vue', exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'remotes của shell', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('shell/webpack.config.cjs');
  await expect(page.locator('.is-highlighted').filter({ hasText: 'remotes:' })).toContainText('vueSub');
  await page.getByRole('link', { name: 'exposes của Vue', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('vue-sub/webpack.config.cjs');
  await expect(page.locator('.is-highlighted').filter({ hasText: 'exposes:' })).toContainText('./src/mount.ts');
  await page.getByRole('link', { name: 'CatalogApp.vue', exact: true }).first().click();
  await expect(page.locator('.source-code')).toContainText('<script setup lang="ts">');
  await expect(page.locator('.source-code')).toContainText('<RouterView />');
  await page.getByRole('link', { name: 'Preview server', exact: true }).first().click();
  await expect(page.locator('.source-file-tab')).toContainText('scripts/preview.mjs');
  await expect(page.locator('.source-code')).toContainText('createServer');
});

test('the previous Webpack advanced URL redirects to the renamed Federation article', async ({ page }) => {
  await page.goto('/web/04-webpack-react-shell-vue-remote/');
  await expect(page).toHaveURL(/\/web\/04-module-federation-react-vue-microfrontend\/?$/);
  await expect(page.getByRole('button', { name: 'Mở source code', exact: true })).toBeVisible();
});
