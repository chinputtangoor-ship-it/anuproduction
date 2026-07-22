# ANU Production — Roadmap

> Version: 1.5 · อ้างอิง owner brief + [decisions.md](./decisions.md) (2026-07-22)  
> เป้าหมาย: flow โรงงานมาตรฐาน · แยกแผนก · audit ได้ · PWA · platform hardening  
> Cursor rule: `.cursor/rules/anu-production.mdc` · UX: [ui-ux-spec.md](./ui-ux-spec.md) · QA: [qa-skill.md](./qa-skill.md)

---

## สถานะภาพรวม

| Phase | ชื่อ | สถานะ | หมายเหตุ |
|-------|------|--------|----------|
| 0 | Baseline (ของที่มีอยู่) | ✅ มีแล้ว | Plan · QC Form · Box Status · Rejection · Analytics · Users |
| 1 | Foundations & Standards | ✅ Done | Icons · audit stamp · department · menu ACL |
| 2 | Quality Box Grade ↔ Post Production | ✅ Done | Box Grade · Post Production weigh-only |
| 3 | Planner Excel + Plan visibility | ✅ Done | Import · read-only ทุกแผนก |
| 4 | Batch 360° + Rejection by line | ✅ Done | หน้า batch · ประวัติกล่อง · กราฟ by line |
| 5 | Department Dashboards | ✅ Done | Planner/Quality/Production/Post Production |
| 6 | PWA & App identity | ✅ Done | manifest · icons · install · offline shell |
| 9 | Platform Hardening | ✅ Done | Excel flexible · single session · PWA banner · skeleton · date filters · SWR · Realtime · feature flags |
| 10A | Unified Ops Dashboard | ✅ Done | Ops widgets · เมนูอยู่ Planner (D24) · [phase-10a](./phase-10a-unified-ops-dashboard.md) |
| 10B | Batch start + Grade + Re-pass kg | ✅ Done | start 2 ทาง · Box Grade Planing+Running · Re-pass rejection kg · [phase-10b](./phase-10b-batch-start-grade-repass.md) |
| 11 | Configurable Access | ✅ Done | Sidebar ทุกแผนก · grant read/edit · `/user/access` · Plan ใน Planner · [phase-11](./phase-11-configurable-access.md) |
| 12 | API & PWA Security Hardening | ✅ Done (12.1–12.5) | Rate limit (Supabase) · body/firewall · CSP Report-Only · SW TTL/allowlist · session idempotency · [phase-12](./phase-12-api-pwa-security.md) · 12.6 CSP enforce ทีหลัง |
| 7 | Warehouse / HR / Account | ⏸️ พัก | Dashboard ยังไม่ทำ |
| 8 | Deep Odoo accounting bridge | ⏸️ หลังบ้านบัญชีเต็ม | หลัง flow หลักนิ่ง |

---

## Flow ธุรกิจเป้าหมาย (มาตรฐาน Odoo-style handoff)

```
1. Warehouse     รับวัตถุดิบเข้า
2. Planner       กำหนด BOM + วางแผนผลิต
3. Production    ผลิตตามแผน
4. Quality       Box Grade (grade + defect) — ไม่แตะ QC Form เดิม
5. Post Production  ชั่งน้ำหนัก + inspector บนกล่องที่ QC ส่งมา
6. Warehouse     รับของสำเร็จรูป · จัดส่งลูกค้า
```

หลักการหลังบ้าน:

- ทุกการบันทึก stamp จาก **user id ที่ login** อัตโนมัติ (`recorded_by` / Check by / Weight by / Inspector ฯลฯ) + เวลา — ห้ามพิมพ์ชื่อเอง
- สิทธิ์แก้แผน = **Planner เท่านั้น** (admin/supervisor ตาม config)
- แผนกอื่น **ดูแผนได้อย่างเดียว**
- `department` = ฟิลด์เพิ่ม คู่กับ `role` เดิม (ไม่แทนที่)
- สถานะกล่องข้ามแผนกชัด: **ยังไม่ graded → ไม่โชว์ Post Production** · graded แล้ว → โชว์ · weighed แล้ว → ครบ

---

## Phase 0 — Baseline (มีอยู่แล้ว — อ้างอิง)

| โมดูล | Route / พื้นที่ | หมายเหตุ |
|-------|-----------------|----------|
| Plan | `/plan` | เพิ่ม/แก้แผน |
| QC Form | `/quality` | **แช่แข็ง — ห้ามแก้ใน Phase 1–5** |
| Box Status | `/record` | ปัจจุบันยังเลือก grade/defect ที่นี่ → จะย้ายใน Phase 2 |
| Rejection | `/rejection` | จะเปลี่ยนกราฟใน Phase 4 |
| Backlog / Camera / Repass | ตามเมนู | คงไว้จนกว่า roadmap จะระบุ |
| Analytics | `/analytics` | ยกระดับ + ใช้เป็นแม่แบบ dashboard ใน Phase 5 |
| Users | `/user` | เพิ่มแผนกใน Phase 1 |

---

## Phase 1 — Foundations & Standards

**เป้าหมาย:** ฐานโค้ดสะอาด · UI สม่ำเสมอ · ตรวจสอบย้อนหลังได้

| ID | งาน | รายละเอียด |
|----|-----|------------|
| 1.1 | Lucide icons only | แทน emoji ใน sidebar / dashboard / ทุก UI ด้วย `lucide-react` |
| 1.2 | Auto recorder | create/update ทุกตารางสำคัญ stamp `recorded_by` / `updated_by` (+ timestamp) อัตโนมัติจาก session |
| 1.3 | User · Department | เพิ่มฟิลด์ `department` คู่กับ `role`: Planner, Quality, Production, Post Production, Warehouse, Human Resources, Account |
| 1.4 | Dept-scoped menu | ผู้ใช้เห็นงานของแผนกตนเป็นหลัก (admin/supervisor เห็นตามสิทธิ์เดิม) · role ยังใช้ควบคุมสิทธิ์เขียน |
| 1.5 | Module structure | แยกโมดูลชัด · **logic คำนวณแยกไฟล์** · ห้ามไฟล์ยาวรวมทุกอย่าง |
| 1.6 | Security pass | ตรวจ API role · ไม่รั่ว service_role · validate input |

**Exit criteria**

- [ ] ไม่มี emoji ใน UI ที่ user เห็น
- [ ] บันทึกข้อมูลหลักมีชื่อผู้บันทึกย้อนดูได้
- [ ] User มีแผนก และเมนูกรองตามแผนกได้
- [ ] โฟลเดอร์ `lib/` แยก domain (plan / quality / boxes / calculations / …)

**ไม่ทำใน Phase นี้:** Box Grade ใหม่ · Excel import · PWA · dashboard แผนกใหม่

---

## Phase 2 — Quality Box Grade ↔ Post Production

**เป้าหมาย:** Grade/Defect มาจาก Quality **ทีละกล่อง** · Post Production เห็นเฉพาะกล่องที่ graded แล้ว · เหลือ Weight

### 2.1 Box Grade (ใน Quality — คนละส่วนกับ QC Form)

Flow UI (ต่อกล่อง):

1. เลือก **Line**
2. เลือก **Batch**
3. เลือก **Box** (กล่องที่ยังไม่ graded)
4. เลือก **Grade** (`BOX_STATUS`: AF, HP, HUP, Sort, PS, Scrap, HFX)
5. ถ้า grade **ไม่อยู่ใน** `STATUSES_WITHOUT_DEFECT` (**AF, HP, HUP**) → ต้องเลือก **Defect** จาก [defect-list.md](./defect-list.md)
6. กดบันทึก
7. เมื่อสำเร็จ → **เฉพาะกล่องนั้น** ไปโผล่ใน **Box Status (Post Production)**
8. กล่องที่ยังไม่ตรวจ / ยังไม่กำหนดเกรด → **ไม่แสดง** ที่ Post Production
9. **Check by** stamp อัตโนมัติจาก user id ที่ login

> **QC Form เดิม:** คงหน้าตาและ logic เดิมทุกอย่าง — อย่าพึ่งทำอะไร  
> **DEFECT_LIST:** แทนที่ด้วยรายการใน `docs/defect-list.md`

### 2.2 Box Status (Post Production) ปรับลด

- รายการกล่อง = **เฉพาะที่ Quality graded แล้ว**
- **เอาออก:** เลือก Grade · เลือก Defect
- **เหลือ:** Weight (+ ฟิลด์ที่เกี่ยวข้อง) — แสดง grade/defect เป็น read-only
- **Weight by / Inspector** stamp อัตโนมัติจาก user id ที่ login

### 2.3 Audit

- ทุกการเปลี่ยน grade / weight มีประวัติหรือ stamp ผู้แก้จาก session เสมอ

**Exit criteria**

- [ ] Quality กำหนด grade/defect **ทีละกล่อง** ได้
- [ ] เฉพาะกล่อง graded แล้วโผล่ Post Production · ยังไม่ตรวจไม่โชว์
- [ ] `/record` ไม่มี UI เลือก grade/defect
- [ ] Defect list ตรง `docs/defect-list.md`
- [ ] QC Form ไม่ถูกแก้
- [ ] Check by / Weight by stamp จาก user id อัตโนมัติ

---

## Phase 3 — Planner Excel + Plan visibility

| ID | งาน | รายละเอียด |
|----|-----|------------|
| 3.1 | Import from Excel | ใน Add/Edit Plan — import หลายแถวทีเดียว |
| 3.2 | Column contract | คอลัมน์ = **ฟอร์มแผนปัจจุบันทั้งชุด** รวม ink/roller ฯลฯ (`PlanFormValues`) — ไม่ตรง = reject พร้อมบอกคอลัมน์ที่ผิด |
| 3.3 | Plan read-only | ทุกแผนกเปิดดูแผนได้ · แก้ได้เฉพาะ Planner (+ admin/supervisor ตาม config) |

**Exit criteria**

- [ ] Download template Excel ได้
- [ ] Import แถวที่ถูกต้องทั้งหมด · แถวผิดรายงานชัด
- [ ] Role นอก Planner แก้แผนไม่ได้ (UI + API)

---

## Phase 4 — Batch 360° + Rejection by line

### 4.1 หน้าดูข้อมูล Batch

ค้นหา → กดเข้า batch → แสดงครบ:

Line · Size · Batch · SAP Batch · Prod. Order · Sales Order · SO Item · FERT Code · Semi Code · Box no. · Box Status · Defects · Net (kg) · Total (kg) · Weight by · Check by · Start Date · Finish Date

- กดเข้า **รายกล่อง** → ประวัติการแก้ไขรายละเอียด
- จากหน้ารายละเอียดกล่อง → มีปุ่ม/ตัวเลือก **แก้ไข** ได้ (ตามสิทธิ์)

### 4.2 Rejection chart

- **ลบ** Scrap / Defect Pareto
- **แทนด้วย** กราฟ Rejection **แยกตาม line**

**Exit criteria**

- [ ] เปิด batch แล้วเห็นข้อมูลครบตามรายการ
- [ ] เปิดประวัติรายกล่อง + แก้ได้ตามสิทธิ์
- [ ] Pareto หาย · มีกราฟ rejection by line

---

## Phase 5 — Department Dashboards

| แผนก | Dashboard | หมายเหตุ |
|------|-----------|----------|
| Planner | ต้องมี | KPI แผน · สถานะ batch |
| Quality | ต้องมี | grading progress · defect trends |
| Production | ต้องมี | KPI จาก **ข้อมูลที่มีอยู่แล้ว** (แผน / batch status / line) — ไม่ต้องสร้างหน้ากรอก Production ก่อน |
| Post Production | ยกระดับจาก Analytics ปัจจุบัน | มาตรฐานสากล (throughput / rejection by line ฯลฯ) |
| Warehouse | ⏸️ ยังไม่ทำ | |
| Human Resources | ⏸️ ยังไม่ทำ | |
| Account | ⏸️ ยังไม่ทำ | |

**Exit criteria**

- [ ] 4 แผนกหลักมี dashboard ของตน
- [ ] Post Production analytics ชัด อ่านง่าย ระดับมาตรฐาน
- [ ] แผนกอื่นยังไม่ถูกบังคับให้มี dashboard

---

## Phase 6 — PWA & App identity

| ID | งาน |
|----|-----|
| 6.1 | `manifest` + installable PWA |
| 6.2 | App icon บนแท็บเบราว์เซอร์ (favicon) — ใช้โลโก้ ANU ที่ owner มีพร้อม |
| 6.3 | Icon ตอนติดตั้งลงเครื่อง (192 / 512 และ maskable) จากโลโก้เดียวกัน |
| 6.4 | Offline พื้นฐานตามที่ตกลง (อย่างน้อย shell / หน้าหลัก — รายละเอียดใน ui-ux-spec) |

**Exit criteria**

- [x] Add to Home Screen ได้ (`manifest` + icons)
- [x] มีไอคอนแอปชัดเจนทั้ง browser และ installed app
- [x] Offline shell พื้นฐาน (`sw.js` + `/offline.html`)

---

## Phase 9 — Platform Hardening

**เป้าหมาย:** แอปเร็วขึ้น · ข้อมูลสด · import ยืดหยุ่น · session ปลอดภัย · Admin คุมฟีเจอร์ได้โดยไม่ redeploy

| ID | งาน | รายละเอียด |
|----|-----|------------|
| 9.1 | Excel flexible import | aliases · วันที่หลายรูปแบบ · แถวว่างได้ตาม D11 · partial import |
| 9.2 | Single session | 1 login 1 session · dialog ข้ามเครื่อง |
| 9.3 | PWA install banner | โชว์ 20 วิ แล้ว fade · ติดตั้งแล้วไม่โชว์ |
| 9.4 | Loading skeletons | ทุกหน้าหลัก |
| 9.5 | Dashboard date filters | Planner / Production / Quality = แบบ Post Production (incl. Custom) |
| 9.6 | SWR | client cache stale-while-revalidate |
| 9.7 | Supabase Realtime | ตารางร้อน · mutate SWR · คุมด้วย flag |
| 9.8 | Feature Toggle | Admin-only Settings · ไม่ต้อง redeploy |

**Exit criteria**

- [x] Import ตัวอย่างวันที่หลายรูปแบบได้ · แถวผิดรายงาน · แถวถูกเข้า
- [x] Login เครื่องที่สองถาม Use new / Keep old
- [x] PWA banner 20s · standalone ไม่โชว์
- [x] หน้าหลักมี skeleton ตอนโหลด
- [x] 3 dept dashboards มี period + Custom
- [x] SWR + Realtime (เมื่อ flag เปิด) อัปเดตจอหลังบันทึก/เปลี่ยนข้อมูล
- [x] Admin เห็น Features · role อื่นไม่เห็นเมนู/API
- [x] QC Form ไม่ถูกแตะ

> **Deploy note:** รัน migration `supabase/migrations/20260720100000_phase9_platform.sql` บน Supabase ก่อนใช้ Features / Single session / Realtime

**ไม่ทำใน Phase นี้:** QC Form · Warehouse/HR/Account dashboards · offline form sync queue

---

## Phase 7 — Warehouse / HR / Account (พัก)

- รับวัตถุดิบ / รับ FG / ส่งลูกค้า (Warehouse) — ออกแบบหลัง flow 1–6 นิ่ง
- HR · Account dashboard — ยังไม่ทำ
- อย่าเริ่ม UI แผนกเหล่านี้จนกว่า owner จะเปิด phase

---

## Phase 8 — Accounting-correct depth (พัก)

เมื่อ flow หลักเสร็จ แล้วค่อย:

- journal / stock valuation แบบ Odoo (ถ้าต้องการเชื่อมบัญชีจริง)
- ตอนนี้บังคับอย่างน้อย: audit trail + ไม่ทำลายความสอดคล้องของ batch/box state

---

## ลำดับทำที่แนะนำ (สั้น)

```
Phase 1 Foundations
  → Phase 2 Box Grade handoff
  → Phase 3 Excel + plan ACL
  → Phase 4 Batch 360 + Rejection by line
  → Phase 5 Dept dashboards
  → Phase 6 PWA
  → Phase 9 Platform Hardening
  → Phase 10A Unified Ops Dashboard
  → Phase 10B Batch start / Box Grade / Re-pass kg
  → Phase 11 Configurable Access
  → Phase 12 API & PWA Security Hardening
  → (พัก) 7–8
```

---

## Phase 10A — Unified Ops Dashboard ✅

**เป้าหมาย:** Ops Dashboard ชุด widgets เดียว (เดิมทำ 4 route · ตอนนี้เมนูอยู่ Planner ต่อ D24)

ดูรายละเอียด · สูตร · exit criteria ใน [phase-10a-unified-ops-dashboard.md](./phase-10a-unified-ops-dashboard.md)

**มติที่เกี่ยวข้อง:** D17 · D18 · D19 · D24

**ส่งมอบหลัก:** `OpsDashboard` · Material Balance · Scrap Rate = Scrap-only · เมนูที่ `/dashboard/planner`

---

## Phase 10B — Batch start + Box Grade + Re-pass kg ✅

| งาน | รายละเอียด |
|-----|------------|
| Start batch 2 ทาง | (1) ปุ่ม Start ในแผน (2) QC grade กล่องที่ 1 → batch เป็น Running |
| Box Grade batches | เลือกได้ทั้ง Planing และ Running |
| Re-pass rejection kg | เพิ่มช่องน้ำหนัก rejection ตอน Re-pass เพื่อ Material Balance |

ดู [phase-10b-batch-start-grade-repass.md](./phase-10b-batch-start-grade-repass.md) · มติ D20–D22

**Deploy note:** รัน `20260722120000_phase10b_start_batch_rpc.sql` ก่อนใช้ auto-start จาก Box Grade

---

## Phase 11 — Configurable Access ✅

**เป้าหมาย:** Sidebar เห็นทุกแผนก · เมนูย่อยตาม grant (read/edit) · admin ตั้งได้รายบุคคล / ตำแหน่งในแผนก / ตำแหน่งทั้งหมด

ดู [phase-11-configurable-access.md](./phase-11-configurable-access.md) · มติ D23–D27

**ส่งมอบ:** `access_menu_grant` · AccessProvider · `/user/access` · Plan ใต้ Planner · Ops Dashboard ใต้ Planner

**Deploy note:** รัน `supabase/migrations/20260722130000_phase11_access_grants.sql`

---

## Phase 12 — API & PWA Security Hardening ✅ (12.1–12.5)

**เป้าหมาย:** กันยิง API / ยัด body / ฝัง iframe / cache ของเก่า — ไม่เปลี่ยน flow ผลิต

| งาน | รายละเอียด |
|-----|------------|
| Rate limit | ตาราง Supabase + RPC (D30) บน auth · admin · bootstrap (D31) |
| Body + firewall | จำกัดขนาด · method · content-type |
| Headers | CSP **Report-Only** ก่อน (D32) + frame/nosniff/referrer ฯลฯ |
| SW | allowlist + TTL — ห้าม cache `/api/*` |
| Idempotency | เฉพาะ `/api/auth/session` (D33) |

ดู [phase-12-api-pwa-security.md](./phase-12-api-pwa-security.md) · มติ D29–D33

**Deploy note:** รัน `20260722044327_phase12_api_pwa_security.sql` ก่อนพึ่ง rate limit / idempotency

**ค้างรอบถัดไป:** 12.6 CSP enforce · offline form sync queue · idempotency ครอบกล่อง/rejection · Redis

---

## นอกขอบเขต (ตอนนี้)

- แก้ QC Form
- Dashboard Warehouse / HR / Account
- เขียนโค้ดรวมยาวในไฟล์เดียว / hard-code คำนวณปน UI
- Emoji ใน UI
- Feature ที่ไม่ได้อยู่ใน phase ปัจจุบัน (ยกเว้น bug/security P0–P1)

---

*อัปเดตสถานะในตารางภาพรวมเมื่อจบแต่ละ Phase · ใช้ qa-skill.md เป็นประตูก่อน deploy*
