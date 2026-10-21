import { expect, test } from '@playwright/test';

const route = '/database/05-long-running-transaction/';

test('transaction lesson is an explainer with a complete TOC, copyable SQL and valid related links', async ({
  page, context, request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator('#nd-page h1')).toHaveCount(1);
  await expect(page.locator('#nd-page h1')).toHaveText(
    'Long-running transaction: cơ chế, chẩn đoán và thiết kế lại',
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
        .filter((heading) => !heading.closest('.span-waterfall'))
        .map((heading) => heading.id).filter((id) => id !== 'mục-lục'),
      broken: [...document.querySelectorAll<HTMLAnchorElement>('#nd-page a[href^="#"]')]
        .map((link) => decodeURIComponent(link.hash.slice(1)))
        .filter((id) => id && !document.getElementById(id)),
    };
  });
  expect(navigation.links).toHaveLength(51);
  expect(navigation.links).toEqual(navigation.headings);
  expect(navigation.broken).toEqual([]);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy Text', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("WHERE sku = 'BOOK-001' AND remaining > 0");

  for (const href of [
    '/database/03-optimistic-vs-pessimistic-locking/',
    '/system-design/06-resumable-excel-import/',
  ]) {
    expect((await request.get(href)).ok(), href).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test('transaction diagrams embed icons and support light/dark while the trace declares illustrative data', async ({ page }) => {
  await page.goto(route);
  const diagrams = page.locator('.d2-diagram');
  await expect(diagrams).toHaveCount(2);
  await expect(page.locator('.d2-interactive')).toHaveCount(0);
  for (const diagram of await diagrams.all()) {
    await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeHidden();
    expect(await diagram.locator('image').count()).toBe(2);
    for (const icon of await diagram.locator('image').all()) {
      await expect(icon).toHaveAttribute('href', /^data:image\/svg\+xml/);
    }
  }
  const trace = page.locator('.span-waterfall');
  await expect(trace).toContainText('Trace minh họa');
  await expect(trace.locator('[data-span="payment"]')).toContainText('8000 ms');

  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  for (const diagram of await diagrams.all()) {
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-light')).toBeHidden();
  }
  await expect(trace).toBeVisible();
});

test('transaction lesson, diagrams and trace table remain readable on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.getByRole('heading', {
      name: /^Thực hành trên PostgreSQL bằng nhiều session/, level: 2,
    })).toBeVisible();
    await expect(page.locator('.d2-diagram-light > svg')).toHaveCount(2);
    for (const svg of await page.locator('.d2-diagram-light > svg').all()) {
      await expect(svg).toBeVisible();
      await expect(svg).toContainText('PostgreSQL');
    }
    await page.locator('.span-waterfall-table-disclosure summary').click();
    await expect(page.locator('.span-waterfall table')).toContainText('Payment API');
    await expect(page.locator('#nd-page')).toContainText('25P02');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBeTruthy();
  } finally {
    await context.close();
  }
});
