// Run explicitly when refreshing the reviewed Webpack build examples, not on every site build.
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registryPath = path.join(root, 'examples/registry.json');
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const project = registry.find((item) => item.id === 'webpack-react-demo');
if (!project) throw new Error('Missing webpack-react-demo project');
const temporary = await mkdtemp(path.join(tmpdir(), 'webpack-build-capture-'));
const staged = [];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const digest = (value) => createHash('sha256').update(value).digest('hex');

const runtimeSources = {
  'webpack/bootstrap': 'module-cache',
  'webpack/runtime/ensure chunk': 'ensure-chunk',
  'webpack/runtime/get javascript chunk filename': 'chunk-filename',
  'webpack/runtime/load script': 'load-script',
  'webpack/runtime/publicPath': 'public-path',
  'webpack/runtime/jsonp chunk loading': 'jsonp-chunk-loading',
};

function flattenModules(modules = []) {
  return modules.flatMap((module) => [module, ...flattenModules(module.modules)]);
}

function packageNames(modules) {
  return [...new Set(modules.flatMap((module) => {
    const match = module.name?.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    return match ? [match[1]] : [];
  }))].sort();
}

function summarizeMap(map, filename) {
  return {
    kind: 'Source map summary — derived report, not the complete .map file',
    filename,
    version: map.version,
    file: map.file,
    sourceRoot: map.sourceRoot ?? '',
    sources: map.sources,
    namesCount: map.names.length,
    mappingsCharacters: map.mappings.length,
    sourcesContent: map.sources.map((source, index) => ({ source, characters: map.sourcesContent?.[index]?.length ?? 0 })),
    note: 'The mappings and sourcesContent payloads are not copied into this summary. The original map remains in the local build output.',
  };
}

try {
  for (const sourceId of ['basic', 'async-bootstrap']) {
    const source = project.snapshots.find((item) => item.id === sourceId);
    if (!source) throw new Error(`Missing source snapshot ${sourceId}`);
    const working = path.join(temporary, sourceId);
    const captured = path.join(temporary, `captured-${sourceId}`);
    await mkdir(working, { recursive: true });
    await mkdir(captured, { recursive: true });
    for (const entry of source.files) {
      const file = typeof entry === 'string' ? entry : entry.source ?? entry.path;
      const destination = path.join(working, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(root, source.root, file), destination);
    }
    execFileSync(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: working, stdio: 'inherit' });
    const statsFile = path.join(temporary, `${sourceId}-stats.json`);
    execFileSync(npm, ['run', 'build', '--', '--json', statsFile], { cwd: working, stdio: 'inherit' });
    const stats = JSON.parse(await readFile(statsFile, 'utf8'));
    if (stats.errors?.length) throw new Error(`Webpack errors in ${sourceId}`);
    const dist = path.join(working, 'dist');
    const assetNames = (await readdir(dist)).sort();
    const main = assetNames.find((name) => /^main\.[a-f\d]+\.js$/.test(name));
    if (!main) throw new Error(`Missing main bundle for ${sourceId}`);
    const mainMap = JSON.parse(await readFile(path.join(dist, `${main}.map`), 'utf8'));
    const files = ['build-report.json'];
    const views = [];
    const sourceFiles = await Promise.all(source.files.map(async (entry) => {
      const file = typeof entry === 'string' ? entry : entry.source ?? entry.path;
      return { file, sha256: digest(await readFile(path.join(working, file))) };
    }));

    async function save(relative, content) {
      const destination = path.join(captured, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
    async function captureAsset(name, alias) {
      const raw = await readFile(path.join(dist, name));
      const storage = `artifacts/${name}`;
      await save(storage, raw);
      files.push({ path: alias, source: storage, displayPath: `dist/${name}` });
      views.push({ reference: alias, emittedFile: name, view: 'Complete original bytes, no formatting or renaming inside the content' });
    }
    await captureAsset('index.html', 'dist/index.html');
    await save('source-maps/main.summary.json', json(summarizeMap(mainMap, `${main}.map`)));
    files.push('source-maps/main.summary.json');
    views.push({ reference: 'source-maps/main.summary.json', emittedFile: `${main}.map`, view: 'Derived metadata summary; mappings and original source texts are omitted' });

    for (const [suffix, name] of Object.entries(runtimeSources)) {
      const index = mainMap.sources.findIndex((source) => source.endsWith(`/${suffix}`));
      if (index < 0) continue;
      const code = mainMap.sourcesContent?.[index];
      if (typeof code !== 'string') throw new Error(`Missing runtime source ${suffix}`);
      const reference = `runtime/${name}.js`;
      // sourcesContent can retain pre-realContentHash values. Reconcile only the
      // chunk filename table with this compilation's final emitted filenames.
      const hashReplacements = [];
      let readable = code;
      if (name === 'chunk-filename') {
        for (const match of code.matchAll(/"(\d+)":"([a-f\d]+)"/g)) {
          const chunk = stats.chunks.find((chunk) => String(chunk.id) === match[1]);
          const emitted = chunk?.files.find((file) => file.endsWith('.js'));
          const finalHash = emitted?.match(/\.([a-f\d]+)\.js$/)?.[1];
          if (!finalHash) throw new Error(`No final hash for chunk ${match[1]}`);
          if (finalHash !== match[2]) {
            readable = readable.replace(match[0], `"${match[1]}":"${finalHash}"`);
            hashReplacements.push({ chunk: match[1], sourceMapHash: match[2], emittedHash: finalHash });
          }
        }
      }
      const note = hashReplacements.length ? '// Chunk hashes reconciled with final emitted filenames from this build’s stats.\n' : '';
      await save(reference, `// Generated Webpack runtime, extracted from ${main}.map\n// Source: ${mainMap.sources[index]}\n// This readable source-map module is not a separately emitted JS file.\n${note}// #region runtime\n${readable.trimEnd()}\n// #endregion runtime\n`);
      files.push(reference);
      views.push({ reference, emittedFile: main, sourceMap: `${main}.map`, source: mainMap.sources[index], view: hashReplacements.length ? 'Readable sourcesContent with chunk hashes reconciled against final emitted assets; not an emitted asset' : 'sourcesContent copied verbatim inside explanatory comments and region markers; not an emitted asset', ...(hashReplacements.length ? { hashReplacements } : {}) });
    }

    if (sourceId === 'async-bootstrap') {
      const bootstrap = assetNames.find((name) => /^bootstrap\.[a-f\d]+\.js$/.test(name));
      if (!bootstrap) throw new Error('Missing bootstrap chunk');
      await captureAsset(main, 'dist/main.js');
      await captureAsset(bootstrap, 'dist/bootstrap.js');
      await captureAsset(`${main}.map`, 'dist/main.js.map');
      await captureAsset(`${bootstrap}.map`, 'dist/bootstrap.js.map');
      const vendor = assetNames.find((name) => /^\d+\.[a-f\d]+\.js$/.test(name));
      if (vendor && assetNames.includes(`${vendor}.map`)) {
        const map = JSON.parse(await readFile(path.join(dist, `${vendor}.map`), 'utf8'));
        await save('source-maps/vendors.summary.json', json(summarizeMap(map, `${vendor}.map`)));
        files.push('source-maps/vendors.summary.json');
        views.push({ reference: 'source-maps/vendors.summary.json', emittedFile: `${vendor}.map`, view: 'Metadata only; the large vendor bundle and map are listed in the report, not embedded in the reader' });
      }
    }

    const manifest = JSON.parse(await readFile(path.join(working, 'package.json'), 'utf8'));
    const versions = {};
    for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).sort()) {
      versions[name] = JSON.parse(await readFile(path.join(working, 'node_modules', name, 'package.json'), 'utf8')).version;
    }
    const chunks = (stats.chunks ?? []).map((chunk) => {
      const modules = flattenModules(chunk.modules);
      return {
        id: chunk.id,
        names: chunk.names,
        initial: chunk.initial,
        files: chunk.files,
        sourceModules: modules.map((module) => module.name).filter((name) => name?.startsWith('./src/')),
        packages: packageNames(modules),
      };
    });
    const assets = await Promise.all(assetNames.map(async (name) => {
      const raw = await readFile(path.join(dist, name));
      return { file: name, bytes: raw.length, sha256: digest(raw) };
    }));
    await save('build-report.json', json({
      kind: 'Reviewed capture of a real production build — this report is derived from Webpack stats',
      sourceSnapshot: sourceId,
      command: 'npm run build -- --json <temporary-stats-file>',
      environment: { node: process.versions.node, webpack: stats.version },
      versions,
      sourceFiles,
      entrypoints: Object.fromEntries(Object.entries(stats.entrypoints ?? {}).map(([name, value]) => [name, value.assets.map((asset) => asset.name)])),
      chunks,
      assets,
      views,
      notes: [
        'dist/main.js and similar reference paths are stable aliases. displayPath and emittedFile retain the actual content-hashed filenames.',
        'Only small emitted assets and readable generated runtime modules are published. Large React/vendor bundles and maps are listed, not copied into the viewer.',
        'Raw emitted assets are copied byte-for-byte. Runtime views come from sourcesContent, before minification; the chunk-filename view reconciles intermediate hashes against final assets and records each replacement. Source-map summaries are explicitly derived reports.',
        'This output capture is not a complete deployable dist directory. Run the source snapshot build to obtain every asset.',
        'Package ranges are resolved during capture; names, chunk IDs, hashes and byte sizes can differ with other dependency versions. Source checksums and resolved versions describe this capture.',
      ],
    }));
    staged.push({
      captured,
      destination: path.join(root, 'examples/webpack-react-demo/output', sourceId),
      snapshot: {
        id: `output-${sourceId}`,
        title: sourceId === 'basic' ? 'Build output · React cơ bản' : 'Build output · Async bootstrap',
        root: `examples/webpack-react-demo/output/${sourceId}`,
        capture: { sourceSnapshot: sourceId, report: 'build-report.json' },
        defaultFile: 'build-report.json',
        files,
      },
    });
  }
  // Publish only after both source snapshots build successfully.
  for (const item of staged) {
    await rm(item.destination, { recursive: true, force: true });
    await mkdir(path.dirname(item.destination), { recursive: true });
    await cp(item.captured, item.destination, { recursive: true });
    const index = project.snapshots.findIndex((snapshot) => snapshot.id === item.snapshot.id);
    if (index < 0) project.snapshots.push(item.snapshot);
    else project.snapshots[index] = item.snapshot;
  }
  await writeFile(registryPath, json(registry));
  console.log('[webpack-output] Captured two real builds. Review examples/webpack-react-demo/output and run npm run source:build.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
