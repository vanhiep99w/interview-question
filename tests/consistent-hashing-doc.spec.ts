import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const route = '/system-design/02-consistent-hashing/';
const source = readFileSync('content/docs/system-design/02-consistent-hashing.mdx', 'utf8');
const snippets = [...source.matchAll(/^```python\n([\s\S]*?)\n```/gm)]
  .map((match) => match[1]);

function runPython(code: string) {
  return execFileSync('python3', ['-c', code], { encoding: 'utf8', timeout: 30_000 });
}

test('published Python program verifies exact ranges, boundaries and remapping', () => {
  expect(snippets).toHaveLength(2);
  const output = runPython(snippets.join('\n\n'));
  expect(output).toBe('Boundary and remapping checks passed\nKeys moved to D: 4640/20000 (23.20%)\n');
  expect(source).toContain(output.trim());

  // Exercise the implementation directly, not a separate copy of the algorithm.
  expect(runPython(`${snippets[0]}
for points in ([], [(100, 'A'), (100, 'B')], [(-1, 'A')], [(HASH_SPACE, 'A')]):
    try:
        Ring.from_points(points)
    except ValueError:
        pass
    else:
        raise AssertionError('invalid points accepted')
for nodes, count in (([], 128), (['A', 'A'], 128), (['A'], 0)):
    try:
        Ring.build(nodes, count)
    except ValueError:
        pass
    else:
        raise AssertionError('invalid build accepted')
one = Ring.build(['A'])
assert all(one.owner_of(str(i)) == 'A' for i in range(1000))
old = Ring.build(['A', 'B', 'C', 'D'])
removed = Ring.build(['A', 'B', 'C'])
for i in range(20000):
    key = str(i)
    if old.owner_of(key) != 'D':
        assert old.owner_of(key) == removed.owner_of(key)
print('Validation and removal checks passed')
`)).toBe('Validation and removal checks passed\n');
});

test('modulo and toy-ring counts match the explanation', () => {
  expect(runPython(`
assert sum(h % 4 != h % 5 for h in range(20)) == 16
assert sum(400 < h <= 600 for h in range(1000)) == 200
assert sum(h > 700 or h <= 100 for h in range(1000)) == 400
print('Counts passed')
`)).toBe('Counts passed\n');
});

test('rewritten lesson preserves its route and complete manual TOC', async ({ page, request, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator('#nd-page h1')).toHaveCount(1);
  await expect(page.locator('#nd-page h1')).toHaveText(
    'Consistent hashing: từ cách chia key đến di chuyển dữ liệu an toàn',
  );
  await expect(page.getByRole('heading', {
    name: /^(Câu hỏi|Trả lời|Câu trả lời mẫu|Dành cho level|Câu hỏi follow-up)(?:$| Copy Anchor Link)/,
  })).toHaveCount(0);
  const toc = await page.evaluate(() => {
    const list = document.getElementById('mục-lục')?.nextElementSibling;
    const links = [...(list?.querySelectorAll('a') ?? [])]
      .map((link) => decodeURIComponent(link.hash.slice(1)));
    const headings = [...document.querySelectorAll('#nd-page h2[id], #nd-page h3[id]')]
      .map((heading) => heading.id).filter((id) => id !== 'mục-lục');
    return { links, headings, broken: links.filter((id) => !document.getElementById(id)) };
  });
  expect(toc.links.length).toBeGreaterThan(40);
  expect(toc.links).toEqual(toc.headings);
  expect(toc.broken).toEqual([]);
  for (const href of [
    '/database/01-sql-vs-nosql/',
    '/caching/01-redis-vs-memcached/',
    '/system-design/03-scale-1k-to-50k-users/',
  ]) expect((await request.get(href)).ok(), href).toBeTruthy();

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const program = page.locator('figure').filter({
    has: page.locator('pre', { hasText: 'class Ring(NamedTuple):' }),
  });
  await program.getByRole('button', { name: 'Copy Text', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain(snippets[0]);
  expect(errors).toEqual([]);
});

test('four static diagrams export readable light and dark SVG', async ({ page }) => {
  await page.goto(route);
  const diagrams = page.locator('.d2-diagram');
  await expect(diagrams).toHaveCount(4);
  await expect(page.locator('.d2-interactive')).toHaveCount(0);
  for (const diagram of await diagrams.all()) {
    await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeHidden();
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

test('lesson and code remain readable on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    for (const svg of await page.locator('.d2-diagram-light > svg').all()) {
      await expect(svg).toBeVisible();
    }
    await expect(page.locator('.d2-diagram-light > svg')).toHaveCount(4);
    await expect(page.locator('pre').filter({ hasText: 'class Ring(NamedTuple):' }))
      .toContainText('bisect_left(self.tokens, token)');
    await expect(page.locator('#nd-page')).toContainText('bản copy được giữ lại không đồng nghĩa');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBeTruthy();
  } finally {
    await context.close();
  }
});
