# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Interview Questions website — Next.js 15 + Fumadocs static site deployed on Cloudflare Pages.
Each interview question is a separate `.md` file in `content/docs/{category}/`.

## Commands

```bash
npm run dev      # Dev server — localhost:3000
npm run build    # Verify changes build correctly before committing
npm run deploy   # Build + push to Cloudflare Pages
```

Always run `npm run build` after making changes to verify no build errors.

## Content Rules

### Every question file must have:
```yaml
---
title: "Tên câu hỏi"
description: "Mô tả ngắn gọn 1 dòng"
---
```

### After creating a file, always update `meta.json`:
```json
// content/docs/{category}/meta.json
{
  "title": "Category Name",
  "pages": ["01-existing", "02-new-question"]
}
```

Files not in `pages` array will not appear in the sidebar.

### File naming:
- Format: `NN-slug.md` (e.g. `01-closures.md`, `02-promises.md`)
- Sequential number prefix = sidebar order
- Slug: lowercase, hyphen-separated, descriptive

## meta.json Safety

**Never overwrite an existing `meta.json`.** Always:
1. Read current content first
2. Add new entry to the correct position in `pages` array
3. Preserve all existing fields

## Content Language

- Questions and answers: **tiếng Việt**
- Technical terms, code, config values: keep in English
