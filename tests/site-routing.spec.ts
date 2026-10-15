import { expect, test } from '@playwright/test';

test('the exported root redirects to the default document and serves the legacy favicon', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/behavioral\/01-production-server-down\/?$/);
  const favicon = await request.get('/favicon.ico');
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()['content-type']).toContain('image/x-icon');
  expect((await favicon.body()).subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
  expect((await request.get('/this-page-does-not-exist/')).status()).toBe(404);
});
