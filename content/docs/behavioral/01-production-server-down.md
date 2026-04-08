---
title: "2h sáng — Server production sập, 10,000 users online"
description: "Incident response: quy trình xử lý sự cố production khẩn cấp — triage, mitigate, communicate, recover."
---

# 2h sáng — Server production sập, 10,000 users online

## Câu hỏi

> **2h sáng. Server production sập. 10,000 users đang online. Bạn làm gì NGAY LẬP TỨC?**

---

## Cốt lõi cần nhớ

**Mitigate trước, root cause sau.** Đừng cố hiểu hết rồi mới hành động — bleeding phải dừng trước.

**Một người chỉ huy, không ai "freelance".** Khi nhiều engineer tự ý thay đổi production song song mà không báo nhau, outage thường kéo dài gấp đôi. (Google SRE gọi đây là "freelancing" — một trong những nguyên nhân phổ biến nhất làm outage tệ hơn.)

**Im lặng là sai lầm lớn nhất.** Alert team ngay từ phút đầu, dù chưa biết gì.

---

## Quy trình xử lý

### Giai đoạn 1 — Xác nhận sự cố (0–2 phút)

- Vào monitoring dashboard (Datadog, Grafana, CloudWatch) — xem error rate, latency, traffic drop
- Ping health check endpoint — xác nhận server thực sự down, không phải false alarm
- Kiểm tra status page của cloud provider — phân biệt lỗi của mình hay của infra

> [!IMPORTANT]
> Không fix gì ở bước này. Mục tiêu duy nhất: **xác nhận sự cố có thật và đang ảnh hưởng user**.
>
> Alert nên đo **trải nghiệm người dùng** (error rate, latency p99), không phải internal metrics (CPU, RAM). CPU spike chưa chắc là incident — user bị lỗi 500 mới là incident.

---

### Giai đoạn 2 — Alert team + Assign IC (song song với Giai đoạn 1)

- Tạo **incident channel** ngay (ví dụ: Slack `#incident-20240408-0200`)
- Tag on-call engineer + tech lead
- Assign **Incident Commander (IC)** — một người duy nhất có quyền quyết định

```
🚨 INCIDENT: Production down ~2:00 AM
Impact: ~10,000 users affected
Symptoms: [triệu chứng]
Status: Investigating
IC: @tên
Ops: @tên
```

> [!NOTE]
> **IC không phải người sửa.** Theo mô hình Google SRE, IC tập trung 100% vào điều phối: ai làm gì, cập nhật stakeholders, quyết định go/no-go cho các thay đổi. Khi áp lực cao, engineer tự nhiên chỉ nhìn log — IC tồn tại để ngăn điều đó.
>
> Thực tế nhiều công ty page **2 người**: một người fix, một người coordinate.

---

### Giai đoạn 3 — Triage (2–10 phút)

Mục tiêu: đủ hypothesis để hành động — không cần chắc chắn 100%.

**5 câu hỏi cần trả lời ngay:**

| Câu hỏi | Nơi kiểm tra |
|---------|-------------|
| Có deployment nào gần đây không? | CI/CD history (Jenkins, GitHub Actions) |
| Metrics thay đổi đột ngột lúc mấy giờ? | Grafana, Datadog |
| Error gì? Stack trace ở đâu? | Application logs (ELK, CloudWatch Logs) |
| Database, cache, queue còn sống không? | RDS, Redis, SQS health |
| Traffic spike hay drop? | Load balancer metrics |

**Phân loại nhanh theo triệu chứng:**

```
Deployment gần đây  → Rollback ngay
Traffic spike       → Scale out / rate limit
DB overload         → Kill slow queries, bật read replica
Memory leak         → Restart pod/container, điều tra sau
Infra failure       → Failover sang AZ/region khác
```

---

### Giai đoạn 4 — Mitigate (ưu tiên tốc độ)

Mitigate ≠ Fix. Mục tiêu: **khôi phục service nhanh nhất có thể**, dù chưa hiểu root cause.

<Steps>
<Step>
**Rollback** nếu có deployment trong vòng vài giờ qua — đây là bước đầu tiên nên thử

```bash
# Kubernetes
kubectl rollout undo deployment/my-app

# Verify
kubectl rollout status deployment/my-app
```
</Step>

<Step>
**Scale out** nếu triệu chứng là resource exhaustion

```bash
kubectl scale deployment my-app --replicas=10
```
</Step>

<Step>
**Restart** instance/pod bị crash (nếu chưa rollback được ngay)

```bash
kubectl rollout restart deployment/my-app
```
</Step>

<Step>
**Enable maintenance mode / feature flag kill switch** nếu cần thêm thời gian

Hiển thị trang thông báo cho user thay vì trả lỗi 500.
</Step>
</Steps>

> [!IMPORTANT]
> **Controlled ramp-up sau khi restore.** Khi services phục hồi sau major outage, đừng mở traffic đột ngột — "thundering herd" (flood of reconnecting clients) có thể đánh sập hệ thống lần nữa. Bật dần dần, rate limit trong cửa sổ phục hồi.
>
> Bài học từ Cloudflare outage 2023: khi PDX-04 data center phục hồi, làn sóng reconnect từ clients đã overload các service vừa recover.

---

### Giai đoạn 5 — Communicate (liên tục trong suốt incident)

- Cập nhật incident channel **mỗi 10–15 phút** dù chưa có kết quả
- Update status page công khai nếu có (statuspage.io)
- Khi resolved, thông báo rõ:

```
✅ RESOLVED: 2:47 AM
Downtime: ~47 phút
Root cause: Memory leak sau deploy v2.3.1
Fix applied: Rollback về v2.3.0
Monitoring: Ổn định, error rate về 0
Next: Post-mortem lúc 10h sáng
```

---

### Giai đoạn 6 — Root cause & Post-mortem (sau khi ổn định)

- Điều tra root cause thực sự khi không còn áp lực — **đừng làm điều này lúc 3h sáng**
- Viết **blameless post-mortem**: timeline chi tiết, root cause, contributing factors, action items cụ thể
- Review lại: điều gì **không được test** mà đáng lẽ phải test? (Kinh nghiệm Cloudflare: họ test single-facility failures nhưng chưa bao giờ test xóa toàn bộ một data center — dependencies ẩn mới lộ ra khi đó)

---

## Sai lầm hay gặp khi phỏng vấn

| Sai | Đúng |
|-----|------|
| "Tôi sẽ tìm nguyên nhân trước rồi fix" | Mitigate trước, root cause song song hoặc sau |
| "Tôi tự xử lý một mình" | Alert team ngay, assign IC từ phút đầu |
| "Fix xong rồi báo" | Communicate liên tục mỗi 10-15 phút |
| "Restart server là xong" | Restart là mitigation tạm thời, vẫn cần post-mortem |
| "Bring it all back up at once" | Controlled ramp-up để tránh thundering herd |

---

## Câu hỏi follow-up

### 1. Làm sao bạn biết đây là lúc cần escalate lên leadership?

Escalate khi: incident kéo dài quá 30 phút mà chưa có mitigation rõ ràng, hoặc impact vượt ngưỡng (revenue loss, data loss risk, SLA breach). Đừng chờ "chắc chắn" mới báo — thà escalate sớm rồi update "false alarm" còn hơn để leadership bị bất ngờ.

### 2. Nếu không thể rollback thì sao?

Chuyển sang các mitigation thay thế theo thứ tự: feature flag kill switch → tắt tính năng bị lỗi → maintenance mode → scale out để giảm error rate. Đồng thời bắt đầu hotfix song song nhưng không deploy cho đến khi test kỹ trong staging.

### 3. Kể về một incident mà đánh giá severity ban đầu của bạn bị sai. Sai theo hướng nào?

*(Câu hỏi này test calibration và self-awareness.)* Câu trả lời tốt thừa nhận cả hai hướng — over-escalate (tốn resource khi không cần) và under-escalate (phản ứng chậm khi cần nhanh) — và giải thích điều gì đã thay đổi đánh giá của bạn.

### 4. Bạn đã từng chạy chaos engineering / game day chưa? Phát hiện gì bất ngờ?

Câu này phân biệt người **đã làm thực tế** với người chỉ đọc lý thuyết. Câu trả lời thực thường là: "Chúng tôi test X nhưng phát hiện ra dependency ẩn vào Y mà không ai biết tồn tại." Nếu chưa có kinh nghiệm, trả lời thành thật và mô tả bạn sẽ thiết kế game day như thế nào.
