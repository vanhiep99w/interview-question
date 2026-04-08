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
│   └── NN-question-slug.mdx  # Each question = 1 file, 1 category — dùng .mdx, KHÔNG dùng .md
```

> **Bắt buộc dùng `.mdx`** cho tất cả câu hỏi. File `.md` không parse JSX — các component như `<Tabs>`, `<Steps>`, `<Callout>` sẽ render ra raw text thay vì UI.

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
> Luôn dùng blockquote `>`. Xem chi tiết "Câu trả lời mẫu — interview feel" bên dưới.

---

## Phân tích chi tiết
> Xem chi tiết "Phân tích chi tiết — flow và narrative" bên dưới.

---

## Bẫy thường gặp
> Format bắt buộc — xem "Format thống nhất" bên dưới.

---

## Câu hỏi follow-up
> Format bắt buộc — xem "Format thống nhất" bên dưới.

---

## Xem thêm
- Link đến câu hỏi liên quan **đã tồn tại** trong project.
- **Không để placeholder** ("thêm khi có nội dung mới"). Nếu chưa có doc liên quan, bỏ trống section.
```

### Câu trả lời mẫu — interview feel

Đoạn văn 5-8 câu, **dùng blockquote `>`**, giọng tự nhiên như đang kể trong phỏng vấn. Phải nghe như Senior engineer kể kinh nghiệm thật — không phải student đọc sách.

**Anti-patterns (CẤM):**
- ❌ Mở bằng định nghĩa: *"X là Y, Z là W, Off-heap là..."* → đây là textbook, không phải interview
- ❌ Liệt kê tính năng: *"Redis có List, Set, Hash, Stream..."* → interviewer đã biết, họ muốn nghe trade-off
- ❌ Chỉ nói lý thuyết mà không anchor vào kinh nghiệm hoặc quyết định cụ thể

**Patterns đúng:**
- ✅ Mở bằng insight/mindset: *"Việc đầu tiên tôi làm không phải là mở terminal..."*
- ✅ Mở bằng approach: *"Đây là bài toán upsert quy mô lớn — điều đầu tiên tôi tránh là..."*
- ✅ Mở bằng systematic thinking: *"Tôi sẽ không đoán nguyên nhân mà bắt đầu bằng đo lường..."*
- ✅ Có ít nhất 1 tín hiệu kinh nghiệm: trade-off đã chọn, sai lầm đã gặp, hoặc quyết định đã ra trong production

**Litmus test:** đọc to lên — nếu nghe như đang đọc documentation hoặc Wikipedia thì rewrite.

### Phân tích chi tiết — flow và narrative

Không chỉ liệt kê code + diagram — phải có **dẫn dắt** giữa các section.

**Quy tắc:**
1. **Sắp xếp theo mức quan trọng trong interview**, không theo thứ tự sách giáo khoa. Ví dụ: Heap (90% vấn đề) → Off-heap (bug khó) → Stack (ít gặp), không phải Stack → Heap → Off-heap.
2. **Câu hỏi knowledge/concept: mở bằng production scenario** rồi dẫn dắt lý thuyết qua lens debug. Ví dụ: *"Pod bị OOMKill, heap usage chỉ 40% — chuyện gì đang xảy ra?"* → từ đó giải thích 3 vùng nhớ.
3. **Narrative giữa các section**: không nhảy code block → code block. Mỗi code block/config phải có paragraph giải thích TẠI SAO, không chỉ WHAT.
4. **Mọi "magic number" phải giải thích nguồn gốc**: batch 10K rows — tại sao 10K? Pool size 10 — công thức từ đâu? TTL 60s — trade-off gì?
5. **Transition**: khi chuyển sang section mới, 1-2 câu giải thích tại sao section này tiếp theo là logic (ví dụ: "Sau khi load xong staging, bước tiếp theo là merge — nhưng merge 1 triệu rows trong 1 transaction sẽ lock quá lâu, nên phải batch.").

### Loại câu hỏi và approach

Mỗi loại câu hỏi cần cách tiếp cận khác nhau cho sample answer và phân tích chi tiết:

| Loại | Câu trả lời mẫu mở bằng | Phân tích chi tiết |
|------|-------------------------|-------------------|
| **Behavioral / Incident** | Mindset trước, action sau: *"Việc đầu tiên không phải mở terminal..."* | Timeline → scenario branches → commands → communicate |
| **Knowledge / Concept** | Scenario production làm hook: *"Tuần trước pod bị kill dù heap 40%..."* | Production problem → giải thích theory qua debug → code minh hoạ |
| **System Design** | Systematic thinking: *"Tôi sẽ không đoán mà bắt đầu bằng đo lường..."* | Measure → identify bottleneck → solve đúng tầng → monitor |
| **So sánh (A vs B)** | Use case thực tế của team: *"Chúng tôi chọn X vì project cần..."* | Team's use case → comparison table → khi nào đối thủ thắng → licensing/ops |

### Format thống nhất

**Bẫy thường gặp** — mỗi bẫy dùng format này, ngăn cách bằng `---`:

```markdown
❌ **"Câu trả lời sai phổ biến"**
→ Tại sao sai: [giải thích]
✅ Đúng hơn: [câu trả lời đúng]

---
```

**Câu hỏi follow-up** — dùng `###` header + paragraph 3-5 câu:

```markdown
### 1. Câu hỏi follow-up đầu tiên?

Paragraph trả lời 3-5 câu, đủ chi tiết để người đọc biết hướng trả lời mà không cần đọc thêm tài liệu khác.
```

### Code accuracy

- **Verify annotation/API tồn tại** trước khi dùng: ví dụ `@RedisListener` không có trong Spring Data Redis — phải dùng `MessageListenerAdapter` + `RedisMessageListenerContainer`.
- **Format string đúng framework**: SLF4J dùng `{}`, không phải Python `{:.1f}`.
- **Class/method phải thật**: không bịa tên method. Nếu không chắc, check javadoc hoặc ghi rõ là pseudo-code.

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
