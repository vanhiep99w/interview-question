import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

const route = '/behavioral/01-production-server-down/';
const source = await readFile('content/docs/behavioral/01-production-server-down.mdx', 'utf8');
const terminal = parse(source.match(/^```terminal-session\n([\s\S]*?)\n```/m)![1]);
const anchors = [...source.matchAll(/^\s*- \[[^\]]+\]\(#([^\)]+)\)/gm)].map((match) => match[1]);

test('incident lesson has complete navigation and shell examples parse without execution', () => {
  expect(source).toMatch(/^---\ntitle: /);
  expect(source).not.toMatch(/^# /m);
  expect(source).not.toMatch(/^## (Câu hỏi|Trả lời|Câu trả lời mẫu|Dành cho level)\s*$/m);
  expect(source).not.toMatch(/^```mermaid\b/m);
  expect(anchors.length).toBe([...source.matchAll(/^#{2,3} /gm)].length - 1);
  expect(new Set(anchors).size).toBe(anchors.length);

  const commands = [
    ...[...source.matchAll(/^```bash\n([\s\S]*?)\n```/gm)].map((match) => match[1]),
    ...terminal.steps.map((step: { command: string }) => step.command),
  ];
  for (const command of commands) {
    // Syntax check only: never execute published operations against a host or cluster.
    const result = spawnSync('bash', ['-n'], { input: command, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  }
  expect(terminal.context.kind).toBe('local');
  expect(terminal.steps).toHaveLength(4);
  for (const step of terminal.steps) {
    expect(step.command).toMatch(/^kubectl --context "\$CTX" -n "\$NS" (get|describe|logs) /);
    expect(step.outputs).toBeUndefined();
    expect(step.exitCode).toBeUndefined();
  }
});

test('incident lesson exports working anchors, related routes and exact copyable commands', async ({ page, context, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(route);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Xử lý sự cố production: từ cảnh báo đến khôi phục an toàn');

  const ids = await page.locator('[id]').evaluateAll((nodes) => nodes.map((node) => node.id));
  for (const anchor of anchors) expect(ids, anchor).toContain(anchor);
  await page.getByRole('link', { name: 'Checklist tra nhanh', exact: true }).first().click();
  await expect(page).toHaveURL(/#checklist-tra-nhanh$/);

  const session = page.locator('.terminal-session');
  await expect(session).toHaveCount(1);
  for (let index = 0; index < terminal.steps.length; index++) {
    await session.getByRole('button', { name: `Sao chép lệnh bước ${index + 1}`, exact: true }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(terminal.steps[index].command);
  }
  await expect(session.getByRole('note', { name: 'Cảnh báo' })).toContainText('container đã restart');
  for (const match of source.matchAll(/<Card[^>]+href="([^"]+)"/g)) {
    expect((await request.get(match[1])).ok(), match[1]).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

for (const javaScriptEnabled of [true, false]) {
  test(`incident diagrams and commands remain readable on mobile, JavaScript=${javaScriptEnabled}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(route);
    const diagrams = page.locator('.d2-diagram');
    await expect(diagrams).toHaveCount(2);
    for (const diagram of await diagrams.all()) {
      await expect(diagram.locator('.d2-diagram-light > svg')).toBeVisible();
    }
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    for (const diagram of await diagrams.all()) {
      await expect(diagram.locator('.d2-diagram-dark > svg')).toBeVisible();
      await expect(diagram.locator('.d2-diagram-light')).toBeHidden();
    }
    await expect(page.locator('.terminal-session-command pre')).toHaveCount(4);
    await expect(page.locator('.terminal-session-command pre').last()).toContainText('--previous');
    await page.locator('.terminal-session-notes').first().locator('summary').click();
    await expect(page.locator('.terminal-session-notes').first()).toContainText('restart count');
    await expect(page.getByRole('heading', { name: /^Kiểm chứng phục hồi trước khi đóng incident/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await context.close();
  });
}
