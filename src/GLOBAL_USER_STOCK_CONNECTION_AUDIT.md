# Global User Stock Connection Audit

Date: 2026-05-03
Scope: Ammunition Inventory, Reloading Management, reload batch creation, linked reloaded ammunition, checkout ammunition selectors, user ownership/permissions.

## Repository inspected
- GitHub repository inspected: https://github.com/Covrekiko/shooting-records
- Current app files inspected before implementation.

## Root findings

### 1. Disappearing normal-user ammunition
The create path produces user-owned ammunition correctly. Database records created by `geazifilhoamorimferreira@gmail.com` have `created_by` set to that user and are not service-owned.

The visibility problem is in the list/load path: Ammunition Inventory reloads through `loadOwnedAmmunitionWithReloads()`. The previous loader used broad direct entity reads and client-side filtering. For normal users this can return stale/incomplete data or fail due permissions/cache differences, then overwrite the just-created local item so it appears to disappear.

A newly added backend loader `listAmmunitionForUser` was created to align listing with the authenticated user, but runtime logs show the frontend received a 404 on that function immediately after deployment. Therefore the loader needs a safe direct user-scoped fallback so the page does not break while the function endpoint is becoming available.

### 2. Reloaded ammunition visibility
Reload batches are created by `createReloadBatchWithAmmunition`, which does create both:
- `ReloadingSession`
- linked `Ammunition` with `ammo_type: reloaded`, `source_type: reload_batch`, `source_id`, and `reload_session_id`

Potential visibility issue: selectors and secondary ammo components were not all using `loadOwnedAmmunitionWithReloads()`, so some UI paths could miss linked reloaded ammunition or use direct broad entity reads.

### 3. Checkout selector consistency
Target, Clay, and Deer pages already load ammunition through `loadOwnedAmmunitionWithReloads(currentUser)`, then checkout modals filter through `getSelectableAmmunition()`.

`components/scope/UserAmmoSelector` did not use the shared loader. It directly called:
- `base44.entities.Ammunition.list()`
- `base44.entities.ReloadingSession.list()`

This can return different data from Ammunition Inventory and can include or miss reloaded ammo inconsistently.

## Direct entity calls found

### Ammunition
- `pages/settings/Ammunition`: previously direct `Ammunition.filter({ created_by })`; now uses shared loader.
- `lib/ownedAmmunition.js`: direct repository list/filter for offline fallback.
- `components/scope/UserAmmoSelector`: direct `Ammunition.list()` and `ReloadingSession.list()`; needs shared loader.
- `functions/createAmmunitionForUser`: user-scoped `Ammunition.create()`.
- `functions/updateAmmunitionForUser`: service-role get/update with ownership check.
- `functions/deleteAmmunitionForUser`: service-role get/delete with ownership check.
- `functions/createReloadBatchWithAmmunition`: user-scoped `ReloadingSession.create()` and `Ammunition.create()` after service-role component updates.

### Reloading components
- `components/reloading/ComponentManager`: direct `ReloadingComponent.filter/create/update/delete` using current-user filter for list.
- `components/reloading/ReloadBatchForm`: direct `ReloadingComponent.filter` for owned components; direct brass create only from Add Brass inside batch form.
- `components/reloading/AddComponentModal` / `AddBrassModal`: data collection only; parent performs save.
- `functions/createReloadBatchWithAmmunition`: service-role component updates with ownership checks.

### Reloading sessions
- `pages/ReloadingManagement`: direct `ReloadingSession.filter({ created_by })`; edit metadata direct update.
- `functions/createReloadBatchWithAmmunition`: creates reload session and linked ammunition in one backend flow.
- `functions/deleteReloadedAmmunitionWithSessionCleanup`: deletes/restores with ownership checks.

## Admin/user splits found
No separate admin/user ammunition pages were found. Admin-only pages are user-management/admin pages. Ammunition Inventory and Reloading Management are shared feature pages.

## Modals not using shared flow
- `components/scope/UserAmmoSelector` was not using `loadOwnedAmmunitionWithReloads()`.
- `ReloadBatchForm` Add Brass path creates `ReloadingComponent` directly in frontend. This is user-scoped, but it is not a backend shared function. No existing dedicated component-create backend function exists.
- `ComponentManager` creates/updates/deletes reloading components directly in frontend. This is currently one shared UI path for all users.

## Selector not using shared ammo loader
- `components/scope/UserAmmoSelector`

Target/Clay/Deer checkout paths already receive ammunition loaded through `loadOwnedAmmunitionWithReloads()`.

## Minimal fix plan
1. Keep one shared ammunition create/edit/delete flow using existing functions.
2. Make `loadOwnedAmmunitionWithReloads()` robust: use `listAmmunitionForUser` online, but fall back to `Ammunition.filter({ created_by })` if the function is temporarily unavailable.
3. Update `UserAmmoSelector` to use `loadOwnedAmmunitionWithReloads()` so scope/ammo selector data matches Ammunition Inventory.
4. Keep reload batch creation through `createReloadBatchWithAmmunition`.
5. Do not change schemas or protected systems.

## Files to change
- `lib/ownedAmmunition.js`
- `components/scope/UserAmmoSelector`

## Files not to touch
- Entity schemas
- App.jsx routing/auth redirect
- Manifest/service worker
- Base44 config
- Maps/GPS
- PDFs
- Theme/icons/layout
- Records/refund/brass lifecycle unless directly required