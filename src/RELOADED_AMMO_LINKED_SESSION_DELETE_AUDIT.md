# Reloaded Ammo Linked Session Delete Audit

## Files inspected
- `pages/settings/AmmunitionInventory`
- `pages/ReloadingManagement`
- `lib/reloadingDeleteUtils.js` (not present in current app)
- `lib/ammoUtils.js`
- `lib/brassLifecycle.js`
- `components/reloading/ReloadBatchForm`
- `entities/Ammunition.json`
- `entities/ReloadingSession.json`
- `entities/ReloadingComponent.json`
- `entities/BrassMovementLog.json`
- Current GitHub repository structure: `https://github.com/Covrekiko/shooting-records`

## Current ammo delete path
- `pages/settings/AmmunitionInventory` uses `base44.entities.Ammunition.delete(deletingItem.id)` directly.
- It does not check whether the ammunition is reloaded.
- It does not call a shared reload batch restore/delete helper.
- Therefore linked `ReloadingSession` records are left behind in Reloading Session History.

## Current reload session delete path
- `pages/ReloadingManagement` has inline delete logic in `handleDelete`.
- It finds linked ammo, calculates remaining rounds, restores components/brass, deletes linked ammunition, then deletes the `ReloadingSession`.
- This logic is not shared with Ammunition Inventory, so deleting ammo first bypasses it.

## Link fields found
Reloaded ammunition stores stable links:
- `ammo_type: "reloaded"`
- `source_type: "reload_batch"`
- `source_id: ReloadingSession.id`
- `reload_session_id: ReloadingSession.id`
- `batch_number`
- `notes` containing `reload_batch:<ReloadingSession.id>`

ReloadingSession stores:
- `id`
- `batch_number`
- `rounds_loaded`
- `components[]`
- brass fields including `brass_component_id`, `brass_use_type`, `brass_new_quantity_used`, `brass_used_quantity_used`

## Why linked session remains
The direct ammunition delete in `AmmunitionInventory` removes only the ammo item. It never resolves or deletes/marks the linked `ReloadingSession`, so the reloading history still shows an orphan batch.

## Minimal fix plan
- Create `lib/reloadingDeleteUtils.js` as the shared helper.
- Move the existing reload batch delete/restore behaviour into that helper.
- Allow the helper to start from either `ammunitionId` or `reloadSessionId`.
- Resolve linked sessions using `reload_session_id`, `reload_batch_id`, `source_id`, notes, batch number, and matching ammo fields.
- Restore only remaining/unfired quantity from `Ammunition.quantity_in_stock`.
- Restore primer, powder, bullet, and brass safely using the existing brass lifecycle utilities.
- Archive linked reloaded ammo instead of hard deleting it, preserving old records that reference it.
- Mark the linked `ReloadingSession` deleted/restored and hide deleted/restored sessions from history.
- Add idempotency so components/brass are not restored twice.
- Wire `AmmunitionInventory` and `ReloadingManagement` to the shared helper.

## Files that must not be touched
- `App.jsx`
- routing/auth files
- manifest
- service worker
- Base44 config
- maps/GPS
- PDFs
- mobile safe-area code
- calibre database
- unrelated UI/theme/icon/layout files