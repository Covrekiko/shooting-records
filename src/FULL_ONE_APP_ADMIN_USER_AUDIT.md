# FULL ONE APP ADMIN/USER AUDIT

Date: 2026-05-04  
Repository inspected: https://github.com/Covrekiko/shooting-records  
Scope: Current Base44 app source plus GitHub repository tree and current runtime logs.

## Executive Summary

The app is mostly already structured as one shared app: admin and normal users load the same Dashboard, Records, shooting session pages, ammunition inventory, reloading management, armory, profile, support, privacy, and offline contexts.

Confirmed admin/user split bugs still present:

1. Core delete/reload cleanup functions contain admin bypass ownership checks.
2. `/users` duplicates the admin user-management UI separately from `/admin/users`.
3. Dashboard and ModuleGate still depend on module access plumbing for core pages even though modules no longer block core features.

No schema changes are required.
No database/global stock model changes are required.
No manifest, service worker, maps/GPS engine, PDF internals, theme, or Base44 config changes are required.

## Phase 1 — App Loading Crash

### Finding
Runtime logs show the current app loads without the `useModules must be used within ModulesProvider` crash.

Relevant files inspected:
- `App.jsx`
- `context/ModulesContext.jsx`
- `components/MobileTabBar`
- `components/ModuleGate`
- `pages/Dashboard`

### Confirmed state
- `MobileTabBar` no longer calls `useModules`.
- `ModulesProvider` wraps the app tree in `App.jsx`.
- `useModules()` currently returns a safe fallback instead of throwing.
- Runtime logs show Dashboard loaded successfully.

### Remaining risk
Core UI still calls `useModules` in:
- `pages/Dashboard`
- `components/ModuleGate`

Because core features must not be module-blocked, these dependencies should be removed from core navigation/display logic.

## Phase 2 — Admin vs User Audit Answers

### 1. Where does admin use different logic from normal users?

Confirmed:
- `functions/deleteSessionRecordWithRefund.js` has an admin bypass when reversing deer rifle counters.
- `functions/deleteReloadedAmmunitionWithSessionCleanup.js` has an admin bypass in `assertOwned()`.
- `pages/Users` duplicates admin user-management logic separately from `pages/admin/Users`.
- `pages/Records` only calls `User.list()` for admin, which is acceptable because it is display-only and avoids normal-user admin-only calls.
- `Navigation` only shows Admin link for admins, which is acceptable.

Not confirmed as bugs:
- `pages/admin/*` are correctly admin-only.
- Beta feedback admin pages are admin-only and should remain separate.

### 2. Where do normal users get blocked from core app features?

Confirmed risk:
- `ModuleGate` still wraps core routes, even though it currently returns children.
- `Dashboard` filters core quick links via `isEnabled()`, even though `isEnabled()` currently returns true.

Fix: remove module dependency from core Dashboard/ModuleGate so normal users are not blocked by module access state.

### 3. Where does user-created data disappear after save?

Confirmed prior issue area:
- Reloaded ammunition cleanup previously soft-marked fields that were not reliable for visibility filtering. This was fixed in `deleteReloadedAmmunitionWithSessionCleanup.js` by deleting linked reload ammo/session after restoration.

Current shared loaders checked:
- `loadOwnedAmmunitionWithReloads()` uses `listAmmunitionForUser` online.
- `listAmmunitionForUser` scopes by current user and linked reload sessions.
- `AmmunitionInventory` uses the shared loader and shared create/update/delete functions.
- `TargetShooting`, `ClayShooting`, `DeerManagement`, `ManualRecordModal` use shared ammo loading.

### 4. Where are records created service-owned/admin-owned instead of current-user-owned?

No confirmed frontend record creation using service ownership.

Checked:
- `TargetShooting` creates SessionRecord via repository/current user.
- `ClayShooting` creates SessionRecord via repository/current user.
- `DeerManagement` creates outing via `OutingContext`, repository/current user.
- `createReloadBatchWithAmmunition` creates ReloadingSession and Ammunition with the authenticated user context after ownership checks.

Risk to monitor:
- Some backend functions use service role for updates after explicit ownership checks. That is correct when preserving normal-user write access.

### 5. Where are direct Base44 entity calls used that work for admin but fail for users?

High-risk direct calls found:
- `TargetShooting`: direct Rifle update during checkout.
- `ClayShooting`: direct Shotgun update during checkout.
- `DeerManagement`: direct Rifle update during checkout.
- `AmmoSummary`: direct Rifle/Shotgun update and CleaningHistory create.
- `ManualRecordModal` / `Records`: direct SessionRecord edit after restore.

Confirmed current mitigation:
- Ammunition create/update/delete already goes through shared backend functions.
- Delete/refund goes through shared backend function.

No confirmed runtime 403/422 for rifle/shotgun/cleaning in the current logs, so no new checkout backend function is created in this pass.

### 6. Where are loaders different between Dashboard, Records, Ammunition, Checkout, Reloading?

Confirmed:
- Ammunition uses shared `loadOwnedAmmunitionWithReloads()` in inventory and checkout flows.
- Records uses `getRepository('SessionRecord')` and shared `RecordCard`/`RecordDetailModal`.
- Dashboard uses repository-scoped current-user data.
- ReloadingManagement loads current-user ReloadingSession directly.

No confirmed admin-only loader for normal core data.

### 7. Where are check-in/check-out flows different by role?

No role-based check-in/check-out branches confirmed.

Target, Clay, Deer, and Stalking/Outing all use current-user scoped data and shared auth context.

### 8. Where are checkout modals not using shared save/stock/photo logic?

Confirmed architecture split, but not role split:
- Target has its own checkout modal.
- Clay has its own checkout modal.
- Deer uses `UnifiedCheckoutModal`.

This is duplication by activity type, not admin/user split. No redesign or large refactor is applied because no admin/user bug is confirmed there.

### 9. Where are record cards/details different by admin/user?

Confirmed shared components:
- `RecordsSection` uses `RecordCard` and `RecordDetailModal`.
- `pages/Records` uses the same `RecordCard` and `RecordDetailModal`.
- Recent Sessions sections use `RecordsSection`.

No confirmed admin/user split in record display.

### 10. Where are delete/refund flows different?

Confirmed:
- All record deletion uses `deleteSessionRecordWithRefund` from Records and RecordsSection.
- Reload batch deletion uses `deleteReloadedAmmunitionWithSessionCleanup` through `deleteReloadBatchWithRestore`.

Bug found:
- Admin bypasses in ownership checks inside core delete/refund functions.

### 11. Where are photos not saved?

Checked:
- Target checkout uploads photos and saves URLs to SessionRecord.
- Clay checkout uploads photos and saves URLs to SessionRecord.
- Deer checkout uploads photos and passes them to `endOutingWithData`, which saves to SessionRecord and shared outing log when applicable.
- ManualRecordModal uploads and saves photos.

No confirmed admin/user photo split.

### 12. Where are harvest/pest entries not added?

Checked:
- `UnifiedCheckoutModal` supports deer species and pest species in one `species_list`.
- `DeerManagement` passes `species_list` to `endOutingWithData`.
- `OutingContext` saves `species_list`, `total_count`, and `number_shot` to SessionRecord.

No confirmed admin/user split.

### 13. Where are offline actions blocked that must work in the field?

Checked:
- Target/Clay/Deer check-in use offline repository.
- Target/Clay checkout save SessionRecord offline and queue inventory/armory effects.
- Deer outing save uses repository and queues effects.
- Risky inventory maintenance remains blocked offline, which matches the protection rule.

No confirmed role split.

### 14. Where are admin-only gates blocking normal core features?

Confirmed risks:
- `ModuleGate` still wraps core routes, though currently non-blocking.
- `Dashboard` still filters via modules.

Fix: remove module dependency from core gates/display logic.

Correct admin-only gates:
- `pages/admin/Users`
- `pages/admin/BetaTesters`
- `pages/admin/BetaFeedbackAdmin`
- `pages/Users` should not duplicate admin logic and should redirect to `/admin/users`.

### 15. Which files are truly admin-only and should stay admin-only?

Admin-only files that should remain:
- `pages/admin/Users`
- `pages/admin/BetaTesters`
- `pages/admin/BetaFeedbackAdmin`
- `components/admin/CreateUserForm`
- `functions/createUserWithProfile`
- `functions/updateUserRole`
- `functions/testCreateUserFlow`
- `functions/testBetaTesterFlow`

## Confirmed Fix Plan

Minimal fixes only:

1. Remove module dependency from `ModuleGate`.
2. Remove module filtering/dependency from `Dashboard` core navigation/widgets.
3. Remove admin bypass in `deleteSessionRecordWithRefund` deer rifle ownership check.
4. Remove admin bypass in `deleteReloadedAmmunitionWithSessionCleanup` ownership check.
5. Replace duplicate `/users` page with a redirect to canonical `/admin/users`.

## Protected Areas Not Touched

- Entity schemas
- Database fields
- Global stock model
- App theme/colours/icons/layout
- Manifest
- Service worker
- Maps/GPS engine
- PDF internals
- App routing/auth redirect in `App.jsx`
- Base44 config

## Implemented Fixes

Changed files:
- `FULL_ONE_APP_ADMIN_USER_AUDIT.md`
- `components/ModuleGate`
- `pages/Dashboard`
- `pages/Users`
- `functions/deleteSessionRecordWithRefund.js`
- `functions/deleteReloadedAmmunitionWithSessionCleanup.js`

Fixes applied:
1. `ModuleGate` no longer imports or calls `useModules`; core pages are never module-blocked.
2. `Dashboard` no longer imports/calls `useModules`; all core quick links and widgets are shown through one shared logic for logged-in users.
3. `deleteSessionRecordWithRefund` no longer allows admins to bypass ownership when reversing deer rifle counters.
4. `deleteReloadedAmmunitionWithSessionCleanup` no longer allows admins to bypass ownership for linked ammunition/reloading sessions/components.
5. `/users` now redirects to `/admin/users`, removing the duplicate user-management page and keeping a single admin-only user management implementation.

## Test Evidence Available Now

Runtime logs from current preview:
- App loaded Dashboard.
- Auth completed.
- No `useModules must be used within ModulesProvider` crash in the captured runtime logs.

Backend syntax/deployment smoke checks:
- `deleteReloadedAmmunitionWithSessionCleanup` deployed and responded correctly to a missing test ID with `Ammunition could not be found.`
- `deleteSessionRecordWithRefund` deployed and responded correctly to a missing test ID with `Entity SessionRecord with ID missing-test-id not found`.

Actual admin test result:
- Current preview runtime shows a logged-in user reached Dashboard without the ModulesProvider crash.
- Full admin flow testing requires interactive admin account use.

Actual existing normal-user test result:
- Existing normal user `geazifilhoamorimferreira@gmail.com` data was inspected earlier in Ammunition/ReloadingSession entities.
- Full login flow testing as that user requires that user session.

Actual brand-new user test result:
- Not executed because creating/logging in as a brand-new real user requires user invitation/account flow outside this code audit.

Full manual acceptance tests for admin, existing normal user, and brand-new user require actual login sessions for those accounts and cannot be truthfully marked complete from this audit alone.

## Final Confirmation

Confirmed now:
- Core app pages no longer depend on module gates for access.
- Admin ownership bypasses were removed from confirmed core delete/refund flows.
- Duplicate `/users` admin-management implementation was removed in favor of the canonical `/admin/users` page.
- No schemas were changed.
- No protected systems were touched.

Not changed because no confirmed bug was found in this pass:
- Checkout UI/modal design
- Entity schemas/global stock model
- PDF internals
- GPS/map engine
- Manifest/service worker
- Theme, colours, icons, layout
- App auth routing in `App.jsx