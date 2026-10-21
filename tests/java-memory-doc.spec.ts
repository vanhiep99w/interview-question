import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';

const route = '/java/01-heap-vs-off-heap-vs-stack/';
const source = readFileSync('content/docs/java/01-heap-vs-off-heap-vs-stack.mdx', 'utf8');
const walkthrough = parse(source.match(/```code-walkthrough\n([\s\S]*?)\n```/)![1]);
const snippets = [...source.matchAll(/```java\n([\s\S]*?)\n```/g)].map((match) => match[1]);
const java = process.env.JAVA_BIN || 'java';
const javaMajor = Number(execFileSync(java, ['--version'], { encoding: 'utf8' }).match(/^(?:openjdk|java) (\d+)/)![1]);

function runJava(code: string, className: string) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'java-memory-doc-'));
  try {
    const file = path.join(directory, `${className}.java`);
    writeFileSync(file, code);
    return execFileSync(java, [file], { encoding: 'utf8', timeout: 30_000 }).replace(/\r\n/g, '\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function program(className: string) {
  const code = snippets.find((snippet) => snippet.includes(`public class ${className} `));
  expect(code, className).toBeTruthy();
  return code!;
}

test('published JDK 21 programs demonstrate references, shared storage and buffer metrics', () => {
  expect(javaMajor).toBeGreaterThanOrEqual(21);
  expect(runJava(walkthrough.snapshots[0].code, 'ReferenceDemo')).toBe('20\n20\ntrue\n');
  expect(runJava(program('DirectBufferDemo'), 'DirectBufferDemo')).toBe('false true\n42\n99\n99\n');
  const metrics = runJava(program('BufferPoolDemo'), 'BufferPoolDemo');
  const direct = metrics.match(/^direct count=(\d+) used=(-?\d+) capacity=(\d+)$/m);
  expect(direct).not.toBeNull();
  expect(Number(direct![1])).toBeGreaterThanOrEqual(1);
  expect(Number(direct![3])).toBeGreaterThanOrEqual(1024 * 1024);
  expect(metrics).toContain('Demo capacity=1048576');

  const methods = snippets.find((snippet) => snippet.startsWith('static int multiply'))!;
  expect(runJava(`public class FrameDemo {\n${methods}\npublic static void main(String[] args) { System.out.println(calculate(7)); }\n}`, 'FrameDemo')).toBe('21\n');
});

test('Arena example enforces native segment lifetime on JDK 22+', () => {
  test.skip(javaMajor < 22, 'Arena is final in JDK 22; the local JDK cannot execute this example.');
  expect(runJava(program('ArenaDemo'), 'ArenaDemo')).toBe('42\nArena is closed\n');
});

test('memory lesson preserves its route and has a complete working manual TOC', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator('#nd-page h1')).toHaveCount(1);
  await expect(page.locator('#nd-page h1')).toHaveText('Heap, off-heap và stack: hiểu bộ nhớ trong Java');
  await expect(page.getByRole('heading', { name: /^(Câu hỏi|Trả lời|Câu trả lời mẫu|Dành cho level)(?:$| Copy Anchor Link)/ })).toHaveCount(0);
  const toc = await page.evaluate(() => {
    const list = document.getElementById('mục-lục')?.nextElementSibling;
    const links = [...(list?.querySelectorAll('a') ?? [])].map((link) => decodeURIComponent(link.hash.slice(1)));
    const headings = [...document.querySelectorAll('#nd-page h2[id], #nd-page h3[id]')]
      .map((heading) => heading.id).filter((id) => id !== 'mục-lục');
    return { links, headings, broken: links.filter((id) => !document.getElementById(id)) };
  });
  expect(toc.links.length).toBeGreaterThan(35);
  expect(toc.links).toEqual(toc.headings);
  expect(toc.broken).toEqual([]);
  expect((await request.get('/java/02-bulk-upsert-billion-rows/')).ok()).toBeTruthy();
  expect(errors).toEqual([]);
});

test('memory diagrams support both themes and walkthrough copying preserves the full program', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(route);
  await expect(page.locator('.d2-diagram')).toHaveCount(3);
  await expect(page.locator('.d2-interactive')).toHaveCount(0);
  for (const diagram of await page.locator('.d2-diagram').all()) {
    await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-dark')).toBeHidden();
  }
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  });
  for (const diagram of await page.locator('.d2-diagram').all()) {
    await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
    await expect(diagram.locator('.d2-diagram-light')).toBeHidden();
  }
  const viewer = page.locator('.code-walkthrough');
  await viewer.getByRole('button', { name: 'Bước sau', exact: true }).click();
  await expect(viewer.locator('.code-walkthrough-note')).toContainText('Không có Box thứ hai');
  await viewer.getByRole('button', { name: 'Sao chép code', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(walkthrough.snapshots[0].code);
});

test('memory lesson remains readable without JavaScript on a narrow screen', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.locator('.d2-diagram-light > svg')).toHaveCount(3);
    for (const svg of await page.locator('.d2-diagram-light > svg').all()) await expect(svg).toBeVisible();
    await expect(page.locator('.code-walkthrough pre')).toContainText('public class ReferenceDemo');
    await expect(page.locator('.code-walkthrough noscript li')).toHaveCount(4);
    await expect(page.locator('#nd-page')).toContainText('clear() chỉ đặt lại trạng thái');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  } finally {
    await context.close();
  }
});
