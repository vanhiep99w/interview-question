import { expect, test } from '@playwright/test';

test('navigating to another article clears its predecessor’s drawer and source button', async ({ page }) => {
  await page.goto('/web/03-webpack-tu-source-den-trinh-duyet/');
  await page.getByRole('button', { name: 'Mở source code', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('link', { name: 'Interview Questions', exact: true }).click();
  await expect(page).toHaveURL(/\/behavioral\/01-production-server-down\/?$/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Mở source code', exact: true })).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveAttribute('data-source-drawer-open');
});
