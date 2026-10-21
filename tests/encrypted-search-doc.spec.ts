import { expect, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const route = '/database/04-fuzzy-search-encrypted-column/';
const lesson = 'content/docs/database/04-fuzzy-search-encrypted-column.mdx';

// Execute the published code itself, not a duplicate implementation.
test('the encrypted-search demo runs and preserves its expected false-negative test', async () => {
  const source = await readFile(lesson, 'utf8');
  const code = source.match(/```js title="encrypted-name-search\.mjs"\n([\s\S]*?)\n```/)?.[1];
  expect(code).toBeTruthy();
  const directory = await mkdtemp(path.join(os.tmpdir(), 'encrypted-search-doc-'));
  try {
    const file = path.join(directory, 'encrypted-name-search.mjs');
    await writeFile(file, code!);
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [file]);
    expect(stderr).toBe('');
    expect(stdout.trim().split('\n')).toEqual([
      '[{"id":1,"name":"Nguyễn","distance":1}]',
      'All demo checks passed; cat/cut is an expected false negative.',
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('encrypted-search lesson is an explainer with complete TOC and working copy/related links', async ({
  page, context, request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator('#nd-page h1')).toHaveCount(1);
  await expect(page.locator('#nd-page h1')).toHaveText(
    'Fuzzy search trên dữ liệu mã hóa: thiết kế từ nhu cầu đến vận hành',
  );
  await expect(page.getByRole('heading', {
    name: /^(Câu hỏi|Câu trả lời mẫu|Dành cho level|Trả lời)(?:$| Copy Anchor Link)/,
  })).toHaveCount(0);

  const navigation = await page.evaluate(() => {
    const toc = document.getElementById('mục-lục')?.nextElementSibling;
    return {
      links: [...(toc?.querySelectorAll('a') ?? [])]
        .map((link) => decodeURIComponent(link.hash.slice(1))),
      headings: [...document.querySelectorAll('#nd-page h2[id], #nd-page h3[id]')]
        .map((heading) => heading.id).filter((id) => id !== 'mục-lục'),
      broken: [...document.querySelectorAll<HTMLAnchorElement>('#nd-page a[href^="#"]')]
        .map((link) => decodeURIComponent(link.hash.slice(1)))
        .filter((id) => id && !document.getElementById(id)),
    };
  });
  expect(navigation.links.length).toBeGreaterThan(35);
  expect(navigation.links).toEqual(navigation.headings);
  expect(navigation.broken).toEqual([]);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const demo = page.locator('figure').filter({ has: page.locator('pre', {
    hasText: "import assert from 'node:assert/strict'",
  }) }).filter({ has: page.getByRole('button', { name: 'Copy Text', exact: true }) });
  await demo.getByRole('button', { name: 'Copy Text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("assert.equal(distance('cat', 'cut'), 1)");
  for (const href of [
    '/database/02-index-on-nullable-column/',
    '/database/03-optimistic-vs-pessimistic-locking/',
    '/database/05-long-running-transaction/',
  ]) {
    expect((await request.get(href)).ok(), href).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test('encrypted-search diagrams embed PostgreSQL icons and render in light and dark themes', async ({ page }) => {
  await page.goto(route);
  const diagrams = page.locator('.d2-diagram');
  await expect(diagrams).toHaveCount(2);
  await expect(page.locator('.d2-interactive')).toHaveCount(0);
  for (const diagram of await diagrams.all()) {
    await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeHidden();
    expect(await diagram.locator('image').count()).toBeGreaterThanOrEqual(2);
    for (const icon of await diagram.locator('image').all()) {
      await expect(icon).toHaveAttribute('href', /^data:image\/svg\+xml/);
    }
  }
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  for (const diagram of await diagrams.all()) {
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-light > svg')).toBeHidden();
  }
});

test('encrypted-search prose, code and static diagrams work on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.getByRole('heading', { name: /^Demo chạy được bằng Node.js/, level: 2 }))
      .toBeVisible();
    await expect(page.locator('.d2-diagram-light > svg')).toHaveCount(2);
    for (const svg of await page.locator('.d2-diagram-light > svg').all()) {
      await expect(svg).toBeVisible();
      await expect(svg).toContainText('PostgreSQL');
    }
    await expect(page.locator('#nd-page')).toContainText('cat/cut');
    await expect(page.locator('pre').filter({ hasText: "import assert from 'node:assert/strict'" }))
      .toContainText('createCipheriv');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBeTruthy();
  } finally {
    await context.close();
  }
});
