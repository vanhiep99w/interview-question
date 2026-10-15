import { expect, test } from '@playwright/test';

test('navigating to another article clears its predecessor’s drawer and source button', async ({ page }) => {
  await page.goto('/web/03-webpack-tu-source-den-trinh-duyet/');
  await page.getByRole('button', { name: 'Mở source code', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('link', { name: 'Frontend build tooling: pipeline và từng công cụ', exact: true }).click();
  await expect(page).toHaveURL(/\/web\/02-frontend-build-tooling\/?$/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở source code', exact: true })).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveAttribute('data-source-drawer-open');
});
