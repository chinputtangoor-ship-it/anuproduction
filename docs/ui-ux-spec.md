# ANU Production — UI / UX Spec

> Version: 1.1 · Shop-floor manufacturing app · มติ: [decisions.md](./decisions.md)  
> อ้างอิง roadmap: [roadmap.md](./roadmap.md) · Rule: `.cursor/rules/anu-production.mdc`

---

## Design principles

1. **หนึ่งงานต่อหน้า** — กรอก / ตรวจ / ดูแยกชัด ไม่ยัดทุกอย่างในจอเดียว  
2. **นิ้วใหญ่ก่อน** — ปุ่มสำคัญบนโรงงาน ≥ 44×44px  
3. **สองภาษา** — TH / EN ตามระบบ i18n ที่มีอยู่ (`lib/i18n`)  
4. **แผนกเห็นงานตน** — cognitive load ต่ำ; ของแผนกอื่นซ่อนหรือ read-only  
5. **ไม่มี emoji ใน UI** — ใช้ **lucide-react** เท่านั้น  
6. **Audit ที่มองเห็น** — แสดง “บันทึกโดย …” เมื่อเกี่ยวกับการตรวจย้อนหลัง  
7. **สถานะสีชัด** — ใช้ `STATUS_COLORS` / token เดิมของแอป  

---

## Visual tokens (ใช้ของที่มีในโปรเจกต์)

อ้างอิง CSS / Tailwind ที่มีอยู่แล้ว (anu-surface, anu-elevated, anu-success, anu-danger, anu-warning, …)

| ความหมาย | การใช้ |
|----------|--------|
| Success / AF | เขียว |
| Warning / Sort | ส้ม-เหลือง |
| Danger / Scrap | แดง |
| Info grades (HP, HUP, …) | ตาม `STATUS_COLORS` ใน `lib/constants/production.ts` |

**ห้าม** ใส่ emoji เป็นไอคอนเมนู ปุ่ม หรือหัวข้อ

---

## Iconography (lucide-react)

แทนที่ชุด emoji เดิมในเมนูด้วยไอคอนประมาณนี้ (ปรับชื่อได้ แต่ต้องเป็น lucide):

| Section / หน้า | Icon แนะนำ |
|----------------|------------|
| Planner / Plan | `CalendarRange` หรือ `ClipboardList` |
| Quality / QC · Box Grade | `ScanSearch` หรือ `BadgeCheck` |
| Production | `Factory` |
| Post Production | `Package` |
| Box Status | `Boxes` |
| Rejection | `Ban` หรือ `OctagonAlert` |
| Backlog | `Clock` |
| Camera | `Camera` |
| Repass | `RefreshCw` |
| Analytics / Dashboard | `ChartColumn` |
| Warehouse | `Warehouse` |
| Human Resources | `Users` |
| Account | `Wallet` |
| User admin | `UserCog` |
| Search batch | `Search` |
| Edit | `Pencil` |
| Save | `Save` |
| Import Excel | `FileSpreadsheet` |
| PWA / Install | `Download` |

กฎ:

- stroke สม่ำเสมอ (ตาม default lucide)
- ขนาดเมนู sidebar ประมาณ 20px · ปุ่มใหญ่บนฟอร์ม 22–24px
- สีไอคอนตามข้อความ / state ไม่ใส่สีสุ่ม

---

## Information architecture

```
App Shell
├── Global header (โลโก้ · ภาษา · user)
├── Sidebar ตามแผนก + role
└── Pages
    ├── Dashboards ตามแผนก (Phase 10A — ชุดเดียวกัน)
    ├── Planner → Plan (+ Excel import)
    ├── Quality → QC Form (freeze) · Box Grade (ใหม่)
    ├── Production → (เมนูตามที่มี/ขยายทีหลัง)
    ├── Post Production → Box Status · Rejection · Backlog · …
    ├── Warehouse / HR / Account → พัก (เมนูว่างหรือซ่อนรายการ)
    └── Admin → Users (มี Department)
```

---

## Department UX

### User form — ช่องแผนก

Dropdown **เพิ่มคู่กับ role** (ไม่แทนที่ role):

- Planner  
- Quality  
- Production  
- Post Production  
- Warehouse  
- Human Resources  
- Account  

พฤติกรรม:

- `role` ยังคุมสิทธิ์เขียน (เช่น admin, planner, qc_technician)  
- `department` ใช้จัดเมนู / เน้นงานแผนก  
- Login แล้ว sidebar เน้น section ของแผนกตน  
- แผน (`/plan`): **ทุกแผนกเข้าดูได้** แต่ฟอร์มเป็น read-only ถ้าไม่ใช่ Planner (และไม่ใช่ admin/supervisor ตาม config)  
- ป้าย “ดูอย่างเดียว” ชัดเจนเมื่อ read-only  

### Sidebar & access (Phase 11 — D23–D26)

- **หัวแผนก:** ทุกคนเห็นครบ (Planner … Account) · กลุ่ม **User** เฉพาะ admin  
- **เมนูย่อย:** โผล่ตาม grant (`read` / `edit`) ที่ admin ตั้ง — รายบุคคล · ตำแหน่งในแผนก · ตำแหน่งทั้งหมด  
- รายละเอียด: [phase-11-configurable-access.md](./phase-11-configurable-access.md)  
- Phase 11 implemented: sidebar ทุกแผนก · grant · `/user/access` · **Plan + Ops Dashboard อยู่ใต้ Planner**

### Dashboards (D24)

| รายการ | Route | หมายเหตุ |
|--------|-------|----------|
| **Ops Dashboard** | `/dashboard/planner` | อยู่เมนู **Planner** อย่างเดียว · มอบสิทธิ์ให้แผนกอื่นผ่าน Access control |
| Quality / Production / Post dash (เก่า) | redirect → `/dashboard/planner` | ไม่มีเมนูแยกแล้ว |
| Warehouse / HR / Account | — | **ยังไม่ออกแบบหน้า** |

**OpsDashboard:** Online/Offline 13 ไลน์ · progress % · KPI strip · Box status by line · Material Balance · Camera · Batch status · Due 7 days · Top defects · Line summary · Backlog · Re-pass · Awaiting Re-pass

มาตรฐานกราฟ:

- ชื่อแกน / หน่วยชัด  
- กรองตามช่วงวันที่ + line (`LinePeriodFilter`)  
- ไม่ใช้ Pareto scrap/defect แบบเดิม (ถูกแทนใน Phase 4)  
- ว่างเปล่า = empty state ข้อความสั้น ไม่ใช่กราฟพัง  
- ไม่มี emoji ใน UI — ใช้ lucide / สีสถานะ  
- รายละเอียดสูตร: [phase-10a-unified-ops-dashboard.md](./phase-10a-unified-ops-dashboard.md)

---

## Screen specs (ฟีเจอร์ใหม่)

### 1) Box Grade — Quality (Phase 2)

ลำดับฟิลด์ (ต่อ **หนึ่งกล่อง**):

1. Line (dropdown จาก `PRODUCTION_LINES`)  
2. Batch (**Planing หรือ Running** ของ line ที่เลือก — Phase 10B)  
3. Box (เลขกล่องถัดไป · เกรดกล่องที่ 1 บน Planing จะ Start batch อัตโนมัติ)  
4. Grade (`BOX_STATUS`)  
5. Defect — แสดงเมื่อ grade **ไม่อยู่ใน** `STATUSES_WITHOUT_DEFECT` = **AF, HP, HUP** · รายการจาก [defect-list.md](./defect-list.md)  
6. ปุ่มบันทึกขนาดใหญ่  

หลังบันทึกสำเร็จ:

- Toast / ข้อความสำเร็จสั้น  
- **เฉพาะกล่องนั้น** ไปอยู่ใน Box Status ของ Post Production  
- กล่องที่ยังไม่ตรวจ → ไม่ปรากฏที่ Post Production  
- **Check by** = user id ที่ login — ไม่ให้พิมพ์เอง  

**QC Form:** คง layout / section / field เดิม — แยกแท็บหรือแยกเมนูย่อย “QC Form” vs “Box Grade” ให้ไม่สับสน  

### 2) Box Status — Post Production (Phase 2)

รายการที่เห็น = **เฉพาะกล่องที่ Quality graded แล้ว**

เหลือโฟกัส:

- เลือกกล่องจากคิวที่ graded แล้ว  
- ใส่ Weight  
- บันทึก → **Weight by / Inspector** stamp จาก user id ที่ login  

เอาออกจาก UI:

- Grade picker  
- Defect picker  

แสดง grade/defect เป็น **read-only chips** จาก Quality  

### 3) Plan — Import Excel (Phase 3)

- ปุ่ม “Import from Excel” ใกล้ Add Plan  
- ปุ่ม “Download template”  
- คอลัมน์ = **ฟอร์มแผนปัจจุบันทั้งชุด** รวม ink / roller ฯลฯ  
- ผลลัพธ์: สรุปสำเร็จ X แถว / ผิด Y แถว พร้อมรายการ error  
- อย่า import เงียบ ๆ เมื่อ schema ไม่ตรง  

### 4) Batch detail (Phase 4)

**รายการ batch**

- ค้นหา → รายการผลลัพธ์ → คลิกเข้า  

**หัว batch** แสดงอย่างน้อย:

Line, Size, Batch, SAP Batch, Prod. Order, Sales Order, SO Item, FERT Code, Semi Code, Start Date, Finish Date  

**ตารางกล่อง**

Box no. · Box Status · Defects · Net (kg) · Total (kg) · Weight by · Check by  

**รายกล่อง**

- ประวัติการแก้ (ใคร · เมื่อไหร่ · ฟิลด์ไหน)  
- ปุ่มแก้ไข (ตามสิทธิ์)  

### 5) Rejection by line (Phase 4)

- ลบ Scrap/Defect Pareto  
- กราฟแท่งหรือเส้น: Rejection แยก **line**  
- ตัวกรองวันที่  

---

## Responsive

| อุปกรณ์ | เป้า |
|---------|------|
| Mobile / handheld | Operator ฟอร์มหลัก · ปุ่มใหญ่ · sidebar ยุบได้ |
| Tablet | Supervisor / QC บนไลน์ |
| Desktop | Planner · Analytics · Admin |

อย่าซ่อนปุ่มบันทึกหลักนอกหน้าจอบนมือถือ  

---

## PWA (Phase 6 + 9)

| รายการ | ข้อกำหนด |
|--------|----------|
| Favicon | จาก `public/icons/` (icon.svg / png) |
| `manifest.webmanifest` | name, short_name, theme/background, start_url, display standalone |
| Icons | ใช้ `public/icons/icon-192.png` และ `icon-512.png` (+ maskable จากโลโก้เดียวกัน) |
| Install | ติดตั้งลงเครื่องได้ (Android / desktop Chromium) |
| Install banner (Phase 9) | แถบด้านล่าง/บนพร้อมไอคอน `Download` · โชว์ **20 วินาที** แล้ว fade ออก · ถ้า `display-mode: standalone` หรือเคยติดตั้ง/dismiss แล้ว → **ไม่โชว์อีก** |
| Offline | อย่างน้อย app shell; คิว sync ถ้าจะทำ offline กรอก — ตกลงก่อนลงมือ |

ไอคอนต้องเป็น **สัญลักษณ์แบรนด์ ANU Production จากไฟล์โลโก้จริง** — ไม่ใช้ emoji เป็นไอคอนแอป  

---

## Phase 9 UX

### Single session dialog

หลัง login สำเร็จ ถ้ามี session ที่เครื่องอื่น: modal ถาม

- **ใช้เครื่องใหม่** — เครื่องเก่าถูกบังคับ logout  
- **คงเครื่องเดิม** — ยกเลิก login เครื่องใหม่  

ข้อความสั้น TH/EN · ปุ่มใหญ่ ≥ 44px  

### Loading skeleton

- ใช้ shimmer/`animate-pulse` ตาม token `anu-elevated`  
- รูปแบบ: Page / Dashboard KPI cards / Form / Table  
- ห้ามจอขาวตอน auth หรือ fetch  

### Dashboard date filter (ร่วม)

Planner · Quality · Production · Post Production (`/dashboard/post-production`) ใช้ตัวกรองเดียวกัน:

- Line  
- Period: All / Today / Day shift / Night shift / Last 7 / Last 30 / **Custom**  
- Custom = from/to วันที่ + เวลา (default 07:00–19:00)  

### Admin Feature Toggle

- เมนู **Features** เห็นเฉพาะ `admin`  
- Toggle: Realtime · PWA banner · Single session · SWR cache  
- Role อื่นห้ามเห็นแม้พิมพ์ URL  

### Excel import feedback

- สำเร็จ X แถว / ผิด Y แถว + รายการ error  
- Hint: ค่าในตัวอย่าง = **แค่รูปแบบ** · Item Qty = ล้าน (เลขใดก็ได้ เช่น `5`/`20`/`50`) · Need AF = กล่อง · Print ว่าง = U

---

## Copy & empty states

- ข้อความสั้น ภาษาง่าย  
- Error บอกว่าแก้ยังไง (เช่น “คอลัมน์ Size หายไปจากไฟล์ Excel”)  
- ห้าม white screen — ใช้ empty / error state / skeleton  

---

## Anti-patterns

- Emoji ในเมนูหรือปุ่ม  
- การ์ดซ้อนการ์ดโดยไม่จำเป็นบนฟอร์มโรงงาน  
- ให้ user พิมพ์ชื่อคนตรวจ / ชั่ง / inspector เอง  
- โชว์กล่องที่ยังไม่ graded ใน Post Production  
- ซ่อนการเปลี่ยน grade ไว้ที่ Post Production หลังย้ายไป Quality แล้ว  
- Dashboard Warehouse/HR/Account ก่อน Phase 7  

---

## ข้อตกลงที่ปิดแล้ว

ดู [decisions.md](./decisions.md) — ไม่ต้องถามซ้ำเรื่อง defect group, per-box handoff, auto stamp, department+role, Excel columns, logo, Production KPI
