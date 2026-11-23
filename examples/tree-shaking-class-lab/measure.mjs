// Build every variant with four toolchains, then print raw / gzip sizes in bytes.
// `node measure.mjs --check` also asserts the claims made in the lesson.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build as esbuild } from 'esbuild';
import { rollup } from 'rollup';
import { minify } from 'terser';
import { build as vite } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const variants = [
  'class',
  'private-fields',
  'static-class',
  'object',
  'object-dynamic',
  'functions',
  'namespace',
  'namespace-dynamic',
  'client-functions',
];
const unusedMethods = ['getComments', 'getAlbums', 'getPhotos', 'getTodos', 'createPost', 'updatePost', 'deletePost', 'searchUsers'];
// Path fragments that only appear in the bodies of the eight unused operations.
const unusedBodies = ['/comments', '/albums', '/photos', '/todos', 'encodeURIComponent', 'DELETE'];

const entry = (variant) => path.join(root, 'src', variant, 'main.js');
const terser = async (code, options = {}) => (await minify(code, { module: true, compress: true, mangle: true, ...options })).code;

async function esbuildBundle(variant, minifyOutput) {
  const result = await esbuild({ entryPoints: [entry(variant)], bundle: true, format: 'esm', minify: minifyOutput, write: false, logLevel: 'silent' });
  return result.outputFiles[0].text;
}

async function rollupBundle(variant) {
  const bundle = await rollup({ input: entry(variant), logLevel: 'silent' });
  const { output } = await bundle.generate({ format: 'es' });
  await bundle.close();
  return output[0].code;
}

async function viteBundle(variant) {
  const result = await vite({
    root,
    configFile: false,
    logLevel: 'silent',
    build: { write: false, target: 'esnext', modulePreload: false, rollupOptions: { input: entry(variant) } },
  });
  const output = (Array.isArray(result) ? result[0] : result).output;
  return output.find((item) => item.type === 'chunk' && item.isEntry).code;
}

const toolchains = {
  'esbuild + terser': async (variant) => terser(await esbuildBundle(variant, false)),
  'esbuild --minify': (variant) => esbuildBundle(variant, true),
  'rollup + terser': async (variant) => terser(await rollupBundle(variant)),
  'vite build': viteBundle,
};

const size = (code) => `${Buffer.byteLength(code)} / ${gzipSync(code, { level: 9 }).length}`;
const outputs = {};
const rows = {};
for (const variant of variants) {
  outputs[variant] = {};
  rows[variant] = {};
  for (const [name, run] of Object.entries(toolchains)) {
    const code = (await run(variant)).trim();
    outputs[variant][name] = code;
    rows[variant][name] = size(code);
    const file = path.join(root, 'dist', variant, `${name.replace(/[^a-z]+/g, '-')}.js`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${code}\n`);
  }
}
console.log('Bundle size in bytes: raw / gzip -9');
console.table(rows);

// Two extra experiments on the unminified esbuild bundle.
const classBundle = await esbuildBundle('class', false);
const objectBundle = await esbuildBundle('object', false);
const objectDynamicBundle = await esbuildBundle('object-dynamic', false);
const experiments = {
  'class, terser default': await terser(classBundle),
  'class, terser mangle.properties': await terser(classBundle, { mangle: { properties: true } }),
  'object, terser default (1 pass)': await terser(objectBundle),
  'object, terser compress.passes=2': await terser(objectBundle, { compress: { passes: 2 } }),
  'object-dynamic, terser compress.passes=2': await terser(objectDynamicBundle, { compress: { passes: 2 } }),
};
console.log('Extra terser options on the esbuild bundle: raw / gzip -9');
console.table(Object.fromEntries(Object.entries(experiments).map(([name, code]) => [name, size(code)])));

if (process.argv.includes('--check')) {
  const has = (code, words) => words.filter((word) => code.includes(word));
  for (const name of Object.keys(toolchains)) {
    // A class, a static class and a dynamically indexed object keep every method and its name.
    for (const variant of ['class', 'private-fields', 'static-class', 'object-dynamic', 'namespace-dynamic']) {
      assert.deepEqual(has(outputs[variant][name], unusedMethods), unusedMethods, `${variant} / ${name} must keep all method names`);
    }
    // Private names are renamed, public method names are not.
    assert(!outputs['private-fields'][name].includes('baseUrl'), `private-fields / ${name} must rename #baseUrl`);
    assert(outputs.class[name].includes('this.baseUrl'), `class / ${name} must keep this.baseUrl`);
    // Separate exports: unused functions and all original function names are gone.
    for (const variant of ['functions', 'namespace', 'client-functions']) {
      assert.deepEqual(has(outputs[variant][name], [...unusedMethods, ...unusedBodies, 'getUser', 'getPost']), [], `${variant} / ${name} must drop unused functions and names`);
    }
    // A static namespace import costs nothing compared to named imports.
    assert.equal(outputs.namespace[name], outputs.functions[name], `namespace / ${name} must equal named imports`);
    assert(outputs.functions[name].length * 2 < outputs.class[name].length, `functions / ${name} must be less than half of class`);
  }
  // Renaming properties shortens names but cannot remove unused methods.
  assert.deepEqual(has(experiments['class, terser mangle.properties'], unusedBodies), unusedBodies);
  assert.deepEqual(has(experiments['class, terser mangle.properties'], unusedMethods), []);
  // A second compress pass can dissolve a statically accessed object, but not a dynamically indexed one.
  assert.deepEqual(has(experiments['object, terser compress.passes=2'], unusedBodies), []);
  assert.deepEqual(has(experiments['object-dynamic, terser compress.passes=2'], unusedBodies), unusedBodies);
  console.log('All checks passed.');
}
