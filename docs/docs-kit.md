# Component cho tài liệu: docs-kit

Website dùng `@vanhiep99w/docs-kit@0.9.0` (Node.js **22+**, React 19).
Plugin build-time ở `source.config.ts`, MDX components ở `src/components/mdx.tsx`,
stylesheet import một lần trong `src/app/globals.css`.

## Chọn cách trình bày

| Nội dung | Dùng |
| --- | --- |
| Kiến trúc, flowchart, state machine, sequence | Fence `d2` |
| Cây thư mục, log, query plan, payload, công thức ngắn | Code fence thông thường; không đổi sang D2 |
| Các lệnh có ngữ cảnh, output/kết quả kỳ vọng | `terminal-session` |
| HTTP request và response | `protocol-exchange` |
| Thay đổi code/config trước–sau | `code-diff` |
| Timeline latency có thời điểm và duration | `span-waterfall` |
| Giải thích code theo từng bước/range | `code-walkthrough` |
| Source/config đầy đủ hoặc nhiều file | `SourceRef`, xem [Source Explorer](source-explorer.md) |

Chỉ dùng component khi giúp đọc dễ hơn. Giữ giải thích và điều kiện áp dụng trong
bài, không nhồi prose vào diagram. Không biến mọi mũi tên trong công thức hoặc
snippet thành sơ đồ.

## D2

Không cần import component trong MDX:

````mdx
```d2 title="Đường đi của request"
direction: right
client: Client
api: API
database: PostgreSQL {shape: cylinder}
client -> api: HTTPS
api -> database: Query
```
````

D2 render SVG sáng/tối **lúc build**, có sketch, ELK và một worker để giới hạn RAM.
Browser không tải D2 compiler/WASM. Cấu hình bật launcher **Explore diagram**
cho các sơ đồ: zoom, fit, pan, expand, copy source và tải SVG. Dùng
`interactive=false` ở fence nếu chỉ cần SVG tĩnh. Không JavaScript vẫn đọc được
SVG và mở source qua disclosure.

- Nhãn ngắn; dùng `"Dòng 1\nDòng 2"` để xuống dòng. Tách flow quá dài thay vì thu nhỏ chữ.
- Quote nhãn có dấu câu (`;`, `#`, `{}`, dấu `:`) để không vô tình tạo node/câu lệnh D2 mới.
- Sequence dùng `shape: sequence_diagram`; giữ thứ tự message, nhánh điều kiện,
  loop và dashed response. D2 groups chỉ minh họa vùng message, không thực thi
  hay tự chứng minh các nhánh chạy song song.
- State machine dùng node và cạnh có nhãn; state cùng tên trong hai container
  là hai node khác nhau, cần chỉ rõ path.
- `mode=tabs` + `scenarios` cho các tình huống độc lập; ví dụ failover trong
  `content/docs/system-design/01-distributed-system-terms.mdx`.
- `mode=steps` + `steps` khi các bước kế thừa nhau. Không tự autoplay.
- Fence `layout=elk|dagre|tala` hoặc frontmatter `d2Layout` để đổi layout.
- Không dùng D2 để giả vờ có trục thời gian tỷ lệ; dùng Span Waterfall khi có timing.

### Icons

Các icon đã tải từ [D2 Icons](https://icons.d2lang.com/) nằm trong
`content/diagrams/assets/`, với nguồn ghi ở `content/diagrams/README.md`.
Chỉ gắn logo khi đúng công nghệ, không dùng React để biểu thị browser/SharedWorker.

Từ bài ở `content/docs/<category>/`:

````mdx
```d2 title="Query store"
database: PostgreSQL {
  shape: cylinder
  icon: ../../diagrams/assets/postgresql.svg
}
```
````

`assetsRoot` chỉ allowlist thư mục ảnh này. Icon local được nhúng data URL vào SVG,
không cần request icon bên ngoài khi đọc hoặc build lại. Khi thêm icon, kiểm tra
SVG, nguồn và license/logo policy; không đưa script, tracking hoặc tài nguyên
không tin cậy vào repo. URL icon từ xa không được tự tải/cache bởi plugin.

### Build và cache

Cache D2 ở `.next/cache/docs-kit/d2`, ngoài output `dist/` và đã được
`.gitignore` loại qua `.next/`. Với Cloudflare Pages, chọn Node 22+ và bật Build
cache trong dashboard; repo không tự bật setting này. Cache lạnh vẫn build được,
không cần Go/D2 CLI hoặc render server.

Chỉ compile MDX/D2 đáng tin cậy trong repo; SVG được nhúng trực tiếp, không phải
dịch vụ sanitize/render input công khai. Cú pháp sai phải làm build thất bại,
không thay bằng hình trống.

## Các component khác

Các fence chứa YAML, được validate và chuẩn bị lúc build. Không chạy shell,
gửi HTTP request, thực thi source hoặc kết nối tracing backend.

Ví dụ thật trong docs:

- **Terminal Session:** triage pod trong `behavioral/01-production-server-down.mdx`.
  Command không chứa prompt; output chỉ khai báo nếu có transcript đã kiểm tra.
  Không tự đặt exit code/kết quả thành công.
- **Protocol Exchange:** GET không preflight trong `web/01-cors.mdx`. Giữ headers,
  status và body chính xác; mọi credentials phải là dữ liệu giả.
- **Code Diff:** `src/main.tsx` trước/sau async bootstrap trong
  `web/03-webpack-tu-source-den-trinh-duyet.mdx`. Code lấy từ hai snapshot source
  đã có; khi sửa source cần đồng bộ ví dụ này. Giữ các `SourceRef` gần đó.
- **Span Waterfall:** transaction chờ Payment API trong
  `database/05-long-running-transaction.mdx`. Ghi rõ `provenance.kind: illustrative`;
  không trình bày số minh họa như benchmark/trace production.

Code Walkthrough đã đăng ký để dùng khi cần; không thêm một bản code lặp chỉ để
dùng đủ component. Cú pháp và API tham khảo trong
`node_modules/@vanhiep99w/docs-kit/docs/` hoặc
[repository docs-kit](https://github.com/vanhiep99w/docs-kit).

**Source Explorer hiện có được giữ nguyên** (provider, drawer, generator, registry,
deep links). Không trộn adapter `CodeDiffWithSource`/`CodeWalkthroughWithSource`
của library với provider local: chúng dùng context riêng. Dùng `SourceRef` hiện
tại bên cạnh ví dụ cho đến khi có migration riêng được kiểm thử.

## Kiểm tra

```bash
npm run source:build
npm run build
npm run test:source
```

`tests/docs-kit.spec.ts` kiểm tra SVG sáng/tối của mọi fence, icon nhúng, zoom,
expand/Escape, scenarios, tương thích Source Explorer, copy command, diff,
waterfall, mobile và fallback không JavaScript. Browser test có thể dùng
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome`.
