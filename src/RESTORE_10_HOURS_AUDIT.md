# Restore 10 Hours Audit

## Files inspected
- GitHub repository: https://github.com/Covrekiko/shooting-records
- GitHub commit list via GitHub API
- Working-window raw files around commit `35d62d9f05a4828c47437cd8062751dff213711b`
- `pages/ReloadingManagement`
- `pages/settings/AmmunitionInventory`
- `lib/reloadingDeleteUtils.js`
- `lib/ammoUtils.js`
- `lib/brassLifecycle.js`
- `functions/deleteSessionRecordWithRefund`
- `functions/restoreSessionStock`
- `functions/createReloadBatchAmmunition`
- `components/reloading/ReloadBatchForm`
- `components/reloading/ComponentManager`
- `components/RecordsSection`
- `pages/Records`
- `components/RecordDetailModal`

## Relevant changes found from last 10 hours
- Older working `ReloadingManagement` deleted reload batches inline: it found linked ammo, blocked if fired usage existed, deleted linked ammo, restored reloading component quantities from `ReloadingSession.components`, then deleted the session.
- Current code moved reload deletion into `lib/reloadingDeleteUtils.js`.
- Current record deletion paths use `lib/ammoUtils.js` and soft-delete records.
- Current `ammoUtils.restoreAmmoStock` catches and swallows stock-restore errors, so callers can continue deleting records even if stock did not restore.
- Recent reload delete helper added double-restore guards, but `alreadyRestored` can be tripped by prior zero-quantity brass movement logs, causing stock restore to be skipped even when no real restoration happened.

## Last known working logic found
- Reload batch delete restored component quantities from the `ReloadingSession.components` snapshot.
- It used linked ammo stock only to decide usage/remaining quantity.
- Record delete restored ammunition stock before soft-deleting the record.
- Armory counters were reversed before delete completion.

## Current broken delete paths
- `ReloadingManagement.handleDelete` calls `deleteReloadBatchWithRestore`.
- `AmmunitionInventory.handleDelete` calls `deleteReloadBatchWithRestore` for reloaded ammunition.
- `Records` and `RecordsSection` call `refundAmmoForRecord` and `reverseArmoryCountersForRecord` before soft delete.
- `refundAmmoForRecord` depends on `restoreAmmoStock`, but `restoreAmmoStock` can fail internally and still allow delete flow to continue.

## Exact root cause
1. Reloading restore can be skipped by `alreadyRestored` because it treats any `restored_after_batch_delete` brass movement log as proof of restoration, even logs with quantity `0` from failed/partial previous attempts.
2. Record ammunition refund errors are swallowed in `restoreAmmoStock`, so record deletion can proceed even when ammunition stock was not actually restored.
3. Linked reload ammunition can be missing because older/current direct ammunition delete paths could hard-delete the ammo before the reload session delete path used it; the helper then needed to rely on the reload session snapshot.

## Minimal revert/fix plan
- Do not revert the whole app.
- Keep the current shared reload delete helper, but restore old working behaviour: use `ReloadingSession.components` snapshot when linked ammo is missing and no usage is found.
- Fix double-restore detection so zero-quantity logs do not block real stock restoration.
- Make `restoreAmmoStock` return/throw failure instead of swallowing errors, so record delete cannot continue when stock did not restore.
- Keep existing brass lifecycle helpers and do not alter schema/global stock model.

## Files that will be changed
- `RESTORE_10_HOURS_AUDIT.md`
- `lib/reloadingDeleteUtils.js`
- `lib/ammoUtils.js`

## Files that will not be touched
- `App.jsx`
- Auth redirect logic
- Routing
- Manifest
- Service worker
- Base44 config
- Maps/GPS
- PDF export logic
- Theme/navigation
- Entity schemas
- Global database model