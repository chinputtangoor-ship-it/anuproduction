# Agreed Decisions — ANU Production

> บันทึกข้อตกลงกับ owner · อัปเดตล่าสุด: 2026-07-16  
> เอกสารหลัก: [roadmap.md](./roadmap.md) · [ui-ux-spec.md](./ui-ux-spec.md) · [qa-skill.md](./qa-skill.md)

| # | หัวข้อ | มติ |
|---|--------|-----|
| D1 | Defect เมื่อไม่ต้องเลือก | ใช้กฎเดิมทั้งกลุ่ม `STATUSES_WITHOUT_DEFECT` = **AF, HP, HUP** — grade อื่นต้องเลือก defect |
| D2 | รายการ Defect | ตาม [defect-list.md](./defect-list.md) — แทน `DEFECT_LIST` เก่าทั้งชุดใน Phase 2 |
| D3 | Box Grade → Post Production | QC **ตรวจทีละกล่อง** · เฉพาะกล่องที่กำหนดเกรดแล้วถึงโผล่ Post Production · กล่องที่ยังไม่ตรวจ **ไม่แสดง** |
| D4 | ผู้บันทึกอัตโนมัติ | `Check by` / `Weight by` / `Inspector` และ **การบันทึกอื่นทั้งหมด** stamp จาก **user id ที่ login อยู่** — ห้ามให้พิมพ์ชื่อเอง |
| D5 | แผนก vs Role | `department` เป็น **ฟิลด์เพิ่ม** คู่กับ `role` เดิม — ไม่แทนที่ role |
| D6 | Excel Plan | คอลัมน์ครบตามฟอร์มแผนปัจจุบันทั้งชุด (รวม ink / roller ฯลฯ) |
| D7 | PWA / favicon | ใช้โลโก้ใน `public/icons/` (`icon.svg`, `icon-192.png`, `icon-512.png`) |
| D9 | Menu ACL | **admin / manager** เห็นทุกแผนก · **supervisor** เห็นเฉพาะแผนกตน (ต้องมี department) · role อื่นตาม role + department |
| D10 | Box Grade handoff | QC insert กล่อง (grade/defect, น้ำหนักว่าง) → Post Production เห็นเฉพาะกล่องที่รอชั่ง (`net_weight_kg` null) |
