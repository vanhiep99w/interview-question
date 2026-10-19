import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

type FileEntry = string | { path: string; source: string; displayPath: string; format?: 'html' };

test('reviewed output retains real asset bytes, source checksums and final chunk names', async () => {
  const registry = JSON.parse(await readFile('examples/registry.json', 'utf8'));
  const project = registry.find((item: { id: string }) => item.id === 'webpack-react-demo');
  for (const snapshot of project.snapshots.filter((item: { capture?: unknown }) => item.capture)) {
    const report = JSON.parse(await readFile(path.join(snapshot.root, snapshot.capture.report), 'utf8'));
    const source = project.snapshots.find((item: { id: string }) => item.id === report.sourceSnapshot);
    for (const file of report.sourceFiles) {
      const raw = await readFile(path.join(source.root, file.file));
      expect(createHash('sha256').update(raw).digest('hex')).toBe(file.sha256);
    }
    const artifacts = snapshot.files.filter((entry: FileEntry) => typeof entry !== 'string') as Exclude<FileEntry, string>[];
    for (const artifact of artifacts) {
      const raw = await readFile(path.join(snapshot.root, artifact.source));
      const name = path.basename(artifact.source);
      expect(artifact.displayPath).toBe(`dist/${name}${artifact.format === 'html' ? ' (đã format)' : ''}`);
      const actual = report.assets.find((asset: { file: string }) => asset.file === name);
      expect(raw.length).toBe(actual.bytes);
      expect(createHash('sha256').update(raw).digest('hex')).toBe(actual.sha256);
      expect(raw.length).toBeLessThan(30_000);
    }
    const html = await readFile(path.join(snapshot.root, 'artifacts/index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)]
      .map((match) => match[1] ?? match[2] ?? match[3]);
    for (const entry of report.entrypoints.main) expect(scripts).toContain(`/${entry}`);
    if (report.sourceSnapshot === 'async-bootstrap') {
      const mapping = await readFile(path.join(snapshot.root, 'runtime/chunk-filename.js'), 'utf8');
      const entry = artifacts.find((file) => file.path === 'dist/main.js')!;
      const main = await readFile(path.join(snapshot.root, entry.source), 'utf8');
      for (const chunk of report.chunks.filter((item: { initial: boolean }) => !item.initial)) {
        for (const file of chunk.files) {
          const hash = file.match(/\.([a-f\d]+)\.js$/)?.[1];
          expect(hash).toBeTruthy();
          expect(mapping).toContain(hash);
          expect(main).toContain(hash);
        }
      }
      const mapEntry = artifacts.find((file) => file.path === 'dist/main.js.map')!;
      const map = JSON.parse(await readFile(path.join(snapshot.root, mapEntry.source), 'utf8'));
      // realContentHash can leave an intermediate hash in the map's file field.
      // The emitted JS must point to the actual emitted map filename instead.
      expect(main).toContain(`sourceMappingURL=${path.basename(mapEntry.displayPath)}`);
      const summary = JSON.parse(await readFile(path.join(snapshot.root, 'source-maps/main.summary.json'), 'utf8'));
      expect(map.file).toBe(summary.file);
      expect(map.version).toBe(3);
      expect(map.sources).toContain('webpack://webpack-react-demo/webpack/runtime/load script');
    }
  }
});

test('output references open real hashed files and readable generated runtime in the drawer', async ({ page }) => {
  await page.goto('/web/03-webpack-tu-source-den-trinh-duyet/');
  await page.getByRole('link', { name: 'main · JavaScript emit nguyên bản', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Phiên bản source' })).toHaveValue('output-async-bootstrap');
  await expect(page.locator('.source-file-tab')).toHaveText(/dist\/main\.[a-f\d]+\.js/);
  await expect(page.locator('.source-code')).toContainText('sourceMappingURL=main.');
  await expect(page).toHaveURL(/file=dist%2Fmain.js/);
  await page.getByRole('link', { name: 'chunk-filename.js', exact: true }).click();
  await expect(page.locator('.is-highlighted').filter({ hasText: '__webpack_require__.u' })).toBeVisible();
  await expect(page.locator('.source-code')).toContainText('"bootstrap"');
  await page.getByRole('combobox', { name: 'Phiên bản source' }).selectOption('basic');
  await expect(page.locator('.source-file-tab')).toContainText('webpack.config.cjs');
  await expect(page.locator('.source-code')).toContainText("entry: './src/main.tsx'");
});

for (const snapshot of ['output-basic', 'output-async-bootstrap']) {
  test(`${snapshot}: HTML is indented, copyable and deep-linked by formatted lines`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: {
        writeText: async (text: string) => { (window as Window & { copied?: string }).copied = text; },
      } });
    });
    const manifests = JSON.parse(await readFile('public/source-examples/manifest.json', 'utf8'));
    const project = manifests.find((item: { id: string }) => item.id === 'webpack-react-demo');
    const asset = project.snapshots.find((item: { id: string }) => item.id === snapshot).asset;
    const data = JSON.parse(await readFile(path.join('public', asset), 'utf8'));
    const file = data.files.find((item: { path: string }) => item.path === 'dist/index.html');
    const lines = file.code.trimEnd().split('\n');
    const raw = await readFile(`examples/webpack-react-demo/output/${snapshot.replace('output-', '')}/artifacts/index.html`, 'utf8');
    await page.goto(`/web/03-webpack-tu-source-den-trinh-duyet/?source=webpack-react-demo&snapshot=${snapshot}&file=dist%2Findex.html&lines=3-5`);
    const documents = await page.evaluate((sources) => {
      const describe = (element: Element): unknown => ({
        tag: element.tagName,
        attributes: [...element.attributes].map(({ name, value }) => [name, value]),
        children: [...element.childNodes]
          .filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim())
          .map((node) => node instanceof Element ? describe(node) : node.textContent),
      });
      return sources.map((source) => describe(new DOMParser().parseFromString(source, 'text/html').documentElement));
    }, [raw, file.code]);
    expect(documents[1]).toEqual(documents[0]);
    await expect(page.locator('.source-file-tab')).toContainText('dist/index.html (đã format)');
    await expect(page.locator('.source-code .line')).toHaveCount(lines.length);
    expect(await page.locator('.source-code .line').allTextContents()).toEqual(lines);
    await expect(page.locator('.is-highlighted')).toHaveCount(3);
    expect(await page.locator('.is-highlighted').allTextContents()).toEqual(lines.slice(2, 5));
    await page.getByRole('button', { name: 'Copy file', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as Window & { copied?: string }).copied)).toBe(file.code);
    await page.reload();
    await expect(page.locator('.is-highlighted')).toHaveCount(3);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.source-code')).toContainText('<div id="root"></div>');
    expect(await page.locator('.source-drawer').evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
