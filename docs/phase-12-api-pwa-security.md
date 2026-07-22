# Phase 12 — API & PWA Security Hardening

> Status: Implemented (12.1–12.5) · CSP enforce = later (12.6) · 2026-07-22  
> Related: [decisions.md](./decisions.md) (D29–D33) · [roadmap.md](./roadmap.md) · [qa-skill.md](./qa-skill.md)

## 1) ที่มา

รายการ hardening ที่แอปยังไม่มี:

1. Rate limit + body limit + Firewall บน API (auth · admin · bootstrap)
2. CSP / security headers
3. Offline TTL + Idempotency + allowlist (SW)

Phase 9 ทำ platform อีกชุด (Excel · single session · SWR · Realtime · flags) และระบุชัดว่า **ยังไม่ทำ** offline form sync queue — Phase 12 **ไม่เปิดคิวออฟไลน์เต็ม**

---

## 2) เป้าหมาย (ภาษาโรงงาน)

กันคนยิง API ถี่ / ยัด body ใหญ่ / ฝังแอปใน iframe / cache ของเก่าผิด — **ไม่เปลี่ยน flow ผลิต**

---

## 3) มติรอบนี้ (สรุป)

| # | หัวข้อ | มติ |
|---|--------|-----|
| D29 | ชื่อ phase | **Phase 12 — API & PWA Security Hardening** |
| D30 | Rate limit storage | **ตาราง Supabase + RPC** (ไม่ใช้ in-memory เป็นหลัก · ไม่เพิ่ม Redis) |
| D31 | ขอบเขต API รอบแรก | `/api/auth/*` · `/api/admin/*` · `/api/setup/bootstrap` |
| D32 | CSP | เริ่ม **Content-Security-Policy-Report-Only** · enforce ในรอบถัดไปเมื่อนิ่ง |
| D33 | Idempotency | รอบแรกเฉพาะ **`/api/auth/session`** |

---

## 4) ทำไมเลือก Supabase สำหรับ rate limit (คำแนะนำที่ยืนยันแล้ว)

| ทางเลือก | ข้อดี | ข้อเสีย | ใช้ไหม |
|----------|--------|---------|--------|
| In-memory ใน Node | เร็ว · ไม่ต้อง migration | บน multi-instance / serverless นับคนละก้อน · cold start รีเซ็ต → กันยิงไม่แน่น | ไม่เป็นหลัก |
| **ตาราง Supabase + RPC** | ข้าม instance ได้ · สแต็กเดิม · audit/TTL ใน DB ได้ | มี write ต่อ request ที่ถูกจำกัด | **ใช่ — เลือกอันนี้** |
| Redis / Upstash | มาตรฐาน rate-limit ขนาดใหญ่ | dependency ใหม่ · ค่าใช้จ่าย · ops เพิ่ม | ไม่ใน Phase 12 |

โรงงานมีผู้ใช้ไม่กี่สิบคน — โหลด DB จาก rate-limit รับได้  
จุดที่ต้องแน่นคือ **auth / admin / bootstrap** → ต้องนับความถี่ให้เหมือนกันทุก instance

**แบบจำลองเสนอ**

- ตารางเช่น `api_rate_limit` (หรือชื่อใกล้เคียง): `bucket` · `subject` · `window_started_at` · `hit_count`
- `subject` = IP และ/หรือ `user_id` (ถ้า login แล้ว)
- RPC `check_and_increment_rate_limit(...)` คืนอนุญาต / ปฏิเสธ + `retry_after`
- ลบแถวเก่าตาม TTL (cleanup ตอนเรียก หรือ job เบาๆ)
- RLS: client ทั่วไปอ่าน/เขียนไม่ได้ — เรียกผ่าน server (service role หรือ SECURITY DEFINER RPC ที่จำกัด)

**ค่าเริ่มต้นเสนอ (ปรับได้ตอน implement)**

| กลุ่ม | หน้าต่าง | เพดาน (ประมาณ) |
|------|----------|----------------|
| `/api/auth/*` | 1 นาที | ต่ำ (กันยิง session / เปลี่ยนรหัส) |
| `/api/admin/*` | 1 นาที | ปานกลาง |
| `/api/setup/bootstrap` | 1 ชั่วโมง / IP | ต่ำมาก |

เกินเพดาน → HTTP **429** + header `Retry-After` ถ้าทำได้

---

## 5) ขอบเขตงาน

### 5.1 Body limit + Firewall เบา

| กฎ | รายละเอียด |
|----|------------|
| Body limit | อ่าน `Content-Length` / จำกัดขนาดก่อน parse หนัก · auth/bootstrap เล็ก (เช่น ≤ 32 KB) · admin สูงกว่าเล็กน้อย (เช่น ≤ 256 KB) — **ไม่ใส่ limit ต่ำทั้งแอป** จนพัง Excel ฝั่ง client |
| Method allowlist | เฉพาะ method ที่ route ใช้จริง |
| Content-Type | JSON routes รับ `application/json` เป็นหลัก |
| Origin/Host | ตรวจเมื่อเป็น browser call (ไม่ทำให้ mobile PWA same-origin พัง) |

Helper รวมใน `lib/` (เช่น `lib/security/`) — ห้ามก็อป logic ยาวทุก route

### 5.2 Security headers (+ CSP Report-Only)

ตั้งผ่าน `next.config` และ/หรือ middleware:

| Header | รอบนี้ |
|--------|--------|
| `Content-Security-Policy-Report-Only` | ใช่ — allowlist Supabase · Next assets · ไม่บล็อกจริง |
| `X-Frame-Options` / `frame-ancestors` | กันฝัง iframe |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | เข้มพอสมควร |
| `Permissions-Policy` | ระวังหน้า Camera — อย่าปิดกล้องทั้งแอปโดยไม่ยกเว้น |
| `Strict-Transport-Security` | เฉพาะ production HTTPS |

**รอบถัดไป (นอก Phase 12 หลัก หรือ 12.x หลัง):** เปลี่ยนเป็น `Content-Security-Policy` แบบ enforce เมื่อ Report-Only ไม่มีปัญหา

### 5.3 Offline TTL + allowlist (Service Worker)

แก้ `public/sw.js`:

| กฎ | รายละเอียด |
|----|------------|
| Allowlist | cache เฉพาะ shell / icons / `offline.html` / manifest — **ห้าม** cache `/api/*` |
| TTL | รายการใน cache หมดอายุแล้วดึงใหม่ (เช่น shell ~1 วัน · icons นานกว่า) |
| Navigate | **ไม่** ยัดทุกหน้า HTML ลง cache แบบกว้างเหมือนปัจจุบัน |

### 5.4 Idempotency — เฉพาะ `/api/auth/session`

- Client ส่งคีย์ (เช่น header `Idempotency-Key`) ตอน `claim` / `release` / `check` ที่อาจ retry
- Server จำผลสั้นๆ (ตารางหรือคอลัมน์สั้นอายุ) — ยิงซ้ำด้วยคีย์เดิมได้คำตอบเดิม ไม่ double-claim แปลก
- **ไม่ครอบ** บันทึกกล่อง / rejection / offline queue ใน phase นี้

---

## 6) นอกขอบเขต

- QC Form
- Warehouse / HR / Account dashboards
- Offline form sync queue เต็ม
- Captcha ตอน login
- WAF ภายนอก (Cloudflare ฯลฯ) — ทำทีหลังได้ถ้ามี CDN
- CSP enforce ทันทีในรอบแรก
- Idempotency ครอบคลุมทุก write ของโรงงาน

---

## 7) ลำดับทำ

```
12.1  Security headers + CSP Report-Only
12.2  Body limit + firewall เบา บน auth / admin / bootstrap
12.3  Migration + RPC rate limit (Supabase) แล้วผูก API กลุ่ม D31
12.4  SW allowlist + TTL
12.5  Idempotency บน /api/auth/session
12.6  (รอบถัดไป) CSP enforce เมื่อ report สะอาด
```

---

## 8) Exit criteria

- [x] Header ความปลอดภัยโผล่ทุกหน้าหลัก · CSP ยังเป็น Report-Only
- [x] ยิง auth/admin/bootstrap ถี่เกิน → 429 · body ใหญ่เกิน → 413 หรือ 400
- [x] Rate limit นับผ่าน Supabase (ไม่พึ่ง memory อย่างเดียว)
- [x] SW ไม่ cache `/api/*` · cache หมดอายุตาม TTL
- [x] `/api/auth/session` รองรับ idempotency key สำหรับ action ที่กำหนด
- [ ] Login · single session · Realtime · PWA · Camera ยังใช้ได้ (smoke หลัง deploy)
- [x] QC Form ไม่ถูกแตะ

---

## 9) Deploy note

- รัน migration `supabase/migrations/20260722044327_phase12_api_pwa_security.sql` บน Supabase **ก่อน**พึ่ง rate limit / idempotency บน production
- ถ้ายังไม่รัน migration: rate limit / idempotency **fail-open** (ไม่บล็อก API) แต่ log error
- ตรวจ login + `/api/auth/session` + admin users + bootstrap หลัง deploy

---

## 10) โครงสร้างโค้ดที่คาดหวัง (ตอนลงมือ)

```
lib/security/
  rate-limit.ts      — เรียก RPC / แปล 429
  body-limit.ts
  request-firewall.ts
  idempotency.ts     — session เท่านั้นรอบนี้
  headers.ts         — ค่า CSP Report-Only / headers อื่น (ถ้าไม่ได้อยู่ใน next.config ล้วน)
public/sw.js         — allowlist + TTL
supabase/migrations/ — rate_limit (+ idempotency ถ้าต้อง)
```

ห้ามรวม logic ทั้งหมดในไฟล์ route เดียว
