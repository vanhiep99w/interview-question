# Source Explorer cho tài liệu

Component xem source **chỉ đọc**, dùng chung trên toàn site. Không chạy project, không nhúng VS Code/Monaco và không cần server API. Source được highlight bằng Shiki lúc build, xuất thành JSON tĩnh và chỉ tải khi người đọc mở drawer bên phải.

## Dùng trong MDX

Không cần import; `SourceRef` đã được đăng ký trong `src/components/mdx.tsx`.

```mdx
Xem <SourceRef project="webpack-react-demo" file="webpack.config.cjs" region="entry" />.

<SourceRef project="webpack-react-demo" variant="button">
  Mở toàn bộ source
</SourceRef>

<SourceRef
  project="webpack-react-demo"
  snapshot="async-bootstrap"
  file="src/main.tsx"
  lines="1-4"
>
  Xem async bootstrap
</SourceRef>
```

Một project có thể được reference từ nhiều đoạn, nhiều bài. Dùng props dạng chuỗi tĩnh để script build kiểm tra reference.

Bài có `SourceRef` sẽ tự có nút **Source code** ở góc dưới bên phải. Nút mở source đầu tiên của bài; sau đó nhớ file/phiên bản vừa xem khi thu và mở lại. Reference trong bài vẫn mở trực tiếp đúng file và vùng code. Bài không có reference không hiện nút của project khác.

| Prop | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `project` | Có | ID trong registry |
| `snapshot` | Không | Phiên bản; mặc định `defaultSnapshot` của project |
| `file` | Không | Đường dẫn tương đối; mặc định `defaultFile` của snapshot |
| `region` | Không | Vùng code có tên, ưu tiên hơn số dòng khi source thay đổi |
| `lines` | Không | Một dòng (`"12"`) hoặc khoảng dòng (`"12-18"`); không dùng cùng `region` |
| `variant` | Không | `inline` (mặc định) hoặc `button` |
| `children` | Không | Nhãn; mặc định là tên file hoặc “Mở source ví dụ” |

## Thêm project hoặc phiên bản

1. Tạo source chạy được trong `examples/<project>/<snapshot>/`.
2. Thêm project/snapshot vào `examples/registry.json`.
3. Khai báo **tường minh** `files` được phép publish. Không thêm `.env`, secrets, `node_modules`, output chưa được duyệt hoặc file cá nhân. Chỉ publish một số artifact nhỏ đã kiểm tra khi bài cần phân tích output; xem phần build capture bên dưới.
4. Chạy `npm run source:build`.
5. Thêm `SourceRef` vào MDX và chạy `npm run build`.

Một entry registry:

```json
{
  "id": "webpack-react-demo",
  "title": "Webpack · React + TypeScript",
  "defaultSnapshot": "basic",
  "snapshots": [
    {
      "id": "basic",
      "title": "React cơ bản",
      "root": "examples/webpack-react-demo/basic",
      "defaultFile": "webpack.config.cjs",
      "files": ["package.json", "webpack.config.cjs"]
    }
  ]
}
```

Mỗi snapshot **source** nên là một project độc lập chạy được. Ví dụ `basic` và `async-bootstrap` giữ source đầy đủ riêng biệt để reference không vô tình mở trạng thái khác với nội dung bài. Snapshot **output** là capture để đọc/đối chiếu, không phải project hoặc bộ `dist` đầy đủ để deploy.

`examples/` được loại khỏi type-check của website: dependencies và cấu hình TypeScript của từng ví dụ phải được kiểm tra trong chính project đó.

### Ví dụ có nhiều app độc lập

Một snapshot có thể chứa cả host và remote, mỗi app có `package.json` riêng. Project `module-federation-react-vue` dùng cấu trúc này và publish cả `.vue` lẫn các script `.mjs`:

```mdx
<SourceRef project="module-federation-react-vue" file="vue-sub/src/mount.ts" region="mount-api">
  Xem API mà Vue remote expose
</SourceRef>
```

Kiểm tra ví dụ này riêng bằng `npm run examples:federation:test` từ root repository. Đây là kiểm thử opt-in: cài/build hai app trong thư mục tạm và kiểm tra chúng trong browser; `npm run test:source` chỉ kiểm tra website, reference và viewer, không tự cài dependencies của các app mẫu.

### Lab browser đơn app

- `frontend-build-lab`: Vite + React/TypeScript, static/dynamic import, build manifest và tree shaking.
- `shared-worker-websocket`: UI nhiều tab, SharedWorker, dedicated-worker fallback và backend WebSocket local; authentication trong backend là demo, không dùng cho production.

Chạy `npm run examples:labs:test` từ root repository để cài/build các lab trong thư mục tạm, kiểm tra browser ở dev/preview, lazy request/HMR, nhiều tab dùng chung socket, fallback và reconnect. Các snippet nhỏ vẫn nên giữ inline cạnh giải thích; chỉ reference implementation/config đầy đủ hoặc vùng code cần đối chiếu.

## Named regions

Dùng comment trong file JS/TS/TSX:

```js
// #region entry
entry: './src/main.tsx',
// #endregion entry
```

`region="entry"` tự tìm đúng khoảng dòng sau mỗi lần build. Không cần cập nhật số dòng khi thêm code phía trên.

Các marker được giữ trong source gốc để chạy bình thường, nhưng ẩn trong explorer và nội dung copy. **Số dòng trong explorer tính trên source đã bỏ marker**, không nhất thiết trùng số dòng file trong Git. Region không hỗ trợ lồng nhau; tên phải duy nhất trong một file. Các ngôn ngữ chưa có marker phù hợp có thể dùng `lines` hoặc reference toàn file.

## Build và development

- `npm run dev` / `npm run build` tự chạy `source:build` qua npm lifecycle hooks.
- Nếu sửa source ví dụ hoặc registry khi dev server đang mở, chạy lại `npm run source:build`, rồi reload trang để lấy dữ liệu mới.
- `public/source-examples/` là output tự sinh, không commit.
- Manifest trỏ tới assets có content hash; cache trong browser được chia theo URL. Không đưa source vào client bundle của từng trang.
- Build dừng nếu MDX reference sai project, snapshot, file, region hoặc khoảng dòng.
- Muốn thêm ngôn ngữ, cập nhật `langs` và bảng `languages` trong `scripts/build-source-examples.mjs`.

## Reference output sau build

Tách output khỏi source thành snapshot riêng, ví dụ `output-basic` và `output-async-bootstrap`. Với bài Webpack, tạo lại capture bằng lệnh chạy **tường minh** từ root:

```bash
npm run examples:webpack:build
npm run source:build
```

Lệnh đầu cài dependencies và build cả hai project trong thư mục tạm, lấy Webpack stats/source maps rồi cập nhật `examples/webpack-react-demo/output/` và các snapshot output trong registry. Không chạy nó ở mỗi lần build website. Các capture đã duyệt được commit; `public/source-examples/` và `dist/` local vẫn không commit.

Dùng alias ổn định để bài không phải sửa reference mỗi lần hash thay đổi:

```json
{
  "path": "dist/main.js",
  "source": "artifacts/main.abc123.js",
  "displayPath": "dist/main.abc123.js"
}
```

Đây là dạng object tùy chọn trong `files`, thay cho một chuỗi:

- `path`: định danh cho `SourceRef file`, cây file và deep link.
- `source`: file vật lý tương đối với `root` của snapshot; không được thoát khỏi thư mục đó.
- `displayPath`: tên hiển thị trên tab/tooltip, dùng tên emit thật có hash; có thể thêm nhãn “đã format” cho bản đọc. Không ảnh hưởng đường dẫn import hoặc URL của app.
- `format`: tùy chọn `"html"` cho file HTML cần xuống dòng/thụt lề trong explorer. Generator parse HTML5 rồi format bằng Prettier ở build time; không thay file artifact gốc. Code hiển thị, `Copy file` và số dòng đều dùng bản đã format. Không áp dụng tự động cho source hoặc bundle khác.

`abc123` ở ví dụ trên chỉ minh họa; capture script ghi tên thật. Viewer hỗ trợ `.map` như JSON, `.txt` như plain text, `.mjs` như JavaScript và `.vue` như Vue SFC.

```mdx
<SourceRef project="webpack-react-demo" snapshot="output-async-bootstrap" file="dist/main.js">
  Xem bundle main sau build
</SourceRef>
```

Phân biệt ba loại nội dung:

1. **Artifact nguyên bản:** HTML, bundle nhỏ và source maps nhỏ, copy byte-for-byte từ build. Không sửa chúng để gắn region hoặc làm như output viết tay là output thật. Riêng HTML output dùng descriptor `format: "html"` và nhãn `dist/index.html (đã format)` để bản đọc dễ nhìn; checksum trong report vẫn tính trên artifact nguyên bản, không phải nội dung đã format.
2. **Runtime view:** các phần `sourcesContent` dễ đọc từ source map, đặt dưới `runtime/` và ghi rõ không phải asset emit riêng. Source-map text có thể còn hash trung gian; view bảng tên chunk được đồng bộ với hash cuối từ stats và ghi từng thay thế trong report. Giữ bản JS emit nguyên trạng.
3. **Báo cáo/tóm tắt:** `build-report.json` và `source-maps/*.summary.json` là dữ liệu dẫn xuất, không phải file `.map` hoàn chỉnh. Dùng chúng để chỉ tên, bytes, modules và packages của bundle lớn thay vì nhúng cả React/vendor code vào viewer.

Thêm `capture` vào snapshot output:

```json
{
  "capture": { "sourceSnapshot": "async-bootstrap", "report": "build-report.json" }
}
```

Report phải ghi `sourceSnapshot` và `sourceFiles` gồm `file` + SHA-256 của toàn bộ source đã capture. Source build so checksum với source snapshot hiện tại và dừng nếu output đã cũ. Khi đổi source, refresh capture có chủ ý, kiểm tra lại hashes/refs rồi chạy website build. Đừng bỏ kiểm tra để giữ output cũ.

## Link, bàn phím và mobile

“Copy link” lưu trạng thái vào query, ví dụ:

```text
/web/03-webpack-tu-source-den-trinh-duyet/?source=webpack-react-demo&snapshot=basic&file=webpack.config.cjs&region=entry
```

Mở URL đó từ tab khác hoặc reload sẽ mở lại explorer. Query/anchor khác của tài liệu được giữ nguyên. Dùng `Copy link` trong explorer khi cần chia sẻ đầy đủ trạng thái; Ctrl/Cmd-click một reference cũng mở được tab mới.

Desktop có drawer bên phải và cây file; màn hình lớn dành riêng không gian bên cạnh bài viết, tạm ẩn mục lục để không che nội dung. Mobile dùng panel toàn màn hình với menu chọn file. Đây là **non-modal drawer**: không backdrop, không khóa cuộn trang và không giữ Tab trong panel. Có thể tiếp tục tương tác với reference hoặc đọc bài khi drawer mở.

Nút nổi đổi thành **Thu source** khi mở. Escape hoặc nút × cũng thu drawer. Khi focus còn trong drawer, việc thu sẽ trả focus về chỗ mở; nếu người đọc đang tương tác với bài thì giữ focus ở đó. Back đóng drawer vừa mở, Forward mở lại. Không đổi hash của heading. Drawer tôn trọng thiết lập reduced motion.

Source được xem và copy nhưng **không thực thi trong explorer**. File HTML chứa script cũng chỉ được hiển thị như text đã escape. Chỉ publish source tin cậy từ repository; không thêm API nhận đường dẫn file tùy ý.

## Kiểm thử

```bash
npx playwright install chromium
npm run test:source
```

Tests build và phục vụ bản static export tại cổng 3107, không dừng dev server hiện có. Kiểm tra lazy loading, region, chọn file/snapshot, copy, deep link, reload, Back/Forward, nút nổi, drawer không khóa bài, focus, mobile và retry khi lỗi tải.

Nếu dùng Chrome đã cài thay cho browser Playwright:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:source
```
