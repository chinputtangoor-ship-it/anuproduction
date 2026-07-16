---
name: anu-qa
description: >-
  QA gate for ANU Production before merge, deploy, or phase completion.
  Use when user says QA, test, ตรวจสอบ, smoke test, regression, phase gate,
  security review, or ก่อน deploy.
---

# ANU Production QA

Follow the full checklist and report template in:

**`docs/qa-skill.md`**

Also read settled decisions in `docs/decisions.md`, current phase in `docs/roadmap.md`, UX in `docs/ui-ux-spec.md`, and defects in `docs/defect-list.md`.

## Quick procedure

1. Run automated: `npx tsc --noEmit` · `npm run lint` · `npm run build`
2. Review diff against Checklists in `docs/qa-skill.md` (especially QC Form freeze, per-box grade handoff, audit stamps from user id, lucide-only, plan ACL, defect-list.md)
3. Severity P0/P1 → block deploy
4. Output the QA Report template from `docs/qa-skill.md` in plain language for the shop-floor owner
