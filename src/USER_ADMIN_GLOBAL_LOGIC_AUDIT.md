# User/Admin Global Logic Audit

Date: 2026-05-03
Repository inspected: https://github.com/Covrekiko/shooting-records

## Files inspected
- `pages/settings/AmmunitionInventory`
- `pages/settings/Ammunition`
- `pages/settings/Rifles`
- `pages/settings/Shotguns`
- `pages/ReloadingManagement`
- `components/reloading/ReloadBatchForm`
- `components/reloading/ComponentManager`
- `components/reloading/AddComponentModal`
- `components/reloading/AddBrassModal`
- `pages/TargetShooting`
- `pages/ClayShooting`
- `pages/DeerManagement`
- `pages/Records`
- `components/UnifiedCheckoutModal`
- `components/scope/UserAmmoSelector`
- `lib/ownedAmmunition.js`
- `lib/ammoUtils.js` from existing context
- `lib/reloadingDeleteUtils.js` from existing context
- `lib/brassLifecycle.js` usage from inspected files
- `functions/createAmmunitionForUser`
- `functions/updateAmmunitionForUser`
- `functions/deleteAmmunitionForUser`
- `functions/listAmmunitionForUser`
- `functions/createReloadBatchWithAmmunition`
- `functions/deleteReloadedAmmunitionWithSessionCleanup` from existing context
- `functions/deleteSessionRecordWithRefund`
- `functions/restoreSessionStock`
- `context/ModulesContext.jsx`
- `components/ModuleGate`
- `components/Navigation`
- `pages/admin/Users`
- `pages/Users` from existing context
- Entity schemas from context: Ammunition, ReloadingComponent, ReloadingSession, SessionRecord

## Every admin/user split found

### Confirmed split 1: core backend functions allowed admin ownership bypass
The normal UI loads current-user data only, but these backend functions allowed `user.role === 'admin'` to operate on records not owned by the current admin user if an ID was supplied directly:
- `functions/updateAmmunitionForUser`
- `functions/deleteAmmunitionForUser`
- `functions/createReloadBatchWithAmmunition` component ownership check
- `functions/deleteSessionRecordWithRefund`
- `functions/restoreSessionStock`

This is not a separate UI, but it is a backend logic split. Core feature functions should use current-user ownership for both admin and normal users. Admin global management must stay inside admin tools only.

### Confirmed split 2: ammo selector was not using the same loader
`components/scope/UserAmmoSelector` previously used direct `Ammunition.list()` and `ReloadingSession.list()`, while checkout pages and inventory used `loadOwnedAmmunitionWithReloads()`. This could show different ammo for normal users.

This was already corrected to use `loadOwnedAmmunitionWithReloads(currentUser)`.

### Not found: separate admin/user core pages
No separate `AddAmmunitionAdmin`, `AddAmmunitionUser`, `ReloadingAdmin`, or `ReloadingUser` pages were found.

## Every direct entity call found

### Ammunition
- `pages/settings/AmmunitionInventory`: create/edit/delete use backend functions; list uses `loadOwnedAmmunitionWithReloads()`.
- `pages/settings/Ammunition`: create/edit/delete use backend functions; list uses `loadOwnedAmmunitionWithReloads()`.
- `components/scope/UserAmmoSelector`: now uses `loadOwnedAmmunitionWithReloads()`.
- `functions/listAmmunitionForUser`: service-role read, scoped to current user.
- `functions/createReloadBatchWithAmmunition`: creates linked reloaded ammo.

### ReloadingComponent
- `components/reloading/ComponentManager`: direct create/update/delete in one shared page; list is filtered by `created_by: currentUser.email`.
- `components/reloading/ReloadBatchForm`: direct current-user component/rifle filters; inline Add Brass direct create.
- `functions/createReloadBatchWithAmmunition`: service-role component updates with ownership checks.

### ReloadingSession
- `pages/ReloadingManagement`: direct list by `created_by: user.email`; edit metadata direct update; new batch creation blocked in favor of `createReloadBatchWithAmmunition`.
- `functions/createReloadBatchWithAmmunition`: one backend reload batch create flow.

### Records / refunds
- `pages/Records`: normal records page loads only `SessionRecord.filter({ created_by: currentUser.email })`; only admin calls `User.list()` for user display metadata.
- `functions/deleteSessionRecordWithRefund`: service-role restore/delete with ownership checks.
- `functions/restoreSessionStock`: service-role restore with ownership checks.

## Modals not using shared flow
- Add Ammunition modals/pages use `createAmmunitionForUser`.
- Ammo edit/delete use `updateAmmunitionForUser` and `deleteAmmunitionForUser`.
- Reload batch uses `createReloadBatchWithAmmunition`.
- Reloading components/brass still use direct entity calls from `ComponentManager` and `ReloadBatchForm` inline Add Brass. This is one shared UI path and current-user scoped by normal Base44 ownership, but there is no dedicated component backend function.

## List/filter mismatches found
- Fixed: `UserAmmoSelector` had its own direct list logic instead of shared loader.
- `AmmunitionInventory`, `Ammunition`, `TargetShooting`, `ClayShooting`, and `DeerManagement` all use `loadOwnedAmmunitionWithReloads()`.
- `Records` loads only current-user records.
- `ModuleGate` currently does not block modules; `isEnabled()` returns true and `ModuleGate` returns children.

## Why normal-user ammunition disappears
The record was not created with the wrong owner. The normal-user record checked earlier was owned by `geazifilhoamorimferreira@gmail.com`, not service-owned/admin-owned.

The disappearing issue came from inconsistent loading: UI save could succeed, but a reload path using broad/direct reads or a temporarily unavailable backend function could replace local state with an incomplete list. `loadOwnedAmmunitionWithReloads()` now uses `listAmmunitionForUser` with a current-user fallback.

## Why reloaded ammunition did not show reliably
`createReloadBatchWithAmmunition` creates linked ammunition, but not every selector used the same loader. `UserAmmoSelector` used direct `Ammunition.list()` plus synthetic reload-session entries, which could diverge from Ammunition Inventory. It now uses the same loader.

## Ownership status
- Normal ammunition creation uses `base44.entities.Ammunition.create()` as the logged-in user, so it is current-user owned.
- Reload batch creation creates `ReloadingSession` and linked `Ammunition` through the request user context, so they are current-user owned.
- Component updates in reload batch use service role but are guarded by ownership checks.
- Records/refunds use service role but are guarded by ownership checks.

## Minimal fix plan
1. Keep one shared UI and loader system.
2. Keep all ammunition add/edit/delete paths on existing backend functions.
3. Lock core backend functions to current-user ownership for admins and normal users alike.
4. Keep admin-only global/user management separate.
5. Do not change schemas, routing, service worker, manifest, maps/GPS, PDFs, theme, or UI layout.

## Files to edit
- `functions/updateAmmunitionForUser`
- `functions/deleteAmmunitionForUser`
- `functions/createReloadBatchWithAmmunition`
- `functions/deleteSessionRecordWithRefund`
- `functions/restoreSessionStock`

## Files not to touch
- Entity schemas/database fields/global stock model
- `App.jsx`
- manifest/service worker/Base44 config
- maps/GPS
- PDFs
- theme/icons/layout