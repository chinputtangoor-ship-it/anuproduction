# Phase 10A — Unified Ops Dashboard

> Status: Done · Owner brief 2026-07-22  
> Related: [decisions.md](./decisions.md) (D17–D19) · [roadmap.md](./roadmap.md) · [ui-ux-spec.md](./ui-ux-spec.md)

## Goal

สร้าง **Ops Dashboard ชุด widgets เดียว** (13 ไลน์ H501–H513)  
**อัปเดต D24:** เมนูอยู่ใต้ **Planner** อย่างเดียว (`/dashboard/planner`) · แผนกอื่นเข้าได้เมื่อ admin มอบสิทธิ์ (Phase 11)  
แผนก Warehouse / HR / Account ยังไม่ทำหน้าของตน (Phase 7)

## What changed from the old approach

| เดิม (Phase 5) | ใหม่ (Phase 10A) |
|----------------|------------------|
| Dashboard แยก 3 หน้า + Analytics เป็นของ Post Production | 4 route เรนเดอร์ **OpsDashboard** ชุดเดียว |
| Post Production ที่ `/analytics` | ย้ายไป `/dashboard/post-production` · `/analytics` redirect |
| Scrap % = (ทุก non-AF) / total boxes | **Scrap Rate** = เฉพาะ status `Scrap` / total boxes |
| ไม่มีสูตร kg ของดี/ของเสีย | **Material Balance**: AF net kg vs Rejection kg → Good%/Reject% แยก Line + Batch |
| Line mini-cards ไม่มี Online/Offline | มี **Online** ถ้าไลน์มี batch `Running` · ไม่มี = Offline |
| Top defects จากทุกกล่อง / camera | Top defects จากกล่อง **Sort / PS / Scrap / HFX** เท่านั้น |
| สูตร KPI หลายส่วนอยู่ใน `app/analytics/page.tsx` | ย้ายเข้า `lib/calculations/` |

## Widgets (same set for all 4 departments)

1. Line status Online / Offline (×13)
2. % progress by line (Running · AF vs Need AF Box)
3. KPI strip: Yield Rate · Scrap Rate · Backlog · Running batches · All plans · Planing · Running · Finished
4. Box status by line (current status counts; after re-pass to AF → count as AF)
5. Material Balance (Good / Reject %) by line and by batch
6. Camera Pass Rate by Line
7. Camera Detail Table
8. Batch status by line
9. Due within 7 days
10. Top defects (Sort / PS / Scrap / HFX only)
11. Summarize production line
12. Backlog by Line
13. Re-pass Summary
14. Box awaiting Re-pass (Non-AF)

Filter: `LinePeriodFilter` (line + period + Custom) — same as Phase 9

## Locked formulas

| KPI | Formula |
|-----|---------|
| Yield Rate | AF boxes (filtered) / Σ `need_af_box` of **Running** plans (line-filtered) × 100 |
| Scrap Rate | boxes with `status === "Scrap"` / total filtered boxes × 100 |
| Backlog | sum of latest `total_backlog` per line (filtered) |
| Plan counts | from `production_plan.batch_status` |
| Line Online | ≥1 plan with `batch_status === "Running"` on that line |
| Progress % | AF on Running batches / Need AF of Running plans on line (cap 110%) |
| Material Balance Good kg | Σ `net_weight_kg` where `status === "AF"` |
| Material Balance Reject kg | Σ Rejection `total_kg` |
| Material Balance Good % | Good / (Good + Reject) × 100 · if sum=0 → show em dash |
| Material Balance Reject % | Reject / (Good + Reject) × 100 |
| Material Balance **By line / Overall** | ตามตัวกรอง Line + Period |
| Material Balance **By batch** | นับ**ทั้งแบตช์เสมอ** (กรอง Line ได้ · ไม่ตัด Period) |
| Top defects | parse `defects` CSV on boxes in Sort/PS/Scrap/HFX only · sort desc |
| Awaiting Re-pass | latest row per `batch__box_number` where status ≠ AF |

## Routes

| Department | Route |
|------------|--------|
| Planner | `/dashboard/planner` |
| Quality | `/dashboard/quality` |
| Production | `/dashboard/production` |
| Post Production | `/dashboard/post-production` |
| Legacy | `/analytics` → redirect to post-production |

## Main files

- `components/dashboard/ops/OpsDashboard.tsx` (+ section widgets)
- `lib/calculations/ops-dashboard-kpis.ts` · `material-balance.ts` · `line-online.ts`
- `lib/data/dashboard.ts` · `hooks/useDashboardData.ts`
- `app/dashboard/*/page.tsx` · `app/analytics/page.tsx` (redirect)
- Docs: this file · decisions D17–D19 · roadmap Phase 10A/10B

## Out of scope here → see Phase 10B

- Start batch 2 ways · Box Grade Planing+Running · Re-pass rejection kg  
  → [phase-10b-batch-start-grade-repass.md](./phase-10b-batch-start-grade-repass.md)

## Exit criteria / smoke

- [x] Planner / Quality / Production / Post Production dashboards show the same widget set
- [x] All 13 lines appear in Online/Offline and summary
- [x] Scrap Rate uses Scrap-only (not all non-AF)
- [x] Material Balance matches Good/Reject formula; zero-sum shows `—`
- [x] Box status by line uses latest status per box (re-pass → AF counts as AF)
- [x] `/analytics` redirects to `/dashboard/post-production`
- [x] QC Form untouched
- [x] Skeleton on load · TH/EN labels · no emoji in UI
- [x] Period + Custom filter still works
- [x] `tsc --noEmit` clean
