import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import { parse as parseYaml } from 'yaml';
import { parse as parseHtml } from 'parse5';

const root = 'content/docs';
const removed = 'system-design/01-distributed-system-terms';
const parser = unified().use(remarkParse).use(remarkFrontmatter).use(remarkMdx);
const files = (await readdir(root, { recursive: true })).filter((file) => file.endsWith('.mdx'));
const pages = new Map();
const problems = [];
function check(condition, message) { if (!condition) problems.push(message); }
function visit(node, fn) {
  fn(node);
  for (const child of node.children ?? []) visit(child, fn);
}
function htmlVisit(node, fn) {
  fn(node);
  for (const child of node.childNodes ?? []) htmlVisit(child, fn);
}
function attr(node, name) { return node.attrs?.find((item) => item.name === name)?.value; }

for (const file of files) {
  const source = await readFile(path.join(root, file), 'utf8');
  const tree = parser.parse(source);
  const fm = tree.children.find((node) => node.type === 'yaml');
  const metadata = fm ? parseYaml(fm.value) : {};
  check(typeof metadata?.title === 'string' && metadata.title.trim(), `${file}: missing title`);
  check(typeof metadata?.description === 'string' && metadata.description.trim(), `${file}: missing description`);
  check(!source.includes(removed), `${file}: reference to removed page`);
  check(!/^```mermaid\b/m.test(source), `${file}: legacy Mermaid fence`);
  const slugger = new GithubSlugger();
  const headings = [];
  const links = [];
  visit(tree, (node) => {
    if (node.type === 'heading') {
      const text = toString(node);
      check(node.depth !== 1, `${file}: duplicate body H1`);
      check(!/^(Câu hỏi|Trả lời|Câu trả lời mẫu|Dành cho level|Câu hỏi follow-up)$/.test(text), `${file}: Q&A framing`);
      headings.push({ depth: node.depth, text, id: slugger.slug(text), offset: node.position.start.offset });
    }
    if (node.type === 'link') links.push(node.url);
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      for (const item of node.attributes ?? []) {
        if (item.type === 'mdxJsxAttribute' && item.name === 'href' && typeof item.value === 'string') links.push(item.value);
      }
    }
  });
  const toc = headings.filter((heading) => heading.text === 'Mục lục');
  check(toc.length === 1 && headings[0] === toc[0], `${file}: manual TOC must be the first section`);
  const index = tree.children.findIndex((node) => node.type === 'heading' && toString(node) === 'Mục lục');
  const tocList = tree.children[index + 1];
  check(tocList?.type === 'list', `${file}: missing TOC list`);
  const tocLinks = [];
  if (tocList?.type === 'list') visit(tocList, (node) => { if (node.type === 'link') tocLinks.push(decodeURIComponent(node.url)); });
  const expected = headings.filter((heading) => (heading.depth === 2 || heading.depth === 3) && heading !== toc[0]).map((heading) => `#${heading.id}`);
  check(JSON.stringify(tocLinks) === JSON.stringify(expected), `${file}: TOC differs from H2/H3 order or anchors`);
  pages.set(file.replace(/\.mdx$/, ''), { file, source, headings, links });
}
check(!pages.has(removed), 'Removed page still authored');

for (const [slug, page] of pages) {
  for (const href of page.links) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    const url = new URL(href, `https://docs.invalid/${slug}`);
    const target = decodeURIComponent(url.pathname).replace(/^\//, '').replace(/\.(?:md|mdx)$/, '').replace(/\/$/, '');
    if (!target) continue; // Site root is intentionally a redirect.
    const destination = pages.get(target) ?? pages.get(`${target}/index`);
    // Public assets are allowed, but an unknown lesson route is not.
    if (!destination) {
      const asset = path.resolve('public', `.${url.pathname}`);
      const publicRoot = path.resolve('public');
      let exists = false;
      if (asset.startsWith(`${publicRoot}${path.sep}`)) {
        try { await access(asset); exists = true; } catch { /* reported below */ }
      }
      check(exists, `${page.file}: broken internal target ${href}`);
    } else if (url.hash) {
      const id = decodeURIComponent(url.hash.slice(1));
      check(destination.headings.some((heading) => heading.id === id), `${page.file}: broken heading ${href}`);
    }
  }
}

for (const file of (await readdir(root, { recursive: true })).filter((file) => file.endsWith('meta.json'))) {
  const metadata = JSON.parse(await readFile(path.join(root, file), 'utf8'));
  check(Array.isArray(metadata.pages), `${file}: missing navigation order`);
  check(new Set(metadata.pages).size === metadata.pages.length, `${file}: duplicate navigation entry`);
  for (const entry of metadata.pages) {
    const target = path.posix.join(path.posix.dirname(file), entry).replace(/^\.\//, '');
    const matches = pages.has(target) || [...pages.keys()].some((slug) => slug.startsWith(`${target}/`));
    check(matches, `${file}: unknown navigation entry ${entry}`);
  }
  // Every directly authored page must be reachable through explicit ordering.
  for (const slug of pages.keys()) {
    if (path.posix.dirname(slug) === path.posix.dirname(file)) {
      check(metadata.pages.includes(path.posix.basename(slug)), `${file}: page omitted from navigation: ${slug}`);
    }
  }
}

if (process.argv.includes('--export')) {
  for (const [slug, page] of pages) {
    const document = parseHtml(await readFile(path.join('dist', slug, 'index.html'), 'utf8'));
    let article;
    htmlVisit(document, (node) => { if (attr(node, 'id') === 'nd-page') article = node; });
    check(Boolean(article), `${page.file}: exported article missing`);
    const ids = [];
    let h1 = 0;
    if (article) htmlVisit(article, (node) => {
      if (node.tagName === 'h1') h1++;
      // Viewer accessibility headings are not authored MDX sections.
      if ((node.tagName === 'h2' || node.tagName === 'h3') && attr(node, 'class')?.split(' ').includes('group/heading')) ids.push(attr(node, 'id'));
    });
    check(h1 === 1, `${page.file}: expected one exported H1, got ${h1}`);
    const expected = page.headings.filter((heading) => heading.depth === 2 || heading.depth === 3).map((heading) => heading.id);
    check(JSON.stringify(ids) === JSON.stringify(expected), `${page.file}: exported heading anchors differ`);
    const html = await readFile(path.join('dist', slug, 'index.html'), 'utf8');
    check(!html.includes(`href="/${removed}`), `${page.file}: removed page remains in exported navigation`);
  }
  let exists = false;
  try { await access(path.join('dist', removed, 'index.html')); exists = true; } catch { /* deletion expected */ }
  check(!exists, 'Deleted route remains in static export');
}

assert.equal(problems.length, 0, problems.join('\n'));
console.log(`Content contract passed: ${pages.size} lessons, TOCs, internal links and metadata${process.argv.includes('--export') ? ', plus exported HTML' : ''}.`);
