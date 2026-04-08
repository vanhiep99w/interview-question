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
- `public/_redirects` — Cloudflare Pages redirect: `/` → first content page

## Content Structure

```
content/docs/
├── meta.json                 # Root sidebar order (list active categories only)
├── {category}/
│   ├── meta.json             # { "title": "...", "pages": ["01-easy", "02-medium", "03-hard"] }
│   └── NN-question-slug.md   # Each question = 1 file, 1 category
```

**Active categories:** thêm category vào `meta.json` khi đã có ít nhất 1 câu hỏi. Xoá khỏi `meta.json` nếu category rỗng.

## Category & Ordering Rules

- Mỗi câu hỏi thuộc **đúng 1 category** — không đặt cùng câu hỏi ở nhiều nơi.
- Thứ tự file trong `pages` array = **dễ → khó**: câu hỏi khái niệm cơ bản trước, tình huống phức tạp sau.
- Prefix `NN-` phản ánh độ khó tương đối trong category, không phải thứ tự thêm vào.
- Khi thêm câu hỏi mới, chèn vào đúng vị trí độ khó — không append cuối mù quáng.

## Adding a New Question

1. Xác định category phù hợp (chỉ 1).
2. Tạo `content/docs/{category}/NN-question-slug.md` với đầy đủ 8 sections (xem template bên dưới).
3. Thêm vào `pages` array trong `{category}/meta.json` đúng vị trí độ khó.
4. Nếu category mới: tạo folder + `meta.json`, thêm vào root `meta.json`.
5. Cập nhật `public/_redirects` nếu đây là câu hỏi đầu tiên của toàn site.
6. `npm run build` để verify trước khi commit.

## Adding a New Category

1. Tạo folder `content/docs/{new-category}/`
2. Tạo `content/docs/{new-category}/meta.json` với `title` và `pages`
3. Thêm `"{new-category}"` vào `pages` array trong root `content/docs/meta.json`
4. **Chỉ thêm khi đã có ít nhất 1 câu hỏi** — không tạo category rỗng.

## meta.json Rules

- **Never overwrite** an existing `meta.json` — always read first, then patch.
- `"pages"` array controls sidebar order; files not listed won't appear.
- Use sequential prefix `01-`, `02-`, ... reflecting difficulty order (easy → hard).

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

**Nguyên tắc:** code snippet dùng Java 17, commands dùng `kubectl`/`aws`/`kafka-topics.sh`/`redis-cli`, alert → Teams webhook.

## Question Content Guidelines

### Research trước khi viết (câu hỏi tình huống thực tế)

**Bắt buộc dùng `WebSearch`** để tìm engineering blog, post-mortem thực tế (Netflix, Uber, Cloudflare, Google SRE...) trước khi viết câu hỏi dạng incident/system design/behavioral. Mục tiêu: câu trả lời phản ánh thực tế production, không phải lý thuyết.

### Template bắt buộc — 8 sections theo thứ tự

```markdown
## Câu hỏi
> Câu hỏi gốc

---

## Dành cho level
[Mid / Senior / Staff — expectations khác nhau ở mỗi level]

---

## Cốt lõi cần nhớ
2-3 dòng insight quan trọng nhất interviewer muốn nghe.

---

## Câu trả lời mẫu
Đoạn văn 5-8 câu, giọng tự nhiên như đang kể trong phỏng vấn.
Không phải bullet point — phải nghe như người thật nói chuyện thật.

---

## Phân tích chi tiết
[Diagram Mermaid + các section giải thích, commands, code, bảng so sánh]

---

## Bẫy thường gặp
Những câu trả lời nghe có vẻ đúng nhưng khiến interviewer trừ điểm.
Mỗi bẫy: [Câu trả lời sai] → [Tại sao sai] → [Câu đúng].

---

## Câu hỏi follow-up
1-4 câu interviewer hay hỏi tiếp, mỗi câu kèm gợi ý trả lời ngắn.

---

## Xem thêm
Link đến các câu hỏi liên quan trong project.
```

### Level mapping

| Level | Interviewer expect |
|-------|--------------------|
| Mid | Biết quy trình cơ bản, thực hiện được khi có hướng dẫn |
| Senior | Dẫn dắt được incident, quyết định trade-off, communicate tốt |
| Staff | Thiết kế process/runbook cho cả team, ngăn ngừa class of problems |

### Diagram

Dùng Mermaid cho flow/timeline, ASCII art cho architecture tĩnh. Mỗi câu hỏi tình huống nên có ít nhất 1 diagram minh hoạ luồng xử lý.

## Fumadocs Components (no import needed)

`Callout`, `Card`/`Cards`, `Step`/`Steps`, `Tab`/`Tabs`, `Accordion`/`Accordions`, `TypeTable` — all registered globally in `page.tsx`.

> [!IMPORTANT]
> JSX components trong MDX **bắt buộc có dòng trống** trước và sau nội dung markdown bên trong. Thiếu dòng trống → render ra raw JSX text thay vì UI component.
>
> ```mdx
> ❌ Sai:
> <Tab value="Mid">
> Nội dung **markdown** ở đây
> </Tab>
>
> ✅ Đúng:
> <Tab value="Mid">
>
> Nội dung **markdown** ở đây
>
> </Tab>
> ```

## Language

Nội dung viết bằng **tiếng Việt**. Giữ tiếng Anh cho tên kỹ thuật, code, config.
