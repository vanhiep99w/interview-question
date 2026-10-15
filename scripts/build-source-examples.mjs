import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/source-examples');
const registry = JSON.parse(await readFile(path.join(root, 'examples/registry.json'), 'utf8'));
const highlighter = await createHighlighter({
  themes: ['github-light-high-contrast', 'github-dark-high-contrast'],
  langs: ['tsx', 'typescript', 'javascript', 'json', 'html', 'css'],
});
const languages = { '.tsx': 'tsx', '.ts': 'typescript', '.cjs': 'javascript', '.js': 'javascript', '.json': 'json', '.html': 'html', '.css': 'css' };
const manifests = [];
const snapshots = new Map();
const artifacts = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Region markers stay in the runnable file, but are hidden in the reader.
function extractRegions(raw, label) {
  const lines = [];
  const regions = {};
  let current;
  for (const line of raw.trimEnd().split(/\r?\n/)) {
    const marker = line.match(/^\s*\/\/\s*#(end)?region\s+([\w-]+)\s*$/);
    if (!marker) { lines.push(line); continue; }
    if (!marker[1]) {
      assert(!current && !regions[marker[2]], `${label}: duplicate or nested region ${marker[2]}`);
      current = { name: marker[2], start: lines.length + 1 };
    } else {
      assert(current?.name === marker[2], `${label}: mismatched region ${marker[2]}`);
      assert(lines.length >= current.start, `${label}: empty region ${marker[2]}`);
      regions[current.name] = [current.start, lines.length];
      current = undefined;
    }
  }
  assert(!current, `${label}: unclosed region`);
  return { code: `${lines.join('\n')}\n`, regions };
}

try {
  for (const project of registry) {
    assert(/^[\w-]+$/.test(project.id), `Invalid project ID: ${project.id}`);
    assert(!manifests.some((item) => item.id === project.id), `Duplicate project: ${project.id}`);
    const manifest = { id: project.id, title: project.title, defaultSnapshot: project.defaultSnapshot, snapshots: [] };
    for (const snapshot of project.snapshots) {
      assert(/^[\w-]+$/.test(snapshot.id), `Invalid snapshot ID: ${snapshot.id}`);
      assert(!manifest.snapshots.some((item) => item.id === snapshot.id), `Duplicate snapshot: ${snapshot.id}`);
      const files = [];
      const base = path.resolve(root, snapshot.root);
      assert(base.startsWith(path.join(root, 'examples/')), 'Source must live inside examples/');
      for (const file of snapshot.files) {
        const absolute = path.resolve(base, file);
        assert(absolute.startsWith(`${base}${path.sep}`), `Invalid source path: ${file}`);
        assert(!files.some((item) => item.path === file), `Duplicate file: ${file}`);
        const { code, regions } = extractRegions(await readFile(absolute, 'utf8'), `${project.id}/${snapshot.id}/${file}`);
        const language = languages[path.extname(file)];
        assert(language, `Unsupported source language: ${file}`);
        const html = highlighter.codeToHtml(code.trimEnd(), {
          lang: language,
          themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
          transformers: [{
            line(node, line) { node.properties['data-line'] = line; },
          }],
        });
        files.push({ path: file, language, code, html, regions });
      }
      assert(files.some((file) => file.path === snapshot.defaultFile), `Missing default file: ${snapshot.defaultFile}`);
      const data = { project: project.id, snapshot: snapshot.id, defaultFile: snapshot.defaultFile, files };
      const json = JSON.stringify(data);
      const hash = createHash('sha256').update(json).digest('hex').slice(0, 12);
      const filename = `${project.id}.${snapshot.id}.${hash}.json`;
      artifacts.set(filename, json);
      snapshots.set(`${project.id}/${snapshot.id}`, data);
      manifest.snapshots.push({ id: snapshot.id, title: snapshot.title, asset: `/source-examples/${filename}` });
    }
    assert(manifest.snapshots.some((item) => item.id === project.defaultSnapshot), `Missing default snapshot for ${project.id}`);
    manifests.push(manifest);
  }

  // Fail the docs build on stale project/file/region references instead of shipping broken links.
  async function validateDocs(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) { await validateDocs(filename); continue; }
      if (!/\.mdx?$/.test(entry.name)) continue;
      const content = (await readFile(filename, 'utf8')).replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
      for (const match of content.matchAll(/<SourceRef\b([^>]*?)(?:\/?>)/gs)) {
        const attrs = Object.fromEntries([...match[1].matchAll(/(project|snapshot|file|region|lines)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
        const project = manifests.find((item) => item.id === attrs.project);
        assert(project, `${filename}: unknown SourceRef project ${attrs.project}`);
        const data = snapshots.get(`${project.id}/${attrs.snapshot ?? project.defaultSnapshot}`);
        assert(data, `${filename}: unknown snapshot ${attrs.snapshot}`);
        const file = data.files.find((item) => item.path === (attrs.file ?? data.defaultFile));
        assert(file, `${filename}: unknown source file ${attrs.file}`);
        assert(!attrs.region || file.regions[attrs.region], `${filename}: unknown region ${attrs.region}`);
        assert(!(attrs.region && attrs.lines), `${filename}: choose region OR lines`);
        if (attrs.lines) {
          const range = attrs.lines.match(/^(\d+)(?:-(\d+))?$/);
          assert(range && +range[1] > 0 && +(range[2] ?? range[1]) >= +range[1] && +(range[2] ?? range[1]) <= file.code.trimEnd().split('\n').length, `${filename}: invalid lines ${attrs.lines}`);
        }
      }
    }
  }
  await validateDocs(path.join(root, 'content/docs'));
  await mkdir(output, { recursive: true });
  for (const [filename, json] of artifacts) await writeFile(path.join(output, filename), json);
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifests));
  for (const filename of await readdir(output)) {
    if (filename !== 'manifest.json' && !artifacts.has(filename)) await rm(path.join(output, filename));
  }
  console.log(`[source-examples] ${manifests.length} projects, ${snapshots.size} snapshots; references validated`);
} finally {
  highlighter.dispose();
}
