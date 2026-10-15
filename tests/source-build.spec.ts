import { test, expect } from '@playwright/test';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('source build validates references, resolves regions and produces deterministic assets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'source-build-test-'));
  try {
    await mkdir(path.join(root, 'scripts'));
    await mkdir(path.join(root, 'content/docs'), { recursive: true });
    await cp('scripts/build-source-examples.mjs', path.join(root, 'scripts/build-source-examples.mjs'));
    await cp('examples', path.join(root, 'examples'), { recursive: true, filter: (file) => !/(?:^|\/)(node_modules|dist|package-lock.json)(?:\/|$)/.test(file) });
    await symlink(path.resolve('node_modules'), path.join(root, 'node_modules'), 'dir');
    const doc = path.join(root, 'content/docs/example.mdx');
    const run = () => spawnSync(process.execPath, ['scripts/build-source-examples.mjs'], { cwd: root, encoding: 'utf8' });
    await writeFile(doc, '<SourceRef project="webpack-react-demo" file="webpack.config.cjs" region="entry" />');
    let result = run();
    expect(result.status, result.stderr).toBe(0);
    const manifestPath = path.join(root, 'public/source-examples/manifest.json');
    const original = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(original);
    const asset = manifest[0].snapshots[0].asset;
    const snapshot = JSON.parse(await readFile(path.join(root, 'public', asset), 'utf8'));
    const config = snapshot.files.find((file: { path: string }) => file.path === 'webpack.config.cjs');
    expect(config.code).not.toContain('#region');
    const [start, end] = config.regions.entry;
    expect(config.code.split('\n').slice(start - 1, end).join('\n')).toContain("entry: './src/main.tsx'");
    expect(config.html).toContain(`data-line="${start}"`);
    expect(run().status).toBe(0);
    expect(await readFile(manifestPath, 'utf8')).toBe(original);
    for (const attrs of [
      'project="missing"',
      'project="webpack-react-demo" snapshot="missing"',
      'project="webpack-react-demo" file="missing.ts"',
      'project="webpack-react-demo" file="webpack.config.cjs" region="missing"',
      'project="webpack-react-demo" file="src/main.tsx" lines="999-1000"',
    ]) {
      await writeFile(doc, `<SourceRef ${attrs} />`);
      result = run();
      expect(result.status, `Should reject ${attrs}`).not.toBe(0);
    }
    await writeFile(doc, '<SourceRef project="webpack-react-demo" />');
    const sourcePath = path.join(root, 'examples/webpack-react-demo/basic/src/App.tsx');
    await writeFile(sourcePath, `${await readFile(sourcePath, 'utf8')}\n// Changed after the reviewed capture.\n`);
    result = run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Stale captured output');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
