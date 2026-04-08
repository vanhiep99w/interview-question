---
title: "2h sáng — Server production sập, 10,000 users online"
description: "Incident response: quy trình xử lý sự cố production khẩn cấp — triage, mitigate, communicate, recover."
---

# 2h sáng — Server production sập, 10,000 users online

## Câu hỏi

> **2h sáng. Server production sập. 10,000 users đang online. Bạn làm gì NGAY LẬP TỨC?**

---

## Cốt lõi cần nhớ

Ưu tiên theo thứ tự: **Giảm thiệt hại → Tìm nguyên nhân → Fix → Ngăn tái phát.**

Đừng nhảy thẳng vào fix khi chưa hiểu. Đừng im lặng với team.

---

## Quy trình xử lý

### Giai đoạn 1 — Xác nhận sự cố (0–2 phút)

```
Alert báo → Kiểm tra thực tế ngay
```

- Vào monitoring dashboard (Datadog, Grafana, CloudWatch) — xem error rate, latency, traffic drop
- Ping health check endpoint — xác nhận server thực sự down, không phải false alarm
- Kiểm tra status page của cloud provider (AWS, GCP) — phân biệt lỗi của mình hay của infra

> [!IMPORTANT]
> Không fix gì cả ở bước này. Mục tiêu duy nhất: **xác nhận sự cố có thật**.

---

### Giai đoạn 2 — Alert team (song song với Giai đoạn 1)

- Tạo **incident channel** ngay (Slack `#incident-2024-xxxx`)
- Tag on-call engineer, tech lead, và người có context nhất về hệ thống
- Thông báo ngắn gọn:

```
🚨 INCIDENT: Production down ~2:00 AM
Impact: ~10,000 users affected
Symptoms: [mô tả triệu chứng]
Status: Investigating
IC (Incident Commander): @bạn
```

Không cần đầy đủ thông tin mới alert — alert trước, điều tra sau.

---

### Giai đoạn 3 — Triage (2–10 phút)

Mục tiêu: tìm **hypothesis** về nguyên nhân, không cần chắc chắn 100%.

**Câu hỏi cần trả lời:**

| Câu hỏi | Nơi kiểm tra |
|---------|-------------|
| Có deployment nào gần đây không? | CI/CD history (Jenkins, GitHub Actions) |
| Metrics thay đổi đột ngột lúc mấy giờ? | Grafana, Datadog |
| Error gì? Stack trace ở đâu? | Application logs (ELK, CloudWatch Logs) |
| Database, cache, queue còn sống không? | RDS, Redis, SQS health |
| Traffic spike hay drop? | Load balancer metrics |

**Phân loại nguyên nhân phổ biến:**

```
Deployment mới → Rollback ngay
Traffic spike   → Scale up / rate limit
DB overload     → Kill slow queries, read replica
Memory leak     → Restart pod/container, điều tra sau
Infra failure   → Failover sang region khác
```

---

### Giai đoạn 4 — Mitigate (ưu tiên tốc độ)

Mitigate ≠ Fix. Mục tiêu: **khôi phục service nhanh nhất**, dù chưa hiểu root cause.

<Steps>
<Step>
**Rollback** nếu có deployment trong vòng 2 giờ qua

```bash
# Kubernetes
kubectl rollout undo deployment/my-app

# Docker
docker service update --rollback my-app
```
</Step>

<Step>
**Scale out** nếu triệu chứng là resource exhaustion

```bash
# Tăng replicas
kubectl scale deployment my-app --replicas=10
```
</Step>

<Step>
**Restart** instance/pod bị crash (nếu không rollback được ngay)

```bash
kubectl rollout restart deployment/my-app
```
</Step>

<Step>
**Enable maintenance mode / circuit breaker** nếu cần thời gian điều tra

Hiển thị trang thông báo cho user thay vì trả lỗi 500.
</Step>
</Steps>

---

### Giai đoạn 5 — Communicate (liên tục trong suốt incident)

- Cập nhật incident channel **mỗi 10–15 phút** dù chưa có kết quả
- Update status page công khai nếu có (statuspage.io)
- Khi resolved: thông báo rõ ràng, include thời gian downtime

```
✅ RESOLVED: 2:47 AM
Downtime: ~47 phút
Root cause: Memory leak sau deploy v2.3.1
Fix: Rollback về v2.3.0
Next: Post-mortem lúc 10h sáng
```

---

### Giai đoạn 6 — Root cause & Post-mortem (sau khi service ổn định)

- Điều tra đúng root cause khi không còn áp lực
- Viết **post-mortem không đổ lỗi** (blameless post-mortem):
  - Timeline chi tiết
  - Root cause thực sự
  - Action items cụ thể (monitoring mới, test bổ sung, runbook)

---

## Sai lầm hay gặp khi phỏng vấn

| Sai | Đúng |
|-----|------|
| "Tôi sẽ tìm nguyên nhân trước" | Mitigate trước, tìm nguyên nhân song song |
| "Tôi tự xử lý một mình" | Alert team ngay, kể cả 2h sáng |
| "Fix xong rồi nói" | Communicate liên tục trong suốt incident |
| "Restart server là xong" | Restart là mitigate tạm thời, vẫn cần tìm root cause |

---

## Checklist tóm tắt

```
□ Xác nhận sự cố thật (không phải false alarm)
□ Alert team + tạo incident channel
□ Assign Incident Commander (IC)
□ Check: deployment gần đây? metrics? logs? dependencies?
□ Mitigate: rollback / scale / restart / maintenance mode
□ Update status page
□ Cập nhật team mỗi 10-15 phút
□ Confirm service ổn định
□ Schedule post-mortem
```
