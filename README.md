# Interview Questions

Tài liệu học kỹ thuật bằng tiếng Việt: giải thích cơ chế từ tình huống cụ thể, ví dụ, trade-off và cách kiểm chứng. Tên repository được giữ nguyên, nhưng nội dung được tổ chức thành bài học, không dùng khung câu hỏi/câu trả lời hay phân cấp kỳ vọng phỏng vấn.

**Stack:** Next.js 16 + Fumadocs + docs-kit + Cloudflare Pages · Node.js 22+

## Mục lục

- [Chạy local](#chạy-local)
- [Chủ đề và lộ trình đọc](#chủ-đề-và-lộ-trình-đọc)
- [Biên soạn bài học](#biên-soạn-bài-học)
- [Kiểm tra trước khi commit](#kiểm-tra-trước-khi-commit)
- [Diagram và source tham chiếu](#diagram-và-source-tham-chiếu)
- [Deploy](#deploy)

## Chạy local

```bash
npm ci
npm run dev
```

Mở `http://localhost:3000`. Nguồn biên soạn là `content/docs/**/*.mdx`; không có bước sinh lại bài từ README. Hook `source:build` chỉ sinh tài nguyên Source Explorer từ `examples/` và kiểm tra references.

## Chủ đề và lộ trình đọc

| Thư mục | Nội dung |
| --- | --- |
| `algorithms/` | Big O, thời gian và bộ nhớ |
| `behavioral/` | Điều phối và chẩn đoán sự cố production |
| `caching/` | Redis/Memcached, cache correctness và recovery |
| `database/` | Lựa chọn database, index, locking, encrypted search, transaction |
| `java/` | Bộ nhớ JVM và bulk upsert |
| `web/` | CORS, build tooling, WebSocket và micro-frontend |
| `security/` | Encoding, cryptography và TLS |
| `system-design/` | Placement, latency, scaling, CQRS, webhook, import |

Có thể đọc từng bài độc lập. Với backend, bắt đầu bằng lựa chọn database, locking và transaction, sau đó đọc cache/scaling trước CQRS, webhook và import. Với frontend, bắt đầu bằng build tooling, webpack/Vite, rồi đến Module Federation hoặc SharedWorker. Các liên kết cuối bài nối những phần có chung boundary kỹ thuật.

## Biên soạn bài học

Skill biên soạn dùng chung nằm ở collection root:
`../.agents/skills/fumadocs-technical-writer/SKILL.md`.
Standalone checkout cần được cung cấp collection root; không tạo bản skill riêng trong repo này.

1. Tạo `content/docs/<category>/NN-ten-bai.mdx` với frontmatter `title`, `description`.
2. Mở bằng vấn đề của người đọc; giới thiệu kiến thức nền và phạm vi ví dụ.
3. Đặt mục lục thủ công trước section nội dung đầu tiên, bao phủ các heading cấp 2/3.
4. Giải thích cơ chế qua ví dụ, rồi làm rõ lựa chọn, giới hạn và failure path. Không thêm H1 trong body vì Fumadocs đã render `title`.
5. Giữ tên file/route ổn định khi sửa bài. Thêm bài mới vào `meta.json` của category; thêm category vào `content/docs/meta.json` nếu cần.

Ví dụ cấu trúc:

````mdx
---
title: "Tên bài học"
description: "Vấn đề và kết quả người đọc có thể đạt được."
---

Một tình huống cụ thể cho thấy vì sao cần hiểu cơ chế này.

## Mục lục

- [Cơ chế](#cơ-chế)
- [Kiểm chứng](#kiểm-chứng)

## Cơ chế

Giải thích từ trường hợp đơn giản, kèm ví dụ và trade-off.

## Kiểm chứng

Nêu cách thử, điều cần quan sát và giới hạn còn lại.
````

Phần thuật ngữ distributed systems tổng hợp cũ đã được xóa; không tái tạo trang đó hoặc giữ liên kết tới nó. Thuật ngữ cần thiết được giải thích tại bài sử dụng.

## Kiểm tra trước khi commit

```bash
npm run test:docs
npm run source:build
npm run build
npm run test:docs -- --export
npm run test:source
```

`test:docs` kiểm tra frontmatter, H1, mục lục/anchor, internal links và metadata. `--export` kiểm tra thêm HTML đã export, các anchor thực tế và việc trang đã xóa không còn trong output. Browser suite kiểm tra docs-kit, copy, Source Explorer, routing và các bài có lab tương ứng.

`npm run test:bulk-doc` là kiểm thử opt-in cho SQL trong bài bulk upsert. Cần PostgreSQL binaries local (có thể đặt `PG_BIN`); script tạo cluster tạm chỉ lắng nghe Unix socket, không dùng database đang chạy, rồi tự dừng và dọn cluster. Nó kiểm tra insert/update, stale version, rollback, replay và checkpoint, không benchmark bảng một tỷ rows.

Không deploy để kiểm tra prose. Ví dụ minh họa không tự được thực thi bởi docs-kit; chỉ ghi đã chạy command/lab khi đã kiểm chứng riêng. Kiểm thử source labs là lệnh opt-in `npm run examples:labs:test`, có cài/build project mẫu trong thư mục tạm và cần browser.

## Diagram và source tham chiếu

Dùng D2 cho kiến trúc, flow và state transitions; không dùng Mermaid hoặc sơ đồ box-and-arrow viết tay. Logs, payloads, CLI output và danh sách file thật vẫn giữ ở dạng text. Chỉ dùng Terminal Session, Protocol Exchange, Code Diff, Span Waterfall hoặc Code Walkthrough khi chúng giúp giải thích một câu hỏi kỹ thuật cụ thể.

- [Tích hợp docs-kit, icon local và kiểm thử](docs/docs-kit.md).
- [Source Explorer: project, snapshot, named region và build-time validation](docs/source-explorer.md).

Ví dụ `<SourceRef project="webpack-react-demo" file="webpack.config.cjs" region="entry" />` mở source đầy đủ thay vì chép cả project vào bài. Source nằm trong `examples/`; không sửa generated assets như nguồn biên soạn.

## Deploy

```bash
npm run deploy
```

Đây là lệnh xuất bản thật lên Cloudflare Pages, không phải validation. Chỉ chạy khi có yêu cầu triển khai và môi trường phù hợp.
