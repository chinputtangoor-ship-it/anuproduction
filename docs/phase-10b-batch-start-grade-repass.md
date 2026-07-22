# Phase 10B — Batch start · Box Grade · Re-pass kg

> Status: Done · 2026-07-22  
> Related: [decisions.md](./decisions.md) (D20–D22) · [roadmap.md](./roadmap.md) · [phase-10a](./phase-10a-unified-ops-dashboard.md)

## Goal

1. **Start batch ได้ 2 ทาง**
   - ปุ่ม Start ในแผน (ของเดิม)
   - QC เกรด **กล่องที่ 1** ของ batch ที่ยังเป็น Planing → ระบบตั้งเป็น Running อัตโนมัติ
2. **Box Grade** เลือก batch ได้ทั้ง **Planing** และ **Running**
3. **Re-pass** มีช่องน้ำหนัก rejection → บันทึกลงตาราง `rejection` เพื่อ Material Balance (D18)

## What changed from before

| เดิม | ใหม่ |
|------|------|
| Box Grade / ProductionFlowShell เห็นเฉพาะ Running | Box Grade เห็น Planing + Running (หน้าอื่นยัง Running อย่างเดียว) |
| Start batch ได้แค่จากแผน | + auto-start เมื่อเกรดกล่อง #1 บน Planing |
| Operator อัปเดตแผนไม่ได้ (RLS) | RPC `start_batch_from_first_grade` (SECURITY DEFINER) |
| Re-pass ไม่มีน้ำหนัก rejection | มีช่อง Rejection kg → insert `rejection` เมื่อ kg > 0 |

## Rules

| Rule | Detail |
|------|--------|
| Auto-start | หลัง `boxes` insert สำเร็จ และ `box_number === 1` → เรียก RPC start ถ้ายัง Planing |
| Idempotent | ถ้า batch เป็น Running แล้ว → RPC ไม่เปลี่ยนอะไร · เกรดยังสำเร็จ |
| Plan Start | ใช้ helper ร่วม · อัปเดตเฉพาะ `batch_status = Planing` → Running · stamp `updated_by` |
| Re-pass kg | ไม่บังคับกรอก · ถ้าว่างหรือ 0 ไม่ insert rejection · ถ้า > 0 insert แถวใหม่ใน `rejection` |
| QC Form | **ห้ามแตะ** |

## Files

- `supabase/migrations/20260722120000_phase10b_start_batch_rpc.sql`
- `lib/data/plan-batch.ts` · `lib/data/production.ts`
- `components/ProductionFlowShell.tsx`
- `app/quality/grade/page.tsx` · `app/plan/page.tsx` · `app/repass/page.tsx`
- Docs: this file · decisions D20–D22 · roadmap

## Exit criteria

- [x] Box Grade เห็น batch Planing และ Running
- [x] เกรดกล่อง #1 บน Planing → batch เป็น Running (RPC สำหรับ operator)
- [x] ปุ่ม Start ในแผนใช้ helper ร่วม
- [x] Re-pass บันทึก rejection kg ได้ · โผล่ใน Material Balance
- [x] QC Form ไม่ถูกแก้
- [x] `tsc --noEmit` clean (ตรวจตอนส่งมอบ)

**Deploy:** รัน `20260722120000_phase10b_start_batch_rpc.sql` บน Supabase ก่อนใช้ auto-start
