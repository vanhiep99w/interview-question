import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parse } from 'yaml';

const route = '/algorithms/01-do-phuc-tap-big-o/';
const source = await readFile('content/docs/algorithms/01-do-phuc-tap-big-o.mdx', 'utf8');
const walkthrough = parse(source.match(/```code-walkthrough\n([\s\S]*?)\n```/)![1]);
const snippets = [...source.matchAll(/```javascript\n([\s\S]*?)\n```/g)]
  .map((match) => match[1]).filter((code) => code.includes('function '));
const functions = runInNewContext([
  ...snippets,
  walkthrough.snapshots[0].code,
  '({ sum, indexOf, countPairs, halvingRounds, shrinkingWork, countDistinctSorted, binarySearch, fib, prefixSums, hasDuplicatePairs, hasDuplicateSet })',
].join('\n'));

test('published Big O examples return correct results and operation counts', () => {
  expect(functions.sum([])).toBe(0);
  expect(functions.sum([2, -1, 5])).toBe(6);
  expect(functions.prefixSums([2, -1, 5])).toEqual([2, 1, 6]);
  expect(functions.indexOf([2, 4, 6], 4)).toBe(1);
  expect(functions.indexOf([], 4)).toBe(-1);
  expect(functions.fib(10)).toBe(55);

  for (let n = 0; n <= 128; n++) {
    expect(functions.countPairs(new Array(n))).toBe(n < 2 ? 0 : n * (n - 1) / 2);
    expect(functions.halvingRounds(n)).toBe(n === 0 ? 0 : Math.floor(Math.log2(n)));
    const work = functions.shrinkingWork(n);
    if (n > 0) {
      expect(work).toBeGreaterThanOrEqual(n);
      expect(work).toBeLessThan(2 * n);
    } else expect(work).toBe(0);

    const sorted = Array.from({ length: n }, (_, i) => i * 2);
    for (let target = -1; target <= 2 * n; target++) {
      expect(functions.binarySearch(sorted, target)).toBe(sorted.indexOf(target));
    }
  }
  for (const n of [8, 16, 32]) {
    expect(functions.shrinkingWork(n)).toBe(2 * n - 1);
  }

  // Exhaust every array of length <= 5 over a small finite-number alphabet.
  for (let length = 0; length <= 5; length++) {
    for (let encoding = 0; encoding < 3 ** length; encoding++) {
      let value = encoding;
      const input = Array.from({ length }, () => {
        const digit = value % 3;
        value = Math.floor(value / 3);
        return digit - 1;
      });
      const original = [...input];
      const expected = new Set(input).size < input.length;
      expect(functions.hasDuplicatePairs(input)).toBe(expected);
      expect(functions.hasDuplicateSet(input)).toBe(expected);
      expect(input).toEqual(original);
      expect(functions.countDistinctSorted([...input].sort((a, b) => a - b)))
        .toBe(new Set(input).size);
    }
  }
});

test('Big O lesson exports working TOC, diagram and walkthrough controls', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(route);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Độ phức tạp thuật toán');
  await expect(page.getByRole('heading', { name: 'Câu hỏi', exact: true })).toHaveCount(0);
  const anchors = [...source.matchAll(/^\s*- \[[^\]]+\]\(#([^\)]+)\)/gm)].map((match) => match[1]);
  for (const anchor of anchors) {
    expect(await page.locator('[id]').evaluateAll((nodes, id) => nodes.some((node) => node.id === id), anchor), anchor).toBeTruthy();
  }
  expect(anchors.length).toBe([...source.matchAll(/^#{2,3} /gm)].length - 1);

  const diagram = page.locator('.d2-diagram');
  await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
  const viewer = page.locator('.code-walkthrough');
  await viewer.getByRole('button', { name: 'Bước sau', exact: true }).click();
  await expect(viewer.locator('.code-walkthrough-note')).toContainText('n - i - 1');
  await viewer.getByRole('button', { name: 'Sao chép code', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(walkthrough.snapshots[0].code);
  expect(errors).toEqual([]);
});

test('Big O explanation, SVG and all walkthrough steps remain readable on mobile without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.locator('.d2-diagram-light > svg')).toBeVisible();
  await expect(page.locator('.code-walkthrough pre')).toContainText('function countPairs');
  await expect(page.locator('.code-walkthrough noscript li')).toHaveCount(3);
  await expect(page.locator('.code-walkthrough noscript li').last()).toContainText('n(n - 1)/2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await context.close();
});
