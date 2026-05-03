# Armory Counter Delete Refund Audit

## Files inspected
- `lib/ammoUtils.js`
- `functions/deleteSessionRecordWithRefund`
- `functions/restoreSessionStock`
- `pages/Records`
- `components/RecordsSection`
- `components/RecordDetailModal` context via `RecordsSection`
- `pages/DeerManagement`
- `pages/TargetShooting`
- `pages/ClayShooting`
- `pages/settings/Rifles`
- `pages/settings/Shotguns`
- `pages/AmmoSummary`
- GitHub repository structure and matching source paths

## Current create / increment path
- Target Shooting increments each selected rifle in `pages/TargetShooting` by `rifles_used[].rounds_fired` using `Rifle.total_rounds_fired`.
- Deer Management increments the selected rifle in `pages/DeerManagement` by explicit `rounds_fired`.
- Clay Shooting increments the selected shotgun in `pages/ClayShooting` by `rounds_fired` using `Shotgun.total_cartridges_fired`.
- Cleaning “since cleaning” is derived in `pages/AmmoSummary` as:
  - rifle: `total_rounds_fired - rounds_at_last_cleaning`
  - shotgun: `total_cartridges_fired - cartridges_at_last_cleaning`

## Current delete / reversal path
- `pages/Records` and `components/RecordsSection` both load the fresh `SessionRecord`, refund ammunition through `refundAmmoForRecord`, then call `reverseArmoryCountersForRecord` from `lib/ammoUtils.js` before soft-deleting.
- Backend functions also contain older/alternate restore paths:
  - `restoreSessionStock`
  - `deleteSessionRecordWithRefund`

## Missing or incorrect reversal by category
- Target Shooting: reversal exists, but it also subtracts `rounds_at_last_cleaning`, which corrupts the cleaning baseline.
- Clay Shooting: reversal exists, but it also subtracts `cartridges_at_last_cleaning`, which corrupts the cleaning baseline.
- Deer Management: reversal exists, but it uses `total_count || rounds_fired`, so a deer record with 1 animal and 50 rounds only reverses 1 instead of 50.

## Exact root cause
1. Deer Management delete reversal chooses `total_count` before `rounds_fired`, even though checkout stores the actual shots in `rounds_fired`.
2. The reversal helper changes cleaning baseline fields (`rounds_at_last_cleaning`, `cartridges_at_last_cleaning`). These fields represent the total count at last cleaning and should not be reduced during record deletion. Since-cleaning automatically returns to the previous value when total rounds/cartridges are reduced.
3. `components/RecordsSection` did not mark `armoryCountersReversed` / `countersReversedAt` after a successful reversal, so double-delete protection was incomplete in that delete path.

## Minimal fix plan
- Update `reverseArmoryCountersForRecord` in `lib/ammoUtils.js` to:
  - subtract only `total_rounds_fired` / `total_cartridges_fired`
  - leave cleaning baseline fields unchanged
  - use `rounds_fired` before `total_count` for Deer Management
  - return useful reversal details and fail clearly on counter update errors
- Update `components/RecordsSection` soft delete flags to include `armoryCountersReversed` and `countersReversedAt`.
- Update `functions/deleteSessionRecordWithRefund` Deer logic to use `rounds_fired` before `total_count` for consistency if that backend function is used.

## Files that will not be touched
- `App.jsx`
- routing/auth files
- manifest
- service worker
- Base44 config
- maps/GPS/tracking service
- PDFs
- calibre database
- reload batch creation
- UI/theme/icon/layout files unrelated to deletion