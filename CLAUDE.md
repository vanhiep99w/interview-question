# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build static export to ./dist
npm run deploy   # Build + deploy to Cloudflare Pages
npm run preview  # Preview built dist locally via wrangler
```

## Stack

Next.js 15 (static export) + Fumadocs + Cloudflare Pages.

- `source.config.ts` — Fumadocs MDX config; defines `docs` loader pointing at `content/docs/`
- `src/lib/source.ts` — wraps the loader with `baseUrl: '/'`
- `src/app/[[...slug]]/page.tsx` — single catch-all route; renders all doc pages
- `src/components/mermaid.tsx` — client component for mermaid diagrams (lazy-loaded)

## Content Structure

```
content/docs/
├── meta.json                 # Root sidebar order (list categories by folder name)
├── index.md                  # Landing page
├── {category}/
│   ├── meta.json             # { "title": "...", "pages": ["01-foo", "02-bar"] }
│   └── 01-question-name.md   # Each question = 1 file
```

**Current categories:** `javascript`, `react`, `nodejs`, `database`, `system-design`, `behavioral`

## Adding a New Question

1. Create `content/docs/{category}/NN-question-slug.md` with frontmatter:
   ```yaml
   ---
   title: "Câu hỏi..."
   description: "Mô tả ngắn"
   ---
   ```
2. Add `"NN-question-slug"` to `pages` array in `content/docs/{category}/meta.json` — order = sidebar order.

## Adding a New Category

1. Create folder `content/docs/{new-category}/`
2. Create `content/docs/{new-category}/meta.json` with `title` and `pages`
3. Add `"{new-category}"` to `pages` array in `content/docs/meta.json`

## meta.json Rules

- **Never overwrite** an existing `meta.json` — always read first, then patch.
- `"pages"` array controls sidebar order; files not listed won't appear.
- Use sequential prefix `01-`, `02-`, ... in filenames for predictable ordering.

## Mermaid Diagrams

Use fenced code blocks with `mermaid` language tag — the `remarkMermaid` plugin in `source.config.ts` transforms them to `<MermaidDiagram>` at build time.

## Fumadocs Components (no import needed)

`Callout`, `Card`/`Cards`, `Step`/`Steps`, `Tab`/`Tabs`, `Accordion`/`Accordions`, `TypeTable` — all registered globally in `page.tsx`.

## Language

Nội dung câu hỏi và câu trả lời viết bằng **tiếng Việt**. Giữ tiếng Anh cho tên kỹ thuật, code, config.
