# Agreed Decisions — ANU Production

> บันทึกข้อตกลงกับ owner · อัปเดตล่าสุด: 2026-07-22  
> เอกสารหลัก: [roadmap.md](./roadmap.md) · [ui-ux-spec.md](./ui-ux-spec.md) · [qa-skill.md](./qa-skill.md)

| # | หัวข้อ | มติ |
|---|--------|-----|
| D1 | Defect เมื่อไม่ต้องเลือก | ใช้กฎเดิมทั้งกลุ่ม `STATUSES_WITHOUT_DEFECT` = **AF, HP, HUP** — grade อื่นต้องเลือก defect |
| D2 | รายการ Defect | ตาม [defect-list.md](./defect-list.md) — แทน `DEFECT_LIST` เก่าทั้งชุดใน Phase 2 |
| D3 | Box Grade → Post Production | QC **ตรวจทีละกล่อง** · เฉพาะกล่องที่กำหนดเกรดแล้วถึงโผล่ Post Production · กล่องที่ยังไม่ตรวจ **ไม่แสดง** |
| D4 | ผู้บันทึกอัตโนมัติ | `Check by` / `Weight by` / `Inspector` และ **การบันทึกอื่นทั้งหมด** stamp จาก **user id ที่ login อยู่** — ห้ามให้พิมพ์ชื่อเอง |
| D5 | แผนก vs Role | `department` เป็น **ฟิลด์เพิ่ม** คู่กับ `role` เดิม — ไม่แทนที่ role |
| D6 | Excel Plan | คอลัมน์ = ฟอร์มแผนทั้งชุด (canonical English + **aliases**) · ค่าที่ยืดหยุ่นตามตัวอย่างโรงงาน · **นำเข้าแถวที่ถูก + รายงานแถวผิด** · ขาดคอลัมน์บังคับ = ปฏิเสธทั้งไฟล์ |
| D7 | PWA / favicon | ใช้โลโก้ใน `public/icons/` (`icon.svg`, `icon-192.png`, `icon-512.png`) |
| D9 | Position + แผนก | **Position** = `admin` · `manager` · `supervisor` · `operator` + **`department`** · *(กฎ sidebar แบบแผนกเดียวของ D9 ถูกแทนด้วย D23)* |
| D10 | Box Grade handoff | QC insert กล่อง (grade/defect, น้ำหนักว่าง) → Post Production เห็นเฉพาะกล่องที่รอชั่ง (`net_weight_kg` null) |
| D11 | Excel units & blanks | **Item Qty (K)** = ล้าน (เช่น `0.1`=1แสน · `1.2`=1.2ล้าน · `10`=10ล้าน · ทศนิยม 0–2 ตำแหน่ง) · **Need AF Box** = กล่อง (ทศนิยม 0–2 ตำแหน่งได้) · **Size** เก็บ string เช่น `0`·`00`·`1`·`2`·`3`·`4` · **Print** ว่าง → `U` · ว่างได้: Ink Cap · Roller Cap · Ink Body · Roller Body · Status (ว่าง → `Planing`) · วันที่หลายรูปแบบ |
| D12 | Single session | **1 login = 1 session** · login เครื่องใหม่ขณะมี session เครื่องเก่า → ถาม **ใช้เครื่องใหม่** หรือ **คงเครื่องเดิม** · ไม่เก็บ refresh token ดิบ |
| D13 | PWA install banner | แถบติดตั้งโชว์ **20 วินาที** แล้ว fade ซ่อน · ติดตั้งแล้ว / dismiss แล้ว / เปิดแบบ standalone → ไม่โชว์อีก |
| D14 | Loading skeleton | ทุกหน้าหลักใช้ skeleton ตอนโหลด — ห้ามจอขาว / `return null` อย่างเดียว |
| D15 | Client cache + Realtime | ใช้ **SWR** (ไม่ใช้ TanStack Query) · Supabase **Realtime** บนตารางร้อน · คุมด้วย feature flag |
| D16 | Feature Toggle | Admin เปิด/ปิดในแอปได้ทันที (`role === admin` เท่านั้นเห็นเมนู+API) · flags: `realtime` · `pwa_install_banner` · `single_session` · `swr_client_cache` |
| D17 | Unified Ops Dashboard | Widgets ชุดเดียว (Phase 10A) · **ตำแหน่งเมนูถูกแก้โดย D24** — อยู่ใต้ Planner · มอบสิทธิ์ผ่าน Phase 11 |
| D18 | Material Balance | ของดี kg = Σ AF `net_weight_kg` · ของเสีย kg = Σ Rejection `total_kg` · Good% / Reject% = ส่วนของ (ดี+เสีย) · แยก Line + Batch · รวม=0 แสดง `—` |
| D19 | Scrap Rate | นับเฉพาะกล่อง `status === Scrap` / จำนวนกล่องทั้งหมด × 100 — **ไม่** นับทุก non-AF เป็น scrap |
| D20 | Start batch 2 ทาง | (1) ปุ่ม Start ในแผน (2) QC เกรดกล่องที่ 1 ของ batch Planing → Running อัตโนมัติ · ดู [phase-10b](./phase-10b-batch-start-grade-repass.md) |
| D21 | Box Grade batches | Box Grade เลือก batch **Planing + Running** · หน้ากรอกอื่น (Record / Rejection / …) ยัง Running อย่างเดียว |
| D22 | Re-pass rejection kg | ฟอร์ม Re-pass มีช่องน้ำหนัก rejection · kg > 0 → insert ตาราง `rejection` (Material Balance D18) · ไม่บังคับกรอก |
| D23 | Sidebar ทุกแผนก | **ทุกคนเห็นหัวแผนกทั้งหมด** ใน sidebar · กลุ่ม **User** เห็นเฉพาะ **admin** · เมนูย่อยโผล่ตาม grant เท่านั้น · ดู [phase-11-configurable-access.md](./phase-11-configurable-access.md) |
| D24 | Ops Dashboard ที่ Planner | Ops Dashboard อยู่เมนู **Planner** อย่างเดียว (`/dashboard/planner`) · แผนกอื่นเข้าได้เมื่อ admin มอบสิทธิ์ (`ops_dashboard`) |
| D25 | Access level | เมนูย่อยมีระดับ **`none` / `read` / `edit`** · read = เปิดดูอย่างเดียว · edit = เขียนได้ · บังคับทั้ง UI และจุดบันทึกข้อมูล |
| D26 | รูปแบบ grant | Admin กำหนดสิทธิ์ได้ 3 แบบ: (1) **รายบุคคล** (2) **ตำแหน่งในแผนก = ชั้นหลัก/default** (3) **ตำแหน่งทั้งระบบ** (ทางเลือกทั้งโรงงาน) · ลำดับชนะ: user > dept+position > position · ไม่มี match = ไม่เห็นเมนู · **มอบและถอนได้** (ถอน = ลบ grant ที่ชั้นนั้น) |
| D27 | Plan ใน Planner | **Production Plan** (`/plan`) อยู่ใต้เมนู **Planner** — ไม่แสดงถัดจาก Home อีก |
| D28 | User บังคับแผนก+ตำแหน่ง | สร้าง/แก้ผู้ใช้ต้องมี **department + position (role)** — เพื่อให้รับสิทธิ์ชั้น dept+position ได้ |
| D29 | Phase 12 ชื่อ | **Phase 12 — API & PWA Security Hardening** — ดู [phase-12-api-pwa-security.md](./phase-12-api-pwa-security.md) |
| D30 | Rate limit storage | เก็บใน **ตาราง Supabase + RPC** — ไม่ใช้ in-memory เป็นหลัก · ไม่เพิ่ม Redis ใน Phase 12 |
| D31 | API รอบแรกที่ harden | `/api/auth/*` · `/api/admin/*` · `/api/setup/bootstrap` (body limit · firewall เบา · rate limit) |
| D32 | CSP รอบแรก | ใช้ **Content-Security-Policy-Report-Only** ก่อน · enforce ทีหลังเมื่อนิ่ง |
| D33 | Idempotency รอบแรก | เฉพาะ **`/api/auth/session`** — ยังไม่ครอบกล่อง / rejection / offline queue |

### D6 / D11 — Excel detail

- **แถวตัวอย่างในไฟล์/brief = แค่ตัวอย่างรูปแบบ** ไม่ใช่รายการค่าที่อนุญาต — ค่าอื่นที่รูปแบบเดียวกันรับได้ทั้งหมด
- Header: trim · case-insensitive · alias เช่น `Need AF` ↔ `Need AF Box`
- ข้อความ / รหัส (Line, Batch, SAP, Orders, FERT, Semi, Customer, Country, Packing, Ink, Roller, Size): **free text** ไม่จำกัดรายการ
- Item Qty / Need AF: **เลขใดก็ได้** ที่เป็นจำนวนเต็มหรือทศนิยม ≤ 2 ตำแหน่ง (เช่น `0.1` · `5` · `20` · `50`) — ไม่แปลงหน่วย
- วันที่: รูปแบบ `DD.MM.YYYY` · `D/M/YYYY` · `DD-MMM-YY` · Excel date — วันเดือนปีใดก็ได้
- Print ว่าง → `U` · Status ว่าง → `Planing` · Status ที่ใช้ได้เฉพาะ `Planing` | `Running` | `Finished`
- Template = canonical English + แถวตัวอย่างรูปแบบ + หมายเหตุ
