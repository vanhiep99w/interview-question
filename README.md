# Interview Questions

Website tổng hợp câu hỏi phỏng vấn kỹ thuật. Mỗi câu hỏi là một file `.md` riêng, gồm câu hỏi và câu trả lời chi tiết bằng tiếng Việt.

**Stack:** Next.js 15 + Fumadocs + Cloudflare Pages

## Chạy local

```bash
npm install
npm run dev    # localhost:3000
```

## Deploy

```bash
npm run deploy
```

## Thêm câu hỏi mới

1. Tạo file `content/docs/{category}/NN-ten-cau-hoi.md`:

```md
---
title: "Câu hỏi là gì?"
description: "Mô tả ngắn"
---

## Câu hỏi

...

## Trả lời

...
```

2. Thêm tên file vào `content/docs/{category}/meta.json`:

```json
{
  "title": "JavaScript",
  "pages": ["01-existing", "02-ten-cau-hoi"]
}
```

## Categories

| Folder | Chủ đề |
|--------|--------|
| `javascript/` | JavaScript core concepts |
| `react/` | React & frontend |
| `nodejs/` | Node.js & backend |
| `database/` | SQL, NoSQL, indexing |
| `system-design/` | Architecture & scalability |
| `behavioral/` | Soft skills & behavioral |

## Thêm category mới

1. Tạo folder `content/docs/{category}/`
2. Tạo `meta.json` với `title` và `pages`
3. Thêm tên folder vào `content/docs/meta.json`
