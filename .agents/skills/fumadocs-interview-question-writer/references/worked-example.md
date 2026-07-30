# Worked example (original, not from any external site)

This is a complete, made-up example showing every required section. Use it as a structural template — the topic (a gradually-slowing API) is different from any real site's content, written fresh to demonstrate the shape.

---

```mdx
---
title: API chạy 6 tiếng thì chậm dần, restart lại là hết
description: Debug hiện tượng response time tăng dần theo thời gian chạy trên stack Spring Boot + PostgreSQL — resource leak, không phải bug logic.
---

## Câu hỏi

> **Team bạn nhận báo cáo: API bình thường lúc mới deploy, nhưng cứ chạy khoảng 6 tiếng là response time tăng dần từ 50ms lên 2-3 giây. Restart lại thì về bình thường, rồi lặp lại chu kỳ. Bạn debug thế nào?**

---

## Dành cho level

`Mid` `Senior`

Ở mức Mid, interviewer muốn thấy bạn nhận ra ngay đây là dấu hiệu **resource leak theo thời gian** (không phải bug logic, vì logic sai thì sai ngay từ đầu, không "chậm dần"), và biết đo thay vì đoán. Ở mức Senior, interviewer muốn nghe thêm cách bạn thu hẹp phạm vi nghi ngờ (connection pool, heap, thread) bằng dữ liệu thực tế trước khi đọc code.

Điểm cộng: nhắc tới việc restart theo lịch chỉ là band-aid tạm thời, không phải giải pháp — và chủ động đề xuất cách phòng ngừa cho lần sau.

---

## Cốt lõi cần nhớ

**"Chậm dần theo thời gian" gần như luôn là leak, không phải logic sai.** Bug logic thì sai ngay lập tức và sai giống nhau mỗi lần; leak thì tích lũy.

**Đo trước, đọc code sau.** Đừng mở source code trước khi biết chính xác cái gì đang tăng dần: connections, heap, hay threads.

**Restart không phải là fix.** Restart chỉ dọn sạch tài nguyên đã leak — nguyên nhân leak vẫn còn nguyên trong code.

---

## Câu trả lời mẫu

> "Nghe mô tả 'chậm dần rồi restart là hết', tôi nghĩ ngay đến resource leak chứ không phải logic sai — logic sai thì lỗi ngay từ phút đầu, không cần chờ 6 tiếng. Việc đầu tiên tôi làm là dựng một dashboard theo dõi ba thứ song song trong lúc API đang chậm dần: số connection đang mở tới database, heap usage của JVM, và số thread đang chạy. Tôi sẽ để hệ thống chạy tự nhiên đến khi chậm lại, thay vì cố tái hiện ngay lập tức, vì leak cần thời gian tích lũy mới lộ ra. Nếu connection tăng dần không giảm, tôi nghi ngờ code không đóng connection ở nhánh exception. Nếu heap tăng dần không được GC dọn, tôi nghi ngờ một cache hoặc list nào đó giữ tham chiếu object mãi mãi. Sau khi xác định đúng loại tài nguyên đang leak, tôi mới bắt đầu đọc code ở đúng chỗ đó, thay vì đọc toàn bộ codebase. Trong lúc điều tra, tôi vẫn để restart theo lịch chạy tạm để giảm ảnh hưởng user, nhưng ghi rõ đó chỉ là biện pháp tạm."

---

## Phân tích chi tiết

### Vì sao "chậm dần" khác với "chậm ngay từ đầu"

Một API chậm ngay từ khi mới deploy thường là vấn đề thiết kế: thiếu index, N+1 query, thuật toán sai độ phức tạp. Một API nhanh lúc đầu rồi chậm dần theo thời gian chạy lại là dấu hiệu khác hẳn: có thứ gì đó đang tích lũy trong quá trình chạy mà không được giải phóng. Phân biệt đúng hai loại này ngay từ đầu giúp tránh mất thời gian tối ưu sai chỗ.

### Ba nghi phạm thường gặp

| Tài nguyên leak | Triệu chứng đo được | Log/lỗi điển hình |
| --- | --- | --- |
| Database connection | Số connection active tăng dần, không giảm dù request đã xong | `Connection is not available, request timed out` |
| JVM heap | Heap usage tăng dần sau mỗi full GC, không về mức cũ | `OutOfMemoryError: Java heap space` (giai đoạn cuối) |
| Thread | Số thread tăng dần, không giảm về baseline | `OutOfMemoryError: unable to create new native thread` |

### Kịch bản 1 — Connection leak

**Nhận diện:** Theo dõi số connection active qua thời gian (ví dụ metric `hikaricp_connections_active`). Nếu đường biểu diễn đi lên đều và không bao giờ giảm về mức baseline giữa các đợt traffic thấp, đó là leak — connection bình thường sẽ tăng giảm theo tải, không đi lên một chiều.

**Nguyên nhân phổ biến:** Code mở connection thủ công (không dùng try-with-resources) và quên đóng khi có exception giữa chừng — connection bị "treo" mãi trong pool cho đến khi hết pool.

**Mitigate ngay:** Restart theo lịch (ví dụ mỗi 4 tiếng) để dọn sạch connection leak trong lúc chờ fix — chấp nhận downtime ngắn định kỳ còn hơn để nó tự sập bất ngờ.

**Fix đúng:** Đảm bảo mọi connection được mở trong khối try-with-resources hoặc tương đương, kể cả các nhánh xử lý exception — connection phải được đóng dù code phía trên có ném lỗi hay không.

### Kịch bản 2 — Heap leak (object không được giải phóng)

**Nhận diện:** Heap usage sau mỗi lần full GC vẫn cao hơn lần trước, thay vì về gần mức cũ — nghĩa là có object "sống sót" qua GC mà lẽ ra phải bị dọn.

**Nguyên nhân phổ biến:** Một cache hoặc list static giữ tham chiếu đến object mà không bao giờ xóa — ví dụ cache tự viết tay không có giới hạn kích thước hoặc TTL.

**Mitigate ngay:** Tăng heap size tạm thời để kéo dài thời gian trước khi OOM xảy ra, cho thêm thời gian điều tra.

**Fix đúng:** Thêm giới hạn kích thước và TTL cho mọi cache tự quản lý, hoặc chuyển sang thư viện cache có cơ chế eviction rõ ràng.

### Kịch bản 3 — Thread leak

**Nhận diện:** Số thread đang chạy tăng dần không giảm, dù không có traffic tăng tương ứng.

**Nguyên nhân phổ biến:** Tạo thread pool mới liên tục thay vì tái sử dụng một pool duy nhất, hoặc thread bị block vĩnh viễn chờ một tài nguyên không bao giờ sẵn sàng.

**Mitigate ngay:** Restart để giải phóng toàn bộ thread đang treo.

**Fix đúng:** Dùng một thread pool được quản lý tập trung (ví dụ `ExecutorService` dùng chung), và đặt timeout cho mọi thao tác có thể block.

---

## Bẫy thường gặp

❌ **"Tôi sẽ đọc lại toàn bộ code để tìm bug"** → Tại sao sai: đọc code mà không biết trước tài nguyên nào đang leak là tìm kim trong đống rơm — codebase lớn có thể mất cả ngày mà vẫn không ra.
✅ Đúng hơn: đo trước để biết chính xác connection, heap, hay thread đang tăng, rồi mới đọc code ở đúng khu vực đó.

---

❌ **"Restart định kỳ là giải pháp ổn rồi"** → Tại sao sai: restart chỉ xóa triệu chứng, nguyên nhân leak vẫn còn nguyên — nếu traffic tăng, chu kỳ 6 tiếng có thể rút ngắn bất ngờ thành 1 tiếng và gây sự cố ngoài kế hoạch.
✅ Đúng hơn: dùng restart như biện pháp tạm trong lúc điều tra, không coi đó là kết thúc vấn đề.

---

❌ **"Cứ tăng resource (CPU/RAM) lên là được"** → Tại sao sai: tăng resource chỉ kéo dài thời gian trước khi leak gây sự cố, không ngăn nó xảy ra — và tốn chi phí vận hành không cần thiết.
✅ Đúng hơn: tăng resource có thể dùng làm biện pháp tạm trong lúc điều tra, nhưng phải song song với việc tìm root cause.

---

## Câu hỏi follow-up

### 1. Làm sao phân biệt connection leak với việc pool size đặt quá nhỏ?

Pool size quá nhỏ gây timeout ngay khi traffic cao, và số connection active dao động lên xuống theo tải bình thường. Connection leak thì số connection active đi lên một chiều, kể cả trong khoảng traffic thấp — dấu hiệu rõ nhất là nó không bao giờ giảm về baseline.

### 2. Nếu không có sẵn dashboard theo dõi, bạn làm gì để đo nhanh?

Dùng lệnh có sẵn của hệ thống ngay lúc đó: kiểm tra số connection thực tế trên database, chạy công cụ chụp heap dump của JVM để so sánh hai thời điểm cách nhau vài tiếng, hoặc đếm số thread đang chạy của tiến trình. Không cần dashboard đẹp để có dữ liệu đủ dùng ngay trong lúc debug khẩn cấp.

### 3. Leak này có nên coi là production incident không?

Có, nếu nó ảnh hưởng đến trải nghiệm người dùng thật (response time vượt ngưỡng chấp nhận được) — kể cả khi có "giải pháp tạm" là restart theo lịch. Một vấn đề tái diễn đều đặn vẫn cần được xử lý dứt điểm, không nên coi restart định kỳ là trạng thái bình thường mới.

---

## Xem thêm

- [Heap vs Off-heap memory trong Java](/docs/java/heap-vs-off-heap) — cần hiểu heap để debug đúng Kịch bản 2.
- [Connection pool tuning cho Spring Boot + PostgreSQL](/docs/database/connection-pool-tuning) — mở rộng thêm về Kịch bản 1.
```
