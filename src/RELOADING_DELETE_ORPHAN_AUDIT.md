# Reloading Delete Orphan Audit

## Files inspected
- GitHub repository root: https://github.com/Covrekiko/shooting-records
- `pages/ReloadingManagement`
- `lib/reloadingDeleteUtils.js`
- `components/reloading/ReloadBatchForm`
- `pages/settings/AmmunitionInventory`
- `lib/brassLifecycle.js`
- `lib/ammoUtils.js`
- `functions/createReloadBatchAmmunition`
- `functions/deleteSessionRecordWithRefund`
- Entity schemas from current app context: `Ammunition`, `ReloadingSession`, `ReloadingComponent`, `BrassMovementLog`, `AmmoSpending`

## Exact warning source
The warning is generated in `lib/reloadingDeleteUtils.js` inside `deleteReloadBatchWithRestore` when no linked `Ammunition` record is found and the session has no `remaining_unfired_at_delete` snapshot:

`Linked ammunition is missing, so remaining stock could not be calculated automatically.`

`pages/ReloadingManagement` then displays that warning with `alert(result.warnings.join('\n'))`, creating a dead-end user experience.

## Why linked ammunition is missing
The delete helper relied on finding an `Ammunition` row to know `quantity_in_stock`. If the ammo row was hard-deleted, hidden by archive/delete flags, or created without enough reverse links, the helper could not calculate remaining unfired rounds even though `ReloadingSession` still contains the batch snapshot (`rounds_loaded`, `components[]`, brass split, costs, batch number).

## Current delete paths
1. Reloading session delete: `pages/ReloadingManagement` → `deleteReloadBatchWithRestore({ reloadSessionId })`.
2. Reloaded ammo delete from inventory: `pages/settings/AmmunitionInventory` → `deleteReloadBatchWithRestore({ ammunitionId })`.
3. Shooting record delete/refund: `functions/deleteSessionRecordWithRefund` and `lib/ammoUtils.js` restore fired ammo and brass movements separately.

## Broken path causing orphan session
When `ReloadingSession` exists but linked `Ammunition` is missing, the helper set `remainingUnfired = 0`, added the warning, then continued to mark the reload session as deleted/restored. This could leave components unrestored and create or preserve orphan-like delete state.

## Minimal fix plan
- Keep all protected app systems untouched.
- Make linked ammo lookup check all known reverse-link fields, including session-side `ammunition_id`/`linked_ammunition_id`.
- If ammo exists, keep using `quantity_in_stock` for proportional restore.
- If ammo is missing and no fired evidence exists, restore the full batch from the `ReloadingSession` snapshot.
- If ammo is missing and fired evidence exists, return a manual-restore-required result instead of deleting silently or showing a dead-end alert.
- Add a small modal in `ReloadingManagement` for entering remaining unfired rounds only when manual restore is needed.
- Store forward links going forward in `createReloadBatchAmmunition`: `reload_session_id`, `reload_batch_id`, `source_id`, and update the `ReloadingSession` with `ammunition_id`, `linked_ammunition_id`, and `ammo_created_quantity`.
- Prevent double restore by keeping existing restored/deleted guards and avoiding component restore when already restored.

## Files that must not be touched
- `App.jsx`
- Auth redirect logic
- Routing
- Manifest/service worker
- Base44 config
- Maps/GPS logic
- PDF export logic
- Unrelated record UI
- Entity schemas unless explicitly approved