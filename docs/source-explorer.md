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
3. Khai báo **tường minh** `files` được phép publish. Không thêm `.env`, secrets, `node_modules`, build output hoặc file cá nhân.
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

Mỗi snapshot nên là một project độc lập chạy được. Ví dụ `basic` và `async-bootstrap` giữ source đầy đủ riêng biệt để reference không vô tình mở trạng thái khác với nội dung bài.

`examples/` được loại khỏi type-check của website: dependencies và cấu hình TypeScript của từng ví dụ phải được kiểm tra trong chính project đó.

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
