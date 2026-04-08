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
- `src/app/[[...slug]]/layout.tsx` — DocsLayout wrapper (sidebar + nav)
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

## Default Tech Stack cho câu hỏi

Khi viết ví dụ, code snippet, hoặc scenario cụ thể — **luôn dùng tech stack này** trừ khi user chỉ định khác:

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.x, Java 17 |
| Frontend | React (TypeScript) |
| Container/Orchestration | Kubernetes (AWS EKS) |
| Messaging | Apache Kafka |
| Cache | Redis (AWS ElastiCache) |
| Cloud | AWS (EKS, RDS, S3, ALB, CloudWatch) |
| Monitoring & Alerting | Prometheus + Grafana, AWS CloudWatch |
| Observability | OpenTelemetry (tracing, metrics, logs) |
| CI/CD | Jenkins + GitHub Actions |
| Source control | GitHub |
| Incident/Task tracking | Jira |
| Team communication | Microsoft Teams |
| Container registry | Amazon ECR |

**Nguyên tắc khi viết ví dụ:**
- Code snippet dùng Java 17 syntax (records, sealed classes, text blocks nếu phù hợp)
- Command dùng `kubectl`, `aws cli`, `kafka-topics.sh`, `redis-cli`
- Monitoring dùng Prometheus metrics + Grafana dashboard + CloudWatch
- Alert dùng Prometheus Alertmanager hoặc CloudWatch Alarms → Teams webhook
- Pipeline: GitHub (source) → GitHub Actions (lint/test) → Jenkins (build/deploy) → ECR → EKS
- Tracing: OpenTelemetry → Jaeger hoặc AWS X-Ray

## Question Content Guidelines

### Câu hỏi tình huống thực tế (incident, system design, behavioral)

**Bắt buộc tìm kiếm thực tế trước khi viết.** Dùng `WebSearch` để tìm:
- Bài blog engineering từ các công ty lớn (Netflix, Uber, Cloudflare, GitHub...)
- Post-mortem thực tế (postmortem.wtf, srebook.io, các engineering blog)
- Kinh nghiệm chia sẻ trên Medium, DEV.to, Hacker News

Mục tiêu: câu trả lời phản ánh **thực tế ngoài sản xuất**, không phải lý thuyết sách giáo khoa.

### Cấu trúc bắt buộc của mỗi câu hỏi

```markdown
## Câu hỏi        ← câu hỏi gốc

---

## Cốt lõi cần nhớ   ← 2-3 dòng tóm tắt insight quan trọng nhất

---

## [Nội dung trả lời chi tiết]

---

## Câu hỏi follow-up   ← 1-4 câu interviewer hay hỏi tiếp
```

### Câu hỏi follow-up

Mỗi file **bắt buộc có section `## Câu hỏi follow-up`** ở cuối, gồm 1–4 câu mà interviewer thường hỏi tiếp. Mỗi câu follow-up phải có câu trả lời gợi ý ngắn (2-5 dòng), không để trống.

Ví dụ:
```markdown
## Câu hỏi follow-up

### 1. Làm sao bạn biết đây là lúc cần escalate?
...câu trả lời gợi ý...

### 2. Nếu rollback không được thì sao?
...câu trả lời gợi ý...
```

## Mermaid Diagrams

Use fenced code blocks with `mermaid` language tag — the `remarkMermaid` plugin in `source.config.ts` transforms them to `<MermaidDiagram>` at build time.

## Fumadocs Components (no import needed)

`Callout`, `Card`/`Cards`, `Step`/`Steps`, `Tab`/`Tabs`, `Accordion`/`Accordions`, `TypeTable` — all registered globally in `page.tsx`.

## Language

Nội dung câu hỏi và câu trả lời viết bằng **tiếng Việt**. Giữ tiếng Anh cho tên kỹ thuật, code, config.
