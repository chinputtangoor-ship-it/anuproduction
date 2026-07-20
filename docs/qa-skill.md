# ============================================================
# ANU PRODUCTION — QA Skill
# docs/qa-skill.md
# Version: 1.1 — +owner decisions · per-box grade · official defect list
# ============================================================
# สำหรับ: เจ้าของโปรเจกต์ (Shop-Floor Expert) + AI Agent
# ใช้เมื่อ: ก่อน merge · หลัง feature ใหม่ · ก่อน deploy · ก่อนจบ Phase
# Project skill: .cursor/skills/anu-qa/SKILL.md
# อ้างอิง: .cursor/rules/anu-production.mdc · docs/decisions.md · docs/roadmap.md · docs/ui-ux-spec.md
# ============================================================

## QA คืออะไร (ภาษาง่าย)

**QA (Quality Assurance)** = ตรวจว่าระบบ **ทำงานถูก · ปลอดภัย · ไม่พังง่าย · ใช้บนโรงงานได้**

ไม่ใช่แค่ “กดดูหน้าเว็บ” — ต้องตรวจหลายชั้น:

| ชั้น | ตรวจอะไร | ตัวอย่าง ANU Production |
|------|----------|-------------------------|
| **Correctness** | Logic ถูกไหม | Grade Sort ไม่มี defect ต้องห้ามบันทึก · กล่องยังไม่ graded ห้ามโชว์ Post Production |
| **Security** | ข้อมูลรั่ว / สิทธิ์พังไหม | Operator แก้แผนไม่ได้ · service_role ไม่อยู่ใน browser |
| **Stability** | error / โหลด | Import Excel 1,000 แถวไม่ทำให้หน้าค้างเงียบ |
| **Usability** | ใช้บนจอโรงงานได้ไหม | ปุ่มใหญ่ · lucide เท่านั้น · TH/EN |
| **Compliance** | ตรง roadmap / docs ไหม | QC Form ยังไม่ถูกแตะ · Warehouse dashboard ยังไม่ถูกสร้าง |

---

## วงจร QA (ทำตามลำดับ)

```
1. Automated checks  (tsc · lint · build · test ถ้ามี)
        ↓
2. Code & Security review  (diff · roles · secrets · audit stamp)
        ↓
3. Manual smoke test  (กดใช้จริงตามแผนก)
        ↓
4. Regression  (ของเก่ายังใช้ได้ไหม — โดยเฉพาะ QC Form)
        ↓
5. Phase gate  (ครบเกณฑ์ใน docs/roadmap.md ไหม)
        ↓
6. รายงาน QA  (Pass / Fail + หลักฐาน)
```

**กฎ:** ถ้า **P0 หรือ P1** ยัง Fail → **ห้าม deploy production**

---

## ระดับความรุนแรง (Severity)

| ระดับ | ชื่อ | ความหมาย | ตัวอย่าง |
|-------|------|----------|----------|
| **P0** | Critical | ข้อมูลพัง / ระบบล่ม / login พัง / รั่วสิทธิ์ | แผนกอื่นแก้แผนได้ · ลบประวัติกล่องโดยไม่ตั้งใจ |
| **P1** | High | Feature หลักใช้ไม่ได้ | Box Grade บันทึกแล้วไม่โผล่ Post Production |
| **P2** | Medium | ผิด spec / UX แย่ | ยังมี emoji ในเมนู · ไม่ stamp ผู้บันทึก |
| **P3** | Low | สวยงาม / edge น้อย | ไอคอนไม่ตรงตาราง ui-ux |
| **P4** | Info | ข้อเสนอแนะ | refactor ภายหลัง |

---

## Automated QA — คำสั่งมาตรฐาน

รันใน root (`anu-production`):

```powershell
cd C:\Users\Tira\Projects\anu-production

# 1) TypeScript
npx tsc --noEmit

# 2) Lint
npm run lint

# 3) Production build
npm run build
```

เมื่อมี test script เพิ่ม:

```powershell
npm test
```

**Database (หลัง migration):**

```powershell
npx supabase migration list --linked
```

**เกณฑ์ผ่าน Automated:** ทุก command exit code 0 · ไม่มี error แดง

---

## Checklist 1 — Code Correctness

### ทุก PR / ทุก feature

- [ ] Logic ตรง `docs/roadmap.md` — ไม่ทำเกิน Phase ปัจจุบัน
- [ ] **QC Form ไม่ถูกแก้** เว้นแต่ roadmap เปิดงานนั้นชัดเจน
- [ ] Input API ถูก validate ฝั่ง server
- [ ] Edge cases: null, empty, duplicate batch, concurrent save
- [ ] **Logic คำนวณแยกโมดูล** — ไม่ฝังยาวในหน้า UI
- [ ] ไฟล์ไม่กลายเป็น god-file — แยกตาม domain

### Domain-specific

- [ ] Box Grade: Line → Batch → **Box** → Grade → Defect (ถ้าไม่ใช่ AF/HP/HUP) → Save → **เฉพาะกล่องนั้น** ไป Box Status
- [ ] กล่องที่ยังไม่ graded **ไม่ปรากฏ** ใน Post Production
- [ ] Defect options ตรง `docs/defect-list.md`
- [ ] Box Status: ไม่มี UI เลือก grade/defect หลัง Phase 2
- [ ] Actor fields ทุกการบันทึก stamp จาก session user id (ไม่พิมพ์ชื่อ)
- [ ] Excel import: คอลัมน์ครบตามฟอร์มแผนทั้งชุด — ไม่ตรง = reject + ข้อความชัด
- [ ] Plan: แผนกอื่น read-only (UI + API)
- [ ] Rejection: ไม่มี Pareto เก่า · มีกราฟแยก line (หลัง Phase 4)
- [ ] `department` มีคู่กับ `role` — ไม่ลบ/แทนที่ role |

---

## Checklist 2 — Security ★

### Secrets

- [ ] ไม่มี `.env` / service_role ใน git หรือ client bundle
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ใช้ server-only

### Auth & RBAC

- [ ] Route / API เช็ค role ตาม `lib/auth/roles.ts` (+ แผนกเมื่อมี)
- [ ] Planner-only write สำหรับแผน
- [ ] User แผนก A ไม่เขียนข้อมูลแผนก B โดยไม่ได้รับสิทธิ์
- [ ] ไม่เชื่อ `user_metadata` อย่างเดียวถ้ามีตาราง profile/role จริง

### Injection & abuse

- [ ] ไม่ต่อ SQL จาก user input
- [ ] Upload Excel: จำกัดชนิด/ขนาด · parse ปลอดภัย

### Smoke สิทธิ์

| ทดสอบ | วิธี | ผลที่ต้องได้ |
|--------|------|--------------|
| แก้แผนโดย Quality user | Login Quality · POST/PUT plan | 403 / ถูกบล็อก |
| เปิด Admin users โดย non-admin | เปิด `/user` | redirect / 403 |
| Grade โดยไม่มี session | เรียก API ตรง | 401 |

---

## Checklist 3 — Stability & Performance

- [ ] `npm run build` ผ่าน
- [ ] List ใหญ่มี pagination หรือ limit ที่สมเหตุสมผล
- [ ] Import Excel แสดง progress / ไม่ค้างเงียบ
- [ ] Error state ไม่ white screen
- [ ] Realtime/subscription (ถ้ามี) ถอดเมื่อ unmount

---

## Checklist 4 — UX & Shop Floor

- [ ] ปุ่มหลัก ≥ 44×44px
- [ ] **lucide-react เท่านั้น — ไม่มี emoji ใน UI**
- [ ] TH/EN หน้า operator / production ที่เกี่ยวข้อง
- [ ] สี grade ตาม `STATUS_COLORS`
- [ ] Read-only plan มีป้ายชัด
- [ ] ชื่อผู้บันทึก/QC โชว์ได้เมื่อต้อง audit

---

## Checklist 5 — Database & Migration

- [ ] Migration อยู่ใน `supabase/migrations/` ตาม timestamp
- [ ] อัปเดตเอกสารถ้า schema เปลี่ยน
- [ ] ไม่ลบ column สำคัญโดยไม่มี migration + แผน migrate ข้อมูล
- [ ] ฟิลด์ audit (`recorded_by` / `updated_by`) มีบนตารางที่เขียนบ่อย

---

## Checklist 6 — Department & Role matrix

ทดสอบอย่างน้อย 1 account ต่อบทบาทหลัก:

| Actor | ต้องทำได้ | ต้องทำไม่ได้ |
|-------|-----------|--------------|
| **Admin** | จัดการ user · เข้าได้กว้างตามระบบ | — |
| **Planner** | เพิ่ม/แก้แผน · import Excel | แก้ Box Grade ถ้าไม่มีสิทธิ์ Quality |
| **Quality** | Box Grade · (QC Form ตามเดิม) | แก้แผน |
| **Post Production** | ชั่งน้ำหนัก / inspector บนกล่องที่ graded แล้ว | เปลี่ยน grade/defect หลัง Phase 2 |
| **Production** | ดูงานแผนก + ดูแผน read-only | แก้แผน |
| **Warehouse / HR / Account** | ดูแผน read-only (เมื่อเปิดสิทธิ์) | ถูกบังคับให้มี dashboard ก่อน Phase 7 |

- [ ] Sidebar ตรงแผนก + role
- [ ] API 403 เมื่อสิทธิ์ไม่พอ

---

## Checklist 7 — Feature-specific ตาม Phase

### Phase 1 — Foundations

- [ ] ไม่มี emoji ในเมนู/หน้าหลัก
- [ ] User มีช่อง `department` ครบ 7 ค่า **คู่กับ** `role`
- [ ] บันทึกหลัก stamp จาก user id ได้

### Phase 2 — Box Grade handoff

- [ ] Quality เกรด **ทีละกล่อง**
- [ ] กล่อง graded แล้วโผล่ Post Production · ยังไม่ตรวจไม่โชว์
- [ ] `/record` ไม่มี grade/defect picker
- [ ] Defect list = `docs/defect-list.md`
- [ ] QC Form unchanged (regression)
- [ ] Check by / Weight by จาก user id อัตโนมัติ

### Phase 3 — Excel + plan ACL

- [ ] Template = คอลัมน์ฟอร์มแผนทั้งชุด (รวม ink/roller)
- [ ] คอลัมน์ผิด → ไม่ import แถวนั้น / ทั้งไฟล์ตามที่ตกลง + รายงาน error
- [ ] Non-planner แก้แผนไม่ได้

### Phase 4 — Batch 360 + Rejection

- [ ] เปิด batch เห็นฟิลด์ครบตาม roadmap
- [ ] ประวัติรายกล่อง + แก้ไขตามสิทธิ์
- [ ] กราฟ rejection by line · ไม่มี Pareto เก่า

### Phase 5 — Dashboards

- [ ] มี dashboard Planner / Quality / Production / Post Production
- [ ] Production dashboard ใช้ข้อมูลที่มีอยู่ (ไม่บังคับหน้ากรอกใหม่ก่อน)
- [ ] ไม่มี dashboard บังคับของ Warehouse/HR/Account

### Phase 6 — PWA

- [ ] manifest + icons จากโลโก้ ANU ของ owner
- [ ] favicon บนแท็บ
- [ ] Installable

---

## Checklist 8 — Audit & Ops

- [ ] รู้ว่าใครลง grade / น้ำหนัก / แก้กล่อง
- [ ] ไม่ log รหัสผ่านหรือ secret
- [ ] (เมื่อมี) error tracking ตั้งค่าบน production

---

## Manual Test Script — สำหรับเจ้าของโปรเจกต์

### Script A: แผนก + แผน read-only (10 นาที)

1. สร้าง user แผนก Quality  
2. Login → ต้องเห็นเมนู Quality เป็นหลัก  
3. เปิด Plan → ดูได้แต่แก้ไม่ได้  
4. Login Planner → แก้แผนได้  

### Script B: Box Grade → Box Status (15 นาที) — หลัง Phase 2

1. Quality: เลือก line/batch/**box A** · grade AF · บันทึก  
2. Post Production → เห็น **เฉพาะ box A** · grade AF read-only · **ไม่มี**ตัวเลือกเปลี่ยน grade  
3. กล่อง B ใน batch เดียวกันที่ยังไม่ตรวจ → **ไม่โชว์** ใน Post Production  
4. Quality: box B · grade Sort + เลือก defect จากรายการใหม่ · บันทึก → ถึงจะโผล่  
5. Post Production ใส่ weight · บันทึก → Weight by = user ที่ login  
6. เปิด QC Form เดิม → ต้องเหมือนเดิมทุกอย่าง  
7. User มีทั้ง role และ department — แก้ role ไม่ลบ department  

### Script C: Excel import (10 นาที) — หลัง Phase 3

1. Download template  
2. Import ไฟล์คอลัมน์ครบ → แผนเพิ่มตามแถว  
3. Import ไฟล์ขาดคอลัมน์ → ต้อง error ชัด ไม่เงียบ  

### Script D: Batch 360 (10 นาที) — หลัง Phase 4

1. ค้นหา batch  
2. เปิดรายละเอียดครบฟิลด์  
3. เปิดกล่องหนึ่ง → เห็นประวัติ · แก้ไขได้ตามสิทธิ์  

### Script E: PWA (5 นาที) — หลัง Phase 6

1. เปิดบน Chrome mobile/desktop  
2. Install / Add to Home Screen  
3. ไอคอนแอปขึ้นถูกต้อง · เปิดจากไอคอนได้  

### Script F: Phase 9 Platform (20 นาที)

1. **Excel flexible:** import วันที่ `21.07.2026` / `3/8/2026` / `20-Jul-26` · header `Need AF` · Item Qty `0.1`/`1.2`/`10` · Need AF ทศนิยมได้ · Print ว่าง → U · Status ว่าง → Planing · แถวผิดรายงานชัด  
2. **Partial import:** ไฟล์มีแถวถูก+แถวผิด → แถวถูกเข้า DB · แถวผิดไม่บล็อกทั้งไฟล์  
3. **Single session:** login เครื่อง A แล้ว login เครื่อง B → ถาม Use new / Keep old · เลือก Use new → A ถูก logout · เลือก Keep old → B ไม่เข้า  
4. **PWA banner:** เปิดเบราว์เซอร์ที่ยังไม่ติดตั้ง → เห็นแถบ ~20 วิ แล้วหาย · เปิดจากแอปติดตั้งแล้ว → ไม่เห็นแถบ  
5. **Skeleton:** รีเฟรช dashboard / plan → เห็น skeleton ไม่จอขาว  
6. **Date filter:** Planner / Production / Quality มี period + Custom เหมือน Analytics  
7. **SWR + Realtime (flag on):** เปิด 2 จอ dashboard · บันทึกกล่องที่อีกจอ → จอแรกอัปเดตโดยไม่กด refresh (หรือหลัง mutate)  
8. **Feature flags:** login admin → เห็น Features · เปิด/ปิดได้ · login manager/operator → ไม่เห็นเมนู · เรียก API โดยตรงต้อง 403  

---

## รายงาน QA (Template)

```markdown
# QA Report — ANU Production
Date: YYYY-MM-DD
Scope: [feature/phase/PR #]
Tester: [ชื่อ / AI Agent]

## Summary
- Overall: PASS | FAIL | PASS WITH NOTES
- P0: 0 open | P1: 0 open (required for deploy)

## Automated
| Check | Result |
|-------|--------|
| tsc | ✅/❌ |
| lint | ✅/❌ |
| build | ✅/❌ |

## Manual
| Script | Result | Notes |
|--------|--------|-------|
| A Dept/Plan ACL | | |
| B Box Grade handoff | | |
| C Excel | | |
| D Batch 360 | | |
| E PWA | | |
| F Phase 9 Platform | | |

## Findings
| ID | Sev | หัวข้อ | ขั้นตอนทำซ้ำ | สถานะ |
|----|-----|--------|--------------|-------|
| QA-001 | P1 | ... | 1. ... 2. ... | Open/Fixed |

## Sign-off
- [ ] ครบเกณฑ์ Phase ใน docs/roadmap.md
- [ ] QC Form ไม่ถูกละเมิด (ถ้าไม่ได้ตั้งใจเปิดงาน)
- [ ] ไม่มี P0/P1 ค้าง
```

---

## สำหรับ AI Agent — เมื่อใช้ QA Skill นี้

1. อ่าน `docs/decisions.md` + `docs/roadmap.md` (Phase ปัจจุบัน) + `docs/ui-ux-spec.md`
2. รัน Automated QA ครบ — รายงานผล
3. ไล่ Checklist ที่เกี่ยวกับ Phase / diff
4. ระบุ P0–P4 พร้อม path ไฟล์
5. แก้ได้แล้ว rerun จน automated ผ่าน
6. สรุปภาษาง่ายให้เจ้าของโปรเจกต์
7. อย่าเริ่ม Phase ถัดไปถ้า phase gate ยังไม่ผ่าน

**Trigger keywords:** QA, test, ตรวจสอบ, security review, smoke test, regression, phase gate, ก่อน deploy

---

## เอกสารที่เกี่ยวข้อง

| ไฟล์ | ใช้เมื่อ |
|------|----------|
| `docs/decisions.md` | ข้อตกลงที่ปิดแล้ว |
| `docs/roadmap.md` | ขอบเขต Phase · exit criteria |
| `docs/ui-ux-spec.md` | UX · ไอคอน · PWA |
| `docs/defect-list.md` | รายการ defect มาตรฐาน |
| `.cursor/rules/anu-production.mdc` | กฎเหล็กตอนเขียนโค้ด |

---

*ANU Production — QA เป็นประตูก่อนทุก deploy ไม่ใช่ขั้นตอนสุดท้ายที่ข้ามได้*
