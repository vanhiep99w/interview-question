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

- Format: `NN-slug.md` — số `NN` phản ánh độ khó tương đối (01 = dễ nhất)
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
Đoạn văn 5-8 câu, giọng tự nhiên như đang nói trong phỏng vấn.
KHÔNG dùng bullet point ở section này — phải nghe như người thật kể chuyện thật.

---

## Phân tích chi tiết
Diagram Mermaid minh hoạ luồng + các section giải thích chi tiết:
commands thực tế, code Java 17, bảng so sánh, Prometheus metrics...

---

## Bẫy thường gặp
Những câu trả lời nghe có vẻ đúng nhưng khiến interviewer trừ điểm.
Format mỗi bẫy:
❌ [Câu trả lời sai phổ biến]
→ Tại sao sai: ...
✅ Đúng hơn: ...

---

## Câu hỏi follow-up
1-4 câu interviewer hay hỏi tiếp. Mỗi câu kèm gợi ý trả lời ngắn (2-5 dòng).

---

## Xem thêm
- Link câu hỏi liên quan trong project
```

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
