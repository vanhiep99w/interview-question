---
title: "2h sáng — Server production sập, 10,000 users online"
description: "Incident response thực tế: triage, mitigate, communicate trên stack Spring Boot + EKS + Kafka + Redis + AWS."
---

# 2h sáng — Server production sập, 10,000 users online

## Câu hỏi

> **2h sáng. Server production sập. 10,000 users đang online. Bạn làm gì NGAY LẬP TỨC?**

---

## Cốt lõi cần nhớ

**Mitigate trước, root cause sau.** Đừng cố hiểu hết rồi mới hành động — bleeding phải dừng trước.

**Một người chỉ huy, không ai "freelance".** Khi nhiều engineer tự ý thay đổi production song song mà không báo nhau, outage thường kéo dài gấp đôi. (Google SRE gọi đây là "freelancing".)

**Im lặng là sai lầm lớn nhất.** Alert team ngay từ phút đầu, dù chưa biết gì.

---

## Tech Stack trong ví dụ này

```
Backend   : Spring Boot 3.x (Java 17) trên AWS EKS
Frontend  : React → CloudFront → ALB
Database  : RDS PostgreSQL (HikariCP connection pool)
Cache     : Redis (AWS ElastiCache)
Messaging : Apache Kafka (MSK)
Monitoring: Prometheus + Grafana + CloudWatch
Tracing   : OpenTelemetry → AWS X-Ray
Alerting  : Prometheus Alertmanager → Microsoft Teams webhook
CI/CD     : GitHub Actions → Jenkins → Amazon ECR → EKS (ArgoCD)
Tracking  : Jira
```

---

## Quy trình xử lý tổng quát

### Giai đoạn 1 — Xác nhận sự cố (0–2 phút)

PagerDuty / Teams alert đến → kiểm tra ngay:

```bash
# 1. Xem pod nào đang crash
kubectl get pods -n production --sort-by='.status.startTime'

# 2. Error rate trên Grafana
# Prometheus query:
sum(rate(http_server_requests_seconds_count{status=~"5.."}[1m])) /
sum(rate(http_server_requests_seconds_count[1m]))

# 3. ALB Target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:...
```

Đồng thời kiểm tra:
- **AWS Health Dashboard** — có incident ở region không?
- **MSK/ElastiCache status** — dependency ngoài còn sống không?
- **Có deployment nào vừa xong không?** → Jenkins/GitHub Actions history

> [!IMPORTANT]
> Alert nên đo **trải nghiệm người dùng**: error rate p99, latency — không phải CPU/RAM. CPU spike chưa chắc là incident; user nhận lỗi 500 mới là incident.

---

### Giai đoạn 2 — Alert team + Assign IC (song song)

```
🚨 [INCIDENT] Production API down — 2:03 AM
Impact  : ~10,000 users, error rate 87%
Symptoms: Pods CrashLoopBackOff / health check failing
Status  : Investigating
IC      : @nam
Ops     : @hung
Jira    : INC-2024-0408 (tạo ngay)
```

- Tag vào Teams channel `#incident-prod`
- IC **không sửa code** — tập trung điều phối, update stakeholder mỗi 10–15 phút
- Kỹ sư Ops chịu trách nhiệm tay chân: chạy lệnh, rollback, scale

---

### Giai đoạn 3 — Triage nhanh (2–10 phút)

```bash
# Xem lý do pod chết
kubectl describe pod <pod-name> -n production | grep -A5 "Last State"

# Xem events gần nhất
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Log tail
kubectl logs <pod-name> -n production --previous --tail=100
```

Kết quả `kubectl describe` sẽ chỉ thẳng vào 1 trong 4 scenario phổ biến nhất bên dưới.

---

## Scenario 1 — OOMKilled: Pod bị kill do hết memory

### Nhận diện

```bash
kubectl describe pod <pod> -n production
# Output:
# Last State: Terminated
#   Reason: OOMKilled
#   Exit Code: 137

kubectl top pods -n production
# NAME              CPU    MEMORY
# api-server-xxx    120m   1.9Gi/2Gi   ← sát limit

# Prometheus:
container_memory_working_set_bytes{pod=~"api-server.*"}
```

Grafana alert đã kích hoạt:
```
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} > 0.85
```

### Nguyên nhân phổ biến

- **JVM không biết container limit**: thiếu flag `-XX:+UseContainerSupport`, JVM đọc RAM của node (ví dụ 32GB) thay vì container limit (2GB) → heap lớn hơn limit → OOMKilled.
- **Session object tích lũy**: session không expire, mỗi session ~2MB, dưới load cao heap bão hòa.
- **Query trả về quá nhiều row**: load toàn bộ 100k+ records vào heap.

### Mitigate ngay

```bash
# 1. Rollback deployment nếu vừa deploy
kubectl rollout undo deployment/api-server -n production
kubectl rollout status deployment/api-server -n production

# 2. Nếu không rollback được — tăng memory limit tạm thời
kubectl set resources deployment/api-server \
  -n production \
  --limits=memory=4Gi

# 3. Scale thêm pod để giảm tải mỗi instance
kubectl scale deployment/api-server --replicas=10 -n production
```

### Fix đúng (sau khi ổn định)

```yaml
# deployment.yaml — JVM flags đúng
env:
  - name: JAVA_OPTS
    value: >-
      -XX:+UseContainerSupport
      -XX:MaxRAMPercentage=75.0
      -XX:+HeapDumpOnOutOfMemoryError
      -XX:HeapDumpPath=/tmp/heapdump.hprof
      -XX:+ExitOnOutOfMemoryError
```

```yaml
resources:
  requests:
    memory: "1Gi"
  limits:
    memory: "2Gi"   # JVM heap = 75% = ~1.5Gi, còn 0.5Gi cho Metaspace + threads
```

> [!TIP]
> Mount `emptyDir` volume vào `/tmp` để lấy heap dump trước khi pod bị xóa:
> ```bash
> kubectl cp production/<pod>:/tmp/heapdump.hprof ./heapdump.hprof
> ```
> Dùng Eclipse MAT hoặc VisualVM để phân tích.

---

## Scenario 2 — HikariCP Connection Pool Exhausted

### Nhận diện

Log Spring Boot:
```
HikariPool-1 - Connection is not available, request timed out after 30000ms
```

```bash
# Prometheus metrics
hikaricp_connections_active        # số connection đang dùng
hikaricp_connections_pending       # thread đang chờ — nếu > 0 liên tục = báo động
hikaricp_connection_timeout_total  # tăng = đang exhausted
hikaricp_connection_acquire_seconds_bucket  # p99 acquisition time

# Kiểm tra RDS connection thực tế
aws rds describe-db-instances --query 'DBInstances[*].DBInstanceClass'
# Sau đó vào RDS Console → Monitoring → DatabaseConnections
```

Hoặc query thẳng vào RDS:
```sql
SELECT count(*), state, wait_event_type, wait_event
FROM pg_stat_activity
GROUP BY state, wait_event_type, wait_event
ORDER BY count DESC;
```

### Nguyên nhân phổ biến

- **Pool size quá nhỏ**: default HikariCP `maximumPoolSize=10`, với 20 pods = 200 connections. RDS `db.t3.medium` chỉ chịu ~170 connections.
- **`maxLifetime` khớp với TCP timeout phía RDS**: RDS kill TCP connection server-side đúng lúc HikariCP đang hand off → connection "active" nhưng thực chất dead.
- **Slow query giữ connection**: RDS Multi-AZ failover (~30–60s) khiến toàn bộ connections bị hold trong thời gian failover.

### Mitigate ngay

```bash
# 1. Kill slow queries đang block trên RDS
# Vào RDS Performance Insights → tìm query đang hold lâu nhất
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '30 seconds'
  AND query NOT LIKE '%pg_stat_activity%';

# 2. Restart pods để reset connection pool
kubectl rollout restart deployment/api-server -n production

# 3. Tạm thời giảm traffic vào service đang bị
kubectl scale deployment/api-server --replicas=3 -n production
# Giảm số pod → giảm tổng connections đến RDS
```

### Fix đúng

```yaml
# application.yml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10          # tính toán: (RDS_max_conn - 10) / pod_count
      minimum-idle: 5
      connection-timeout: 3000       # fail fast sau 3s thay vì queue mãi
      max-lifetime: 270000           # 270s — ít hơn 30s so với RDS wait_timeout=300s
      keepalive-time: 60000          # giữ connection alive, tránh bị RDS kill
      idle-timeout: 120000
      connection-test-query: SELECT 1
```

> [!IMPORTANT]
> Công thức tính `maximum-pool-size`:
> ```
> pool_size_per_pod = (RDS_max_connections - reserved_10) / number_of_pods
> ```
> Ví dụ: RDS max 170, 15 pods → `(170 - 10) / 15 = 10` connections/pod.

---

## Scenario 3 — Kafka Consumer Lag Spike

### Nhận diện

```bash
# Xem lag theo consumer group
kubectl exec -it kafka-client -n production -- \
  kafka-consumer-groups.sh \
    --bootstrap-server kafka-broker:9092 \
    --describe \
    --group order-processing-group

# Output:
# TOPIC          PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# order-events   0          1234500         1289300         54800   ← lag cao
# order-events   1          1234500         1289300         54800
```

Prometheus alert:
```
kafka_consumergroup_lag{consumergroup="order-processing-group"} > 10000
```

Grafana thấy lag tăng đột biến, kết hợp với consumer pod ở trạng thái `REBALANCING`.

### Nguyên nhân phổ biến

- **Rebalance storm**: consumer không gọi `poll()` trong `max.poll.interval.ms` (default 5 phút) → Kafka broker kick consumer khỏi group → rebalance liên tục → lag tăng mà không có consumer nào xử lý.
- **Processing chậm sau deploy**: thêm HTTP call ra ngoài không có timeout → mỗi message mất 2–3s thay vì 50ms → lag tích lũy.
- **Partition quá ít**: chỉ có 3 partitions nhưng traffic tăng 10x.

### Mitigate ngay

```bash
# 1. Scale consumer pods (tối đa = số partitions)
kubectl scale deployment/order-consumer --replicas=6 -n production
# Lưu ý: replicas > partition count không giúp gì thêm

# 2. Nếu lag quá lớn và dữ liệu cũ không còn giá trị (ví dụ: notification)
# Reset offset về latest — BỎ QUA toàn bộ backlog
kubectl exec -it kafka-client -n production -- \
  kafka-consumer-groups.sh \
    --bootstrap-server kafka-broker:9092 \
    --group order-processing-group \
    --topic order-events \
    --reset-offsets --to-latest --execute

# 3. Nếu cần giữ lại tất cả message — tăng throughput trước
# Điều chỉnh max.poll.records để xử lý batch lớn hơn
```

### Fix đúng

```yaml
# application.yml
spring:
  kafka:
    consumer:
      max-poll-records: 50               # giảm nếu processing nặng
      properties:
        max.poll.interval.ms: 60000      # 60s — đủ cho logic xử lý
        session.timeout.ms: 30000
        heartbeat.interval.ms: 10000
```

```java
// Offload heavy processing ra async thread pool
// Không xử lý trực tiếp trong @KafkaListener nếu chậm
@KafkaListener(topics = "order-events", groupId = "order-processing-group")
public void consume(OrderEvent event) {
    // Chỉ validate + enqueue vào internal queue
    processingQueue.offer(event);  // non-blocking
}
```

> [!TIP]
> Dùng **KEDA** để autoscale consumer pod dựa trên Kafka lag:
> ```yaml
> apiVersion: keda.sh/v1alpha1
> kind: ScaledObject
> spec:
>   triggers:
>     - type: kafka
>       metadata:
>         topic: order-events
>         consumerGroup: order-processing-group
>         lagThreshold: "1000"
> ```

---

## Scenario 4 — Redis Eviction Storm / Cache Miss Flood

### Nhận diện

```bash
# Redis CLI
redis-cli -h elasticache-endpoint info stats | grep -E "evicted_keys|keyspace_hits|keyspace_misses"
# evicted_keys:15420   ← tăng nhanh = đang evict
# keyspace_hits:1200
# keyspace_misses:8900  ← hit ratio = 1200/(1200+8900) = 11.9% — thảm họa

# Prometheus
redis_evicted_keys_total            # rate spike
redis_keyspace_hits_total
redis_keyspace_misses_total
# Hit ratio alert: rate(hits[1m]) / (rate(hits[1m]) + rate(misses[1m])) < 0.90
```

Đồng thời RDS CPU và connections tăng vọt — vì mọi cache miss đều hit thẳng DB.

### Nguyên nhân phổ biến

- **Redis đầy, evict hot key**: `maxmemory-policy allkeys-lru` silently evict hot keys dưới memory pressure. Một cache miss = 200ms DB query thay vì 1ms Redis read.
- **Cache stampede sau deploy**: deploy tăng memory usage → Redis quá `maxmemory` → evict đồng loạt nhiều key → tất cả pods miss cùng lúc và query DB song song.
- **TTL đồng loạt**: tất cả cache key set cùng một TTL → expire cùng lúc → thundering herd.

### Mitigate ngay

```bash
# 1. Kiểm tra ElastiCache memory
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name DatabaseMemoryUsagePercentage \
  --period 60 --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)

# 2. Nếu Redis OOM — restart và warm cache dần
# Scale Redis (ElastiCache) lên node lớn hơn qua console

# 3. Giảm tải DB trong lúc cache miss cao
# Tạm thời bật read replica (nếu chưa bật)
aws rds modify-db-instance --db-instance-identifier prod-db \
  --no-multi-az  # không làm cái này — chỉ promote read replica

# 4. Kích hoạt circuit breaker tạm
# Return cached fallback/stale data thay vì hit DB
```

### Fix đúng

```java
// Jitter TTL để tránh đồng loạt expire
int baseTtl = 3600; // 1 giờ
int jitter = new Random().nextInt(baseTtl / 10); // ±10%
redisTemplate.expire(key, baseTtl + jitter, TimeUnit.SECONDS);

// L1 cache (Caffeine) trước Redis — hấp thụ stampede
@Bean
public CacheManager cacheManager(RedisConnectionFactory cf) {
    // Caffeine L1: 500 entries, 30s TTL (in-process)
    // Redis L2: distributed, 1h TTL
}
```

```yaml
# Redis config — maxmemory 75% RAM, không phải 100%
maxmemory 3gb          # cho 4GB node
maxmemory-policy allkeys-lru

# Sau khi Redis recover — warm cache trước khi mở full traffic
```

> [!IMPORTANT]
> **Cache stampede sau restore**: khi Redis vừa phục hồi, đừng mở toàn bộ traffic ngay. Warm cache dần với rate-limited preloader, sau đó mới shift traffic vào. Mở đột ngột = tái diễn thundering herd.

---

## Phân biệt lỗi của mình vs lỗi infra

| Dấu hiệu | Khả năng |
|----------|----------|
| Lỗi xảy ra đúng sau deployment | Code của mình |
| Nhiều service không liên quan cùng sập | Infra (AWS, network) |
| `kubectl describe` → OOMKilled / CrashLoopBackOff | Code/config của mình |
| Error: `connection refused`, `timeout` đến RDS/Redis | Infra hoặc pool exhausted |
| AWS Health Dashboard có incident | Infra AWS |
| Chỉ 1 AZ bị, AZ khác bình thường | Infra AZ failure |

```bash
# Kiểm tra nhanh các dependency còn sống không
# RDS
psql -h $RDS_HOST -U $DB_USER -c "SELECT 1"

# Redis
redis-cli -h $REDIS_HOST ping

# Kafka
kafka-topics.sh --bootstrap-server $KAFKA_BROKER --list

# ALB target health
aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

---

## Communicate trong suốt incident

Cập nhật Teams `#incident-prod` mỗi **10–15 phút**:

```
[UPDATE 02:15] Xác định: OOMKilled do heap thiếu JVM flag.
Đang rollback về v2.3.0. ETA: 5 phút.

[UPDATE 02:22] Rollback xong. Error rate về 2%, pods stable.
Monitoring thêm 10 phút trước khi declare resolved.

[RESOLVED 02:35] Service ổn định. Downtime: 32 phút.
Root cause: -XX:+UseContainerSupport thiếu trong deploy v2.3.1.
Jira: INC-2024-0408. Post-mortem: thứ 2, 10h sáng.
```

---

## Checklist 2h sáng

```
□ Xác nhận sự cố thật (error rate, pod status, ALB health)
□ Check AWS Health Dashboard — infra hay code?
□ Tạo Jira INC ticket + Teams incident channel
□ Assign IC (coordinator) + Ops (hands-on)
□ kubectl describe → tìm OOMKilled / CrashLoopBackOff / pending
□ Có deployment vừa xong? → Rollback ngay
□ OOMKilled? → tăng memory limit + fix JVM flags
□ HikariCP timeout? → kill slow queries + restart pods
□ Kafka lag? → scale consumers + check rebalancing
□ Redis miss cao? → kiểm tra eviction + scale Redis
□ Update team mỗi 10-15 phút
□ Confirm stable → declare resolved
□ Schedule post-mortem (không làm 3h sáng)
```

---

## Câu hỏi follow-up

### 1. Làm sao bạn biết đây là lúc cần escalate lên leadership?

Escalate khi: incident kéo dài > 30 phút mà chưa có mitigation rõ ràng, hoặc impact vượt ngưỡng SLA (revenue loss, data loss risk). Đừng chờ "chắc chắn" — thà escalate sớm và update "false alarm" còn hơn để leadership bị bất ngờ. Với Jira INC ticket đã tạo từ đầu, leadership tự theo dõi được status.

### 2. Nếu không rollback được thì sao?

Chuyển sang mitigation thay thế theo thứ tự: feature flag kill switch → tắt tính năng bị lỗi qua config → maintenance mode (trả 503 + thông báo) → scale out để giảm error rate. Bắt đầu hotfix song song nhưng không deploy cho đến khi test đầy đủ trên staging với load test.

### 3. Kafka consumer lag quá lớn — bỏ qua hay xử lý hết?

Phụ thuộc vào business: notification/analytics → reset offset về latest, bỏ backlog. Order/payment → phải xử lý hết, scale consumers + tăng throughput. Quyết định này phải có sign-off từ Product Owner, không tự ý reset offset trên critical topics.

### 4. Sau incident, bạn làm post-mortem như thế nào?

Blameless post-mortem trong Confluence/Jira: timeline chi tiết (từng phút), root cause (5 Whys), contributing factors, impact measurement, action items cụ thể có owner + deadline. Không đổ lỗi cá nhân — hỏi "hệ thống/process nào đã thất bại" thay vì "ai đã làm sai". Action items phải có ticket Jira và giao cho người cụ thể, không để chung chung.
