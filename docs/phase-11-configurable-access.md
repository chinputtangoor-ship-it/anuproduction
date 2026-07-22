# Phase 11 — Configurable Access (Sidebar · Read/Edit · Admin grants)

> Status: Done · Implemented 2026-07-22  
> Related: [decisions.md](./decisions.md) (D23–D26) · [roadmap.md](./roadmap.md) · [ui-ux-spec.md](./ui-ux-spec.md)

## 1) สถานะปัจจุบัน (ก่อน Phase 11)

| ชั้น | พฤติกรรมวันนี้ |
|------|----------------|
| **Position (`role`)** | `admin` · `manager` · `supervisor` · `operator` |
| **Department** | ฟิลด์คู่กับ role (D5) — ไม่แทนที่ role |
| **Sidebar** | admin/manager เห็นทุกแผนก · คนอื่นเห็น**เฉพาะแผนกตน** |
| **เมนูย่อย** | hard-code: `approveOnly` (camera/repass) · `adminOnly` (User/Features) |
| **Route guard** | `canAccessRoute` กรองตามแผนก + approve |
| **Plan write** | `canEditPlan` = admin/manager/supervisor |
| **Ops Dashboard** | เคยอยู่ใน 4 แผนก (10A) → **ย้ายไป Planner อย่างเดียว** (D24) |

ปัญหา: ยืดหยุ่นไม่พอ · admin กำหนดสิทธิ์รายเมนู / อ่านอย่างเดียว / รายบุคคลไม่ได้

---

## 2) เป้าหมาย (owner brief)

1. **Sidebar เห็นหัวแผนกทั้งหมด** ทุกคน (ยกเว้นกลุ่ม **User** = admin เท่านั้น)
2. **หัวข้อย่อย (menu items)** โผล่เฉพาะที่ admin เปิดให้เห็น
3. แต่ละรายการกำหนดได้ **`none` | `read` | `edit`**
4. กำหนดได้ 3 แบบ:
   - **ตำแหน่งทั้งแผนก** — เช่น Quality + supervisor
   - **ตำแหน่งทั้งหมด (ทุกแผนก)** — เช่น operator ทั่วโรงงาน
   - **รายบุคคล** — user คนนั้น
5. หน้าใน **User** สำหรับ admin จัดการสิทธิ์นี้
6. **Ops Dashboard** อยู่ใต้ **Planner** เป็นหลัก · คนอื่นเข้าได้เมื่อ admin มอบสิทธิ์

---

## 3) Architect’s Summary

### 3.1 คำศัพท์

| คำ | ความหมาย |
|----|----------|
| **Section** | หัวแผนกใน sidebar (`nav.planner`, `nav.quality`, …) — **ทุกคนเห็นชื่อแผนก** |
| **Menu key** | รหัสเมนูย่อยคงที่ (เช่น `ops_dashboard`, `box_grade`, `plan`, `camera`) |
| **Access level** | `none` (ไม่เห็น) · `read` (เปิดได้ แก้ไม่ได้) · `edit` (เปิด+เขียน) |
| **Grant scope** | `user` · `department_position` · `position` |

### 3.2 ลำดับความสำคัญเมื่อชนกัน

ผู้ใช้ใหม่**ต้องมีแผนก + ตำแหน่ง** → ชั้นใช้งานปกติคือ **แผนก+ตำแหน่ง**

```
1) Grant รายบุคคล (user_id)                 ← ชนะสุด (ยกเว้น/เพิ่มคนเดียว)
2) Grant ตำแหน่งในแผนก (dept + position)   ← ค่า default / ชั้นหลัก
3) Grant ตำแหน่งทั้งระบบ (position)         ← ทางเลือก: ทั้งโรงงานในตำแหน่งนั้น
4) ไม่มี grant ที่ match                    ← ไม่เห็นเมนูย่อย
```

| ชั้น | ใช้เมื่อ |
|------|----------|
| **dept + position** | ค่าเริ่มต้นของโรงงาน (seed) และที่ admin ตั้งเป็นปกติ |
| **position ทั้งระบบ** | แอดมินอยากให้ตำแหน่งนั้น**ทุกแผนก**เห็นหน้าเดียวกัน (เช่น supervisor ทั้งโรงงานใช้ Camera) |
| **รายบุคคล** | ยกเว้นคนเดียวให้ต่างจากเพื่อนแผนก/ตำแหน่ง |

**มอบสิทธิ์ ↔ ถอนสิทธิ์**

- บันทึกระดับ `read` / `edit` = มอบสิทธิ์ที่ชั้นนั้น
- เลือก **ถอนสิทธิ์ (None)** แล้วบันทึก = **ลบแถว grant** ที่ชั้นนั้น
- ถอนที่ชั้นล่างไม่ตัดชั้นบน — เช่น ถอน dept+position แต่ยังมี position ทั้งระบบอยู่ คนนั้นยังเข้าได้จนกว่าจะถอนชั้น position หรือใส่ grant รายบุคคลทับ
- ไม่เก็บแถว `none` ในฐานข้อมูล

ระดับในชั้นเดียวกันถ้ามีหลายแถว: ใช้สูงสุด (`edit` > `read`)

### 3.3 Sidebar UX

```
Planner          ← ทุกคนเห็นหัวข้อ
  └─ (เฉพาะเมนูที่ grant ≥ read)
Quality
  └─ …
Production
Post Production
Warehouse        (ว่างได้จนกว่าจะมีเมนู)
HR
Account
User             ← เฉพาะ admin
  └─ Users · Features · Access control
```

- แผนกที่ **ไม่มีเมนูย่อยที่ user มีสิทธิ์** → ยังเห็นหัวแผนก แต่เปิดแล้ว empty state สั้น ๆ (“ยังไม่มีเมนูที่เปิดสิทธิ์”)
- ป้าย **Read only** บนหน้า/ฟอร์มเมื่อ level = `read`

### 3.4 Menu catalog (รหัสคงที่)

| menu_key | Section | Route | หมายเหตุ |
|----------|---------|-------|----------|
| `ops_dashboard` | Planner | `/dashboard/planner` | Ops Dashboard ชุดเดียว (เดิม 10A) |
| `plan` | Planner | `/plan` | **อยู่ใต้ Planner ไม่ใช่ข้าง Home** (D27) · seed: operator `read` · approve `edit` |
| `qc_form` | Quality | `/quality` | freeze UI |
| `box_grade` | Quality | `/quality/grade` | |
| `box_status` | Post Production | `/record` | |
| `batch_detail` | Post Production | `/boxes` | |
| `rejection` | Post Production | `/rejection` | |
| `backlog` | Post Production | `/backlog` | |
| `camera` | Post Production | `/camera` | |
| `repass` | Post Production | `/repass` | |
| `users` | User | `/user` | admin only (นอกระบบ grant ทั่วไป) |
| `features` | User | `/settings/features` | admin only |
| `access_control` | User | `/user/access` | admin only — หน้าจัดการ grant |

Production / Warehouse / HR / Account — เพิ่ม `menu_key` เมื่อมีหน้าจริง

### 3.5 Schema (ร่าง)

```sql
-- access_menu_grant
id uuid PK
scope text CHECK (scope IN ('user','department_position','position'))
user_id uuid NULL REFERENCES profiles(id)      -- เมื่อ scope=user
department text NULL                              -- เมื่อ scope=department_position
position text NULL                                -- เมื่อ scope=position หรือ department_position
menu_key text NOT NULL
access_level text NOT NULL CHECK (access_level IN ('read','edit'))
created_by uuid
created_at / updated_at
-- unique ตามชนิด scope เพื่อไม่ซ้ำ
```

- ไม่เก็บแถว `none` — ลบ grant = ปิดสิทธิ์
- RLS: อ่านได้ทุก authenticated (เพื่อคำนวณเมนูตัวเอง) · เขียนได้เฉพาะ admin
- Resolve ใน `lib/auth/access.ts` + cache (SWR) · กัน route ด้วย level เดียวกัน

### 3.6 หน้า Admin — Access control

Route: `/user/access` (ในกลุ่ม User)

UI โดยประมาณ:

1. เลือกโหมด: **รายบุคคล** | **ตำแหน่งทั้งแผนก** | **ตำแหน่งทั้งหมด**
2. เลือกเป้าหมาย (user / dept+position / position)
3. ตารางเมนูทั้งหมด × ระดับ: ไม่มี · Read · Edit
4. บันทึก → upsert/delete grants
5. (ทางเลือก) ปุ่ม “คัดลอกจาก …” · ดู preview สิทธิ์ของ user คนหนึ่ง

### 3.7 Seed เริ่มต้น (ชั้นหลัก = dept + position)

| menu_key | ชั้น | ใครได้ | level |
|----------|------|--------|-------|
| `plan` | **dept+position** | ทุกแผนก × ทุกตำแหน่ง | `read` |
| `plan` | position (ทั้งระบบ) | admin, manager, supervisor | `edit` |
| `ops_dashboard` | **dept+position** | Planner × ทุกตำแหน่ง | `read` |
| `ops_dashboard` | position | admin, manager | `read` |
| `qc_form`, `box_grade` | **dept+position** | Quality × ทุกตำแหน่ง | `edit` |
| `qc_form`, `box_grade` | position | admin, manager | `edit` |
| Post screens | **dept+position** | Post Production × ทุกตำแหน่ง | `edit` |
| Post screens | position | admin, manager | `edit` |
| `camera`, `repass` | position | admin, manager, supervisor (ทั้งโรงงาน) | `edit` |
| User menus | — | admin only (hard-code) | — |

Admin ปรับ/ถอนได้ที่ `/user/access`

### 3.8 ความเสี่ยง

| ความเสี่ยง | บรรเทา |
|------------|--------|
| ลืม seed → คนใช้ไม่ได้ | migration + seed ใน SQL · เอกสาร deploy |
| แก้แค่ UI ไม่กัน API | ตรวจ access บน write path / RLS หรือ server action |
| อ่านอย่างเดียวแต่ยังกด Save | ซ่อน/disable ปุ่ม + ปฏิเสธที่ API |
| สับสนกับ D9 เก่า | D23 แทนที่กฎ sidebar ของ D9 |

---

## 4) สิ่งที่ทำทันที (ก่อนเขียน ACL เต็ม)

- [x] เอกสารนี้ + decisions D23–D26 + roadmap Phase 11 + ui-ux / README
- [x] อัปเดต `.cursor/rules/anu-production.mdc`
- [x] ย้าย Ops Dashboard ไปเมนู **Planner อย่างเดียว** · route เก่า redirect ไป `/dashboard/planner`
- [x] ใส่ `menuKey` ใน `APP_MENU` เตรียม Phase 11

## 5) ส่งมอบโค้ด

1. Migration `20260722130000_phase11_access_grants.sql` + seed  
2. `lib/auth/access.ts` · `menu-catalog.ts` · `AccessProvider`  
3. Sidebar / Home hub — ทุกแผนก · กรองเมนูย่อยตาม grant · Plan ใต้ Planner  
4. Route guard ใน AccessProvider  
5. หน้า `/user/access`  
6. Plan / Box Grade / Box Status ผูก `edit`  
7. Deploy: รัน migration บน Supabase ก่อนใช้งานจริง

---

## 6) Exit criteria

- [x] ทุกคนเห็นหัวแผนกครบ · User เฉพาะ admin
- [x] เมนูย่อยตาม grant · read แก้ไม่ได้ · edit แก้ได้ (Plan / Grade / Record)
- [x] Admin ตั้งสิทธิ์ได้ 3 แบบที่ `/user/access`
- [x] Ops Dashboard + Plan อยู่ใต้ Planner
- [x] QC Form ไม่ถูกแตะ UI
- [x] Route ไม่มีสิทธิ์ → redirect `/dashboard`
- [x] `tsc --noEmit` clean
