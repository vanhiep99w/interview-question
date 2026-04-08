# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Interview Questions website — Next.js 15 + Fumadocs static site deployed on Cloudflare Pages.
Each interview question is a separate `.md` file in `content/docs/{category}/`.

## Commands

```bash
npm run dev      # Dev server — localhost:3000
npm run build    # Verify build — always run before committing
npm run deploy   # Build + push to Cloudflare Pages
```

## Category Rules

- Mỗi câu hỏi thuộc **đúng 1 category**.
- **Không tạo category rỗng** — chỉ tạo folder + meta.json khi đã có câu hỏi.
- Xoá category khỏi root `meta.json` nếu không còn câu hỏi nào.
- Thứ tự trong `pages` array = **dễ → khó** trong mỗi category.

## File Naming

- Format: `NN-slug.mdx` — **bắt buộc dùng `.mdx`**, không dùng `.md`
- File `.md` không parse JSX → `<Tabs>`, `<Steps>`, `<Callout>` render ra raw text
- Số `NN` phản ánh độ khó tương đối (01 = dễ nhất)
- Khi thêm câu hỏi mới, chèn đúng vị trí độ khó, không append cuối.

## meta.json Safety

**Never overwrite an existing `meta.json`.** Always:
1. Read current content first
2. Insert new entry at the correct difficulty position in `pages` array
3. Preserve all existing fields

## Question Template — 8 sections bắt buộc theo thứ tự

```markdown
---
title: "Tên câu hỏi"
description: "Mô tả ngắn 1 dòng"
---

# Tên câu hỏi

## Câu hỏi
> Câu hỏi gốc

---

## Dành cho level
**Mid / Senior / Staff** — mô tả expectations khác nhau ở mỗi level.

---

## Cốt lõi cần nhớ
2-3 dòng insight quan trọng nhất — đây là thứ interviewer muốn nghe trước tiên.

---

## Câu trả lời mẫu
Luôn dùng blockquote `>`. 5-8 câu, giọng Senior engineer kể kinh nghiệm thật.
**CẤM** mở bằng định nghĩa ("X là Y") hoặc liệt kê tính năng.
**ĐÚNG**: mở bằng insight/mindset/approach, có ≥1 tín hiệu kinh nghiệm production.
Litmus test: đọc to lên — nghe như docs thì rewrite.

---

## Phân tích chi tiết
Sắp xếp theo **mức quan trọng interview**, không theo thứ tự sách giáo khoa.
Câu hỏi knowledge: **mở bằng production scenario** → lý thuyết qua lens debug.
Mọi magic number (batch size, pool size, TTL) phải giải thích TẠI SAO.
Narrative giữa các section — không nhảy code block → code block.

---

## Bẫy thường gặp
Format mỗi bẫy, ngăn cách bằng `---`:
❌ **"Câu trả lời sai phổ biến"**
→ Tại sao sai: ...
✅ Đúng hơn: ...

---

## Câu hỏi follow-up
Dùng `### N. Tiêu đề` + paragraph 3-5 câu. Không dùng `**bold**` cho tiêu đề.

---

## Xem thêm
- Link câu hỏi liên quan **đã tồn tại**. Không để placeholder.
```

## Loại câu hỏi và approach

| Loại | Sample answer mở bằng | Phân tích chi tiết |
|------|----------------------|-------------------|
| Behavioral/Incident | Mindset trước, action sau | Timeline → scenarios → commands → communicate |
| Knowledge/Concept | Production scenario làm hook | Problem → theory qua debug → code |
| System Design | Systematic: "đo trước khi làm" | Measure → identify → solve đúng tầng → monitor |
| So sánh (A vs B) | Use case thực tế của team | Team's case → comparison → khi nào đối thủ thắng |

## Code Accuracy

- Verify annotation/API tồn tại trước khi dùng (ví dụ: `@RedisListener` không có trong Spring)
- Format string đúng framework: SLF4J dùng `{}`, không phải Python `{:.1f}`
- Class/method phải thật — nếu không chắc, ghi rõ là pseudo-code

## Research trước khi viết

Với câu hỏi tình huống (incident, system design, behavioral) — **bắt buộc `WebSearch` trước**:
- Engineering blog: Netflix, Uber, Cloudflare, Google SRE, Shopify, GitHub
- Post-mortem thực tế, Medium, DEV.to, Hacker News

## Default Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.x, Java 17 |
| Frontend | React (TypeScript) |
| Container | Kubernetes trên AWS EKS |
| Messaging | Apache Kafka |
| Cache | Redis (AWS ElastiCache) |
| Cloud | AWS (EKS, RDS, S3, ALB, CloudWatch) |
| Monitoring | Prometheus + Grafana + CloudWatch |
| Observability | OpenTelemetry |
| CI/CD | Jenkins + GitHub Actions → ECR → EKS |
| Tracking | Jira |
| Communication | Microsoft Teams |

Code snippet: Java 17. Commands: `kubectl`, `aws`, `kafka-topics.sh`, `redis-cli`. Alert: Teams webhook.

## Level Expectations

| Level | Interviewer expect |
|-------|--------------------|
| Mid | Biết quy trình cơ bản, thực hiện được khi có hướng dẫn |
| Senior | Dẫn dắt được, quyết định trade-off, communicate proactively |
| Staff | Thiết kế process/runbook cho team, ngăn ngừa class of problems |

## Content Language

- Nội dung: **tiếng Việt**
- Technical terms, code, config: giữ tiếng Anh
