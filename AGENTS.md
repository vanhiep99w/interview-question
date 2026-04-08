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

## Default Tech Stack

Khi viết ví dụ, commands, hoặc scenario — **luôn dùng stack này** trừ khi user chỉ định khác:

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.x, Java 17 |
| Frontend | React (TypeScript) |
| Container/Orchestration | Kubernetes trên AWS EKS |
| Messaging | Apache Kafka |
| Cache | Redis (AWS ElastiCache) |
| Cloud | AWS (EKS, RDS, S3, ALB, CloudWatch) |
| Monitoring | Prometheus + Grafana + AWS CloudWatch |
| Observability | OpenTelemetry (traces, metrics, logs) |
| CI/CD | Jenkins + GitHub Actions |
| Source control | GitHub |
| Task tracking | Jira |
| Communication | Microsoft Teams |
| Container registry | Amazon ECR |

**Khi viết code snippet:** Java 17. **Khi viết commands:** `kubectl`, `aws`, `kafka-topics.sh`, `redis-cli`. **Khi viết alert/notification:** Prometheus Alertmanager hoặc CloudWatch Alarms → Teams webhook.

## Question Structure (bắt buộc)

Mỗi file câu hỏi phải có đủ các section sau theo thứ tự:

```markdown
## Câu hỏi

> Câu hỏi gốc viết ở đây

---

## Cốt lõi cần nhớ

2-3 dòng insight quan trọng nhất — đây là thứ interviewer muốn nghe.

---

## [Nội dung trả lời chi tiết]

...các section giải thích, diagram, checklist...

---

## Câu hỏi follow-up

### 1. [Câu follow-up]
...câu trả lời gợi ý ngắn (2-5 dòng)...

### 2. [Câu follow-up]
...
```

**Section `## Câu hỏi follow-up` là bắt buộc** — 1 đến 4 câu, mỗi câu kèm gợi ý trả lời ngắn.

## Research trước khi viết (câu hỏi tình huống thực tế)

Với câu hỏi dạng incident, system design, behavioral — **bắt buộc dùng `WebSearch` tìm kiếm thực tế trước**:

- Engineering blog của các công ty lớn (Netflix, Uber, Cloudflare, GitHub, Shopify...)
- Post-mortem thực tế
- Kinh nghiệm chia sẻ trên Medium, DEV.to, Hacker News

Mục tiêu: câu trả lời dựa trên **kinh nghiệm thực tế ngoài sản xuất**, không phải lý thuyết.

## Content Language

- Questions and answers: **tiếng Việt**
- Technical terms, code, config values: keep in English
