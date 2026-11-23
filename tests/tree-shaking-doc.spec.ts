import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const route = '/web/06-tree-shaking-class-vs-function/';

test('tree shaking lesson renders its diagram, diff and measured transcript', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator('#nd-page h1')).toHaveCount(1);
  await expect(page.locator('#nd-page svg').filter({ hasText: 'class ApiClient' }).first()).toBeVisible();
  await expect(page.locator('.code-diff')).toContainText('export function getComments(baseUrl, postId)');
  await expect(page.locator('.terminal-session')).toContainText('All checks passed.');
  expect(errors).toEqual([]);
});

test('tree shaking lesson opens the runnable lab sources', async ({ page }) => {
  await page.goto(route);
  await page.getByRole('link', { name: 'toàn bộ class trong lab', exact: true }).click();
  await expect(page.locator('.source-file-tab')).toContainText('src/class/api.js');
  await expect(page.locator('.source-code')).toContainText('searchUsers(keyword)');
  await page.getByRole('link', { name: 'package.json', exact: true }).first().click();
  await expect(page.locator('.source-code')).toContainText('node measure.mjs --check');
});

test('sizes quoted in the lesson match the transcript of the lab run', async () => {
  const source = await readFile('content/docs/web/06-tree-shaking-class-vs-function.mdx', 'utf8');
  const transcript = source.split('```terminal-session')[1].split('```')[0];
  const cell = (row: string, column: number) =>
    transcript.match(new RegExp(`│ ${row}\\s+│(.*)│`))![1].split('│')[column].trim().replace(/'/g, '');
  expect(source).toContain(`| \`class ApiClient\` | ${[0, 1, 2, 3].map((i) => cell('class', i)).join(' | ')} |`);
  expect(source).toContain(`| Mười \`export function\` | ${[0, 1, 2, 3].map((i) => cell('functions', i)).join(' | ')} |`);
  expect(source).toContain(`| \`export const api = { ... }\` | ${[0, 1, 2, 3].map((i) => cell('object', i)).join(' | ')} |`);
  expect([0, 1, 2, 3].map((i) => cell('namespace', i))).toEqual([0, 1, 2, 3].map((i) => cell('functions', i)));
});
