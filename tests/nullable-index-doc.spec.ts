import { expect, test } from '@playwright/test';

const route = '/database/02-index-on-nullable-column/';

test('nullable-index lesson has a complete TOC, working copy and related links', async ({
  page, context, request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);

  await expect(page.locator('#nd-page h1')).toHaveCount(1);
  await expect(page.locator('#nd-page h1')).toHaveText(
    'Index trên cột nullable: từ NULL đến thiết kế và kiểm chứng',
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
  expect(navigation.links).toHaveLength(49);
  expect(navigation.links).toEqual(navigation.headings);
  expect(navigation.broken).toEqual([]);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const setup = page.locator('figure').filter({ has: page.locator('pre', {
    hasText: 'CREATE TEMP TABLE nullable_orders',
  }) });
  await setup.getByRole('button', { name: 'Copy Text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('FROM generate_series(1, 200000) AS s(g)');
  expect(await page.evaluate(() => navigator.clipboard.readText()))
    .toContain('ANALYZE nullable_orders;');

  for (const href of [
    '/database/03-optimistic-vs-pessimistic-locking/',
    '/database/05-long-running-transaction/',
  ]) {
    expect((await request.get(href)).ok(), href).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test('nullable-index diagram embeds the PostgreSQL icon and has light/dark SVG', async ({ page }) => {
  await page.goto(route);
  const diagram = page.locator('.d2-diagram');
  await expect(diagram).toHaveCount(1);
  await expect(page.locator('.d2-interactive')).toHaveCount(0);
  await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
  await expect(diagram.locator('.d2-diagram-dark > svg')).toBeHidden();
  expect(await diagram.locator('image').count()).toBeGreaterThanOrEqual(2);
  for (const icon of await diagram.locator('image').all()) {
    await expect(icon).toHaveAttribute('href', /^data:image\/svg\+xml/);
  }
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
  await expect(diagram.locator('.d2-diagram-light > svg')).toBeHidden();
});

test('nullable-index lesson is readable on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.getByRole('heading', {
      name: /^Thực hành trên PostgreSQL 18/, level: 2,
    })).toBeVisible();
    await expect(page.locator('.d2-diagram-light > svg')).toBeVisible();
    await expect(page.locator('.d2-diagram-light > svg')).toContainText('PostgreSQL');
    await expect(page.locator('pre').filter({ hasText: 'CREATE TEMP TABLE nullable_orders' }))
      .toContainText('generate_series(1, 200000)');
    await expect(page.locator('#nd-page')).toContainText('Ba kết quả đếm theo thứ tự là');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBeTruthy();
  } finally {
    await context.close();
  }
});
