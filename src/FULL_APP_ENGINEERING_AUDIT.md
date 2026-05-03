# FULL APP ENGINEERING AUDIT — Shooting Records

Audit date: 2026-05-03  
Repository inspected: https://github.com/Covrekiko/shooting-records  
Audit mode: Static repository inspection + current app runtime logs + targeted source-file inspection.  
Implementation status: **No fixes implemented. Audit only.**

---

## 1. Executive Summary

The app is broadly functional in the current preview: runtime logs did not show active app-breaking console errors during the captured session. The major risk areas are not missing files or broken routes; they are **permission-sensitive data access**, **stock/refund consistency**, **legacy duplicate reloading paths**, **offline sync edge cases**, and **mobile/PDF UX gaps**.

The highest risk finding is that `pages/Records` calls `base44.entities.User.list()` for every user. Base44's built-in User entity only allows admins to list users, so normal users may fail to load Records. The second highest risk is that `deleteSessionRecordWithRefund` deletes `AmmoSpending` logs using `s.session_id === sessionId`, while the active stock decrement helper stores session linkage in `notes` as `session:<id>`. This can leave spending records behind after deleting a shooting record.

No proven missing file or broken import was found in the inspected runtime-critical files. However, the codebase contains several duplicated/legacy flows that can bypass the newer safer helpers if reached, especially around reloading sessions and stock handling.

**TestFlight readiness:** Not safe yet without fixing the top permission/data-flow issues and validating normal-user flows.  
**App Store review readiness:** Not safe yet until account deletion, support/privacy, permission prompts, and production debug logging are verified/cleaned.

---

## 2. Critical Issues

### CRITICAL-01 — Normal users may be blocked from Records page by `User.list()`

**File:** `pages/Records`  
**Lines inspected:** 63-69  
**Code path:**
```js
const allUsers = await base44.entities.User.list();
```

**Problem:** Base44's built-in User entity only allows admins to list other users. Regular users can only access their own user record. This means normal users may receive a permission error and the Records page may stop loading.

**Impact:** Normal user cannot reliably view records. This is a permission/RLS production blocker.

**Severity:** CRITICAL

**Minimal recommended fix:** Only call `User.list()` for admins. For normal users, build `userMap` from the current user only.

**Do not change yet:** Wait for approval.

---

### CRITICAL-02 — `deleteSessionRecordWithRefund` likely leaves `AmmoSpending` logs behind

**File:** `functions/deleteSessionRecordWithRefund`  
**Lines inspected:** 360-369  
**Problem code:**
```js
const matchingSpending = spending.filter(s => s.session_id === sessionId);
```

**Related source:** `lib/ammoUtils.js`  
`decrementAmmoStock()` creates `AmmoSpending` with linkage in `notes`, e.g.:
```js
notes: `session:${sessionId}`
```

**Problem:** The delete/refund function checks `session_id`, but the current spending records appear to store session references inside `notes`. Therefore, deleting records through `deleteSessionRecordWithRefund` may refund stock but not remove spending logs.

**Impact:** Spending reports can remain inflated/wrong after record deletion. This is a data integrity issue.

**Severity:** CRITICAL

**Minimal recommended fix:** Update `deleteSessionRecordWithRefund` to match both `session_id === sessionId` and `notes.includes('session:' + sessionId)`, and deer fallback `outing:<outingId>` if available.

**Do not change yet:** Wait for approval.

---

### CRITICAL-03 — Permission risk in direct frontend Ammunition edit/delete

**File:** `pages/settings/AmmunitionInventory`  
**Lines inspected:** 64-105  
**Problem code:**
```js
await base44.entities.Ammunition.update(editingId, ...)
await base44.entities.Ammunition.delete(deletingItem.id)
```

**Problem:** Ammunition has strict ownership/RLS behavior. Factory ammo creation was moved to a backend function, but edit and factory delete still use direct frontend entity calls. Normal users may fail depending on active RLS rules.

**Impact:** Normal users may be able to add ammo but fail to edit/delete it.

**Severity:** CRITICAL/HIGH depending on production RLS behavior.

**Minimal recommended fix:** Route Ammunition edit/delete through backend functions with ownership checks. Do not alter schema.

**Do not change yet:** Wait for approval.

---

### CRITICAL-04 — Legacy reloading session creation path can bypass brass lifecycle safeguards if reached

**File:** `pages/ReloadingManagement`  
**Lines inspected:** 73-103  
**Problem code:**
```js
const createdSession = await base44.entities.ReloadingSession.create(data);
await base44.entities.Ammunition.create(...)
```

**Problem:** The app now has a safer backend path `createReloadBatchWithAmmunition`, but this legacy handler still contains direct `ReloadingSession.create` and `Ammunition.create`. It does not perform the same server-side brass/component updates as the newer function.

**Impact:** If the old session form can be reached for creation, it can create reload sessions/ammunition without decrementing component stock or applying brass lifecycle rules.

**Severity:** CRITICAL if reachable for create; MEDIUM if only reachable for edit.

**Minimal recommended fix:** Remove/disable the create branch or route all reload-batch creation exclusively through `createReloadBatchWithAmmunition`.

**Do not change yet:** Wait for approval.

---

## 3. High Issues

### HIGH-01 — Offline sync queue expires after 24 hours

**File:** `lib/syncQueue.js`  
**Lines inspected:** 25-30  
**Problem code:**
```js
ENTRY_TTL_MS: 24 * 60 * 60 * 1000
```

**Problem:** Field users may be offline for more than 24 hours. Pending check-ins, checkouts, POIs, and field effects can expire before syncing.

**Impact:** Offline field records may stop syncing after remote/multi-day use.

**Severity:** HIGH

**Minimal recommended fix:** Extend TTL significantly or mark entries as requiring user review rather than expiring them silently.

---

### HIGH-02 — Stalking map POI/Harvest delete bypasses offline repository

**File:** `pages/DeerStalkingMap`  
**Lines inspected:** 398-416  
**Problem code:**
```js
await base44.entities.MapMarker.delete(id)
await base44.entities.Harvest.delete(id)
```

**Problem:** Creating POIs/Harvests is offline-aware, but deleting them uses direct online Base44 calls. This fails offline and bypasses the sync queue.

**Impact:** Field user cannot reliably delete incorrect POIs/harvest markers offline.

**Severity:** HIGH

**Minimal recommended fix:** Use `getRepository('MapMarker').delete(id)` and `getRepository('Harvest').delete(id)` with a confirmation warning.

---

### HIGH-03 — Reloaded ammunition visibility is inconsistent between pages

**Files:**
- `lib/ownedAmmunition.js`
- `pages/DeerStalkingMap`
- `pages/TargetShooting`
- `pages/ClayShooting`
- `pages/DeerManagement`

**Problem:** Target/Clay/Deer Management use `loadOwnedAmmunitionWithReloads`, but Stalking Map uses:
```js
getRepository('Ammunition').filter({ created_by: currentUser.email })
```
This can miss linked reload ammo edge cases and can include archived/deleted ammo unless filtered.

**Impact:** Checkout ammunition choices can differ by screen. Reloaded ammo may appear in one checkout but not another.

**Severity:** HIGH

**Minimal recommended fix:** Use `loadOwnedAmmunitionWithReloads(currentUser)` consistently for checkout ammunition selectors.

---

### HIGH-04 — Clay ammunition filter does not normalize gauge/calibre values

**File:** `pages/ClayShooting`  
**Lines inspected:** 598-601  
**Problem code:**
```js
return !selectedShotgun || !selectedShotgun.gauge || a.caliber === selectedShotgun.gauge;
```

**Problem:** Direct equality can fail for values like `12 gauge`, `12 Gauge`, `12ga`, or normalized catalog variants.

**Impact:** Checkout ammunition visibility can be wrong for clay shooting.

**Severity:** HIGH

**Minimal recommended fix:** Use shared caliber/gauge normalization for shotgun ammo matching.

---

### HIGH-05 — Field checkout effects are queued, but conflict UX is incomplete

**File:** `lib/syncQueue.js`  
**Lines inspected:** 138-143, 294-302  
**Problem:** If ammo stock changed while offline, sync marks conflict:
```js
return { success: false, conflict: true, error: 'Stock changed while offline...' }
```
But no dedicated in-app conflict review/resolve UI was found in inspected files.

**Impact:** Offline checkout can become stuck as conflict without an obvious user recovery path.

**Severity:** HIGH

**Minimal recommended fix:** Add a pending sync/conflict review surface, or show actionable error details in OfflineStatusBar.

---

### HIGH-06 — Account deletion deletes data directly without a dry-run/confirmation summary

**File:** `functions/deleteMyAccount`  
**Lines inspected:** 3-148  

**Problem:** The function deletes many user-owned entities directly. This is probably acceptable for account deletion, but there is no dry-run summary and not all shared-area implications are visible before the destructive action.

**Impact:** App Store reviewers often expect clear account deletion wording and predictable data deletion behavior.

**Severity:** HIGH for App Store readiness, MEDIUM for app function.

**Minimal recommended fix:** Keep backend as-is unless approved, but improve user-facing text and add a pre-delete summary/checklist.

---

### HIGH-07 — Normal-user ammunition creation function may still be user-scoped

**File:** `functions/createAmmunitionForUser`  
**Lines inspected:** 55-68  
**Problem code:**
```js
const created = await base44.entities.Ammunition.create(payload);
```

**Problem:** The function sets `created_by`, but uses user-scoped entity creation, not service role. If Ammunition RLS is restrictive, normal users may still fail to create ammo.

**Impact:** Normal user add-ammunition may fail depending on production RLS rules.

**Severity:** HIGH until verified.

**Minimal recommended fix:** Confirm live RLS. If needed, use service role with explicit ownership checks and `created_by: user.email`.

---

### HIGH-08 — PDF preview mobile iframe may hide controls/second page on iPhone

**File:** `pages/Records`  
**Lines inspected:** 595-641  
**Problem code:**
```jsx
<div className="... h-[90vh] ...">
<iframe src={pdfUrl} className="w-full h-full border-0" />
```

**Problem:** Mobile browsers often handle PDF iframes poorly; controls and second pages may be inaccessible. Safe-area is not considered here.

**Impact:** PDF preview can be unusable on iPhone even if PDF generation works.

**Severity:** HIGH/MEDIUM

**Minimal recommended fix:** Use mobile-specific download/open behavior or a dedicated mobile PDF viewer with `100dvh` and safe-area padding.

---

## 4. Medium Issues

### MEDIUM-01 — Production debug logs remain in user-facing app

**Files:**
- `App.jsx`
- `pages/ClayShooting`
- `pages/DeerManagement`
- `pages/TargetShooting`
- `lib/syncQueue.js`

**Examples:**
- `[ROUTE_DEBUG] App.jsx loaded - redirect debug version ACTIVE`
- `[CLAY CHECKIN DEBUG] ...`
- `[DEER ARMORY DEBUG] ...`

**Impact:** Console noise, potential App Store polish issue, and harder support debugging.

**Minimal recommended fix:** Gate debug logs behind a development flag or remove before release.

---

### MEDIUM-02 — `ThemeSync` event listener cleanup is ineffective

**File:** `App.jsx`  
**Problem:** Listener is added with an inline callback and removed with a different inline callback.

**Impact:** Small memory leak if remounted.

**Minimal recommended fix:** Store handler in a named const and remove the same handler.

**Protected:** App.jsx must not be touched without approval.

---

### MEDIUM-03 — Global caliber selector not used everywhere

**Files:**
- `components/reloading/ReloadingSessionForm`
- Potentially old/legacy reloading inventory forms

**Problem:** Some forms still use free text caliber inputs instead of `CaliberTypeahead`.

**Impact:** Caliber matching can drift, especially `.303 British` and `.308 Winchester` aliases.

**Minimal recommended fix:** Replace free text caliber inputs with `CaliberTypeahead` in non-protected UI only after approval.

---

### MEDIUM-04 — Numeric fields coerce empty string to zero while typing

**Files:**
- `pages/settings/AmmunitionInventory`
- `components/reloading/ReloadingSessionForm`
- Multiple checkout modals

**Examples:**
```js
parseInt(e.target.value) || 0
parseFloat(e.target.value) || 0
```

**Problem:** Empty input becomes `0` immediately, making editing awkward and sometimes saving unintended zero values.

**Impact:** UI friction and possible accidental zero stock/cost saves.

**Minimal recommended fix:** Use the existing `components/ui/NumberInput` pattern or raw string state for numeric fields.

---

### MEDIUM-05 — Manual record edit directly updates `SessionRecord`

**File:** `pages/Records`  
**Lines inspected:** 162-198  

**Problem:** Edit path restores stock via backend then directly updates `SessionRecord`, then reapplies stock via frontend helper. This is complex and partly frontend-controlled.

**Impact:** Permission and partial failure risk. If update succeeds but reapply fails, stock can drift.

**Minimal recommended fix:** Move edit-with-stock-reconciliation into a single backend function transaction-like flow.

---

### MEDIUM-06 — Stalking map direct delete has no offline/user ownership protection beyond entity rules

**File:** `pages/DeerStalkingMap`  
**Problem:** Deletes are direct calls from frontend and not using repository/soft-delete.

**Impact:** Offline failure and weaker auditability.

**Minimal recommended fix:** Repository delete or backend function if shared-area ownership rules become complex.

---

### MEDIUM-07 — App permissions prompt has unhandled update promise

**File:** `components/AppPermissionsPrompt`  
**Problem:** `base44.auth.updateMe({ permissionsPromptSeen: true })` is called without await/catch in effect and close handler.

**Impact:** Failed network update can cause prompt behavior inconsistencies across devices.

**Minimal recommended fix:** Catch errors and rely on local flag as fallback.

---

### MEDIUM-08 — PDF object URL cleanup uses stale closure

**File:** `pages/Records`  
**Lines inspected:** 600-611  

**Problem:** Cleanup references `pdfUrl` from the render where it was `null`, so created object URLs may not be revoked.

**Impact:** Minor memory leak during repeated PDF previews.

**Minimal recommended fix:** Revoke the local `url` created in the effect cleanup.

---

## 5. Low Issues

### LOW-01 — Platform/noise logs observed, not app bugs

Runtime logs showed:
- Datadog storage warning
- Route debug logs

No app crash was captured in runtime logs. Platform/editor noise should not be fixed in app code unless proven app-owned.

### LOW-02 — Duplicate modal systems exist

Files include multiple modal/sheet abstractions:
- `GlobalModal`
- `GlobalSheet`
- `AppModal`
- `AppUnifiedModal`
- `BaseModal`
- `ModalShell`

This is not an immediate bug but increases maintenance risk.

### LOW-03 — Duplicate/legacy reloading forms remain

Both modern and old reloading entry paths exist. This increases the chance of stock logic bypass if old forms are exposed again.

---

## 6. Files Inspected

### Repository/API
- GitHub repository metadata
- GitHub recursive tree API, partially truncated by response size
- `src` GitHub contents
- `src/components` GitHub contents
- `src/pages` GitHub contents
- `src/lib` GitHub contents
- GitHub raw files for core source files

### Frontend core
- `App.jsx`
- `components/Navigation`
- `components/MobileTabBar`
- `context/TabHistoryContext.jsx`
- `components/AppPermissionsPrompt`
- `components/AppPermissionsPanel`
- `pages/ProfileSetup`
- `pages/Profile`
- `pages/ProfileSettings`
- `components/ui/GlobalModal`
- `index.css`
- `tailwind.config.js`

### Ammunition / reloading / stock
- `pages/settings/AmmunitionInventory`
- `lib/ownedAmmunition.js`
- `lib/ammoUtils.js`
- `utils/ammoLabels.js` context referenced
- `utils/caliberCatalog.js`
- `components/CaliberTypeahead`
- `pages/ReloadingManagement`
- `components/reloading/ReloadingSessionForm`
- `components/reloading/ReloadBatchForm` summary/context
- `lib/brassLifecycle.js`
- `lib/reloadingDeleteUtils.js`
- `functions/createAmmunitionForUser`
- `functions/createReloadBatchWithAmmunition`
- `functions/deleteReloadedAmmunitionWithSessionCleanup`
- `functions/restoreSessionStock`
- `functions/deleteSessionRecordWithRefund`

### Records / checkout / field
- `pages/Records`
- `pages/TargetShooting`
- `pages/ClayShooting`
- `pages/DeerManagement`
- `components/UnifiedCheckoutModal`
- `components/RecordsSection` summary/context
- `components/ManualRecordModal` summary/context

### Offline / map / GPS
- `context/OfflineContext.jsx`
- `lib/offlineSupport.js`
- `lib/offlineEntityRepository.js`
- `lib/syncQueue.js`
- `lib/syncEngine.js` context referenced
- `lib/trackingService.js` summary/context
- `pages/DeerStalkingMap`
- `components/deer-stalking/OfflineFieldMap` context referenced
- `functions/getGoogleMapsApiKey`

### Account / App Store
- `functions/deleteMyAccount`
- `pages/PrivacyPolicy` context referenced
- `pages/Support` context referenced
- `functions/updateUserRole`

---

## 7. Broken / Missing Files Found

No confirmed missing runtime-critical files were found in the inspected files.

Notes:
- `src/functions` returned 404 from GitHub contents API. This appears to be repository layout/platform path behavior, not necessarily a missing app folder, because backend functions exist and are accessible in Base44.
- Local `public/manifest.json` read failed through the app file tool, but the project context lists `public/manifest.json`; this needs a non-invasive follow-up check before any App Store packaging decision.
- Earlier automated warnings about `POIGuide` and `StalkingAreaGuide` are false positives: these are variables returned from `useFirstTimeGuide`, not missing imports.

---

## 8. Broken Imports / Exports Found

No proven broken imports/exports were found in the inspected core files.

Risk areas to verify with build:
- Extensionless imports are common and should be fine under Vite.
- Some duplicate/legacy components exist with similar names, but no direct broken import was proven.
- GitHub raw rendering was partially mangled by Markdown conversion, so a real build/lint pass is still required before release.

Recommended verification:
- Run Vite build.
- Search for unresolved imports across all source files.
- Confirm case-sensitive paths on Linux build environment.

---

## 9. Permission / Admin / New-User Risks

### Admin-only / User entity
- `pages/Records` calls `User.list()` and can break for normal users.
- `functions/updateUserRole` correctly requires admin.
- `pages/admin/*` routes are present; UI appears admin-gated in Navigation, but routes should also self-check admin access.

### Normal-user entity operations
Potential direct frontend calls that can fail under strict RLS:
- `Ammunition.update/delete` in Ammunition Inventory
- `SessionRecord.update` in manual record edit
- `Rifle.update` / `Shotgun.update` during checkout
- `ReloadingSession.update` during reloading edit
- `MapMarker.delete` / `Harvest.delete` in Stalking Map

### New-user risks
- Profile setup correctly hides bottom tab through `MobileTabBar` profileComplete check.
- Module onboarding appears after profile completion if modules not configured.
- Permission prompt now attempts one-time behavior, but server update is not awaited/caught.

---

## 10. Stock / Reloading / Ammunition Risks

1. `deleteSessionRecordWithRefund` does not clean spending logs created by current `decrementAmmoStock()` notes format.
2. Ammunition edit/delete still uses direct frontend entity operations.
3. Legacy reloading direct create path remains in `ReloadingManagement`.
4. Manual record edit uses multi-step frontend restore/update/reapply logic, increasing partial failure risk.
5. Clay ammo filtering does not normalize gauge/caliber.
6. Stalking Map ammo loading does not use the same owned/reloaded ammo loader as the main checkout pages.
7. Brass lifecycle maths is duplicated in frontend libs and backend functions; this increases drift risk.
8. Delete/refund logic exists in several places: `deleteSessionRecordWithRefund`, `restoreSessionStock`, `ammoUtils`, and `reloadingDeleteUtils`.

Database lock respected: this audit proposes no schema/entity changes.

---

## 11. Mobile / iPhone Risks

1. Records PDF preview uses `h-[90vh]` iframe and may be hard to use on iPhone.
2. Some custom modals use fixed heights instead of `100dvh`/safe-area handling.
3. Numeric inputs that coerce empty values to `0` are awkward on mobile keyboards.
4. Photo modal uses `95vh`, not safe-area-aware `95dvh`.
5. Multiple dropdown/select patterns exist; some can overflow inside modals.
6. Bottom tab is correctly hidden during profile setup and on `/deer-stalking`.
7. `GlobalModal` is generally safe-area-aware and is the best modal foundation.

---

## 12. Offline / Map Risks

### What works
- Offline provider exists.
- IndexedDB-backed repositories exist.
- SessionRecord, MapMarker, Harvest, Area, and field checkout effects can be queued.
- Stalking Map has offline fallback map strategy.
- Photo upload is intentionally blocked offline.
- Stock-changing checkout side effects are queued for field use.

### What does not fully work
- Offline queue expires after 24h.
- Offline conflict resolution UI is incomplete.
- POI/Harvest delete in Stalking Map is not offline-aware.
- Some online-only calls remain in auto-checkin and analytics paths.
- Direct online updates for armory/ammo are skipped offline and queued only in checkout flows, not in every possible edit path.

### What must remain blocked offline
- Factory ammo add/edit/delete unless backend has a safe offline reconciliation strategy.
- Reload batch creation/deletion unless the entire component/brass transaction can be queued safely.
- Photo uploads.
- Google satellite/places/search.

---

## 13. Map / GPS Risks

1. `trackingService` appears to be the intended single GPS watcher, reducing duplicate watchPosition risk.
2. `useGeolocation()` is still used in ClayShooting for location display, while trackingService also handles tracking; check for duplicate GPS permissions/watchers in that hook.
3. Stalking Map fallback avoids blank screen offline.
4. Area drawing is intentionally blocked offline because it requires the online Google drawing tool.
5. `getUserLocation` silently ignores geolocation errors in Stalking Map initial load, which may leave default London center without a clear prompt.
6. Auto-checkin direct creates SessionRecord/Outing in some flows and should be reviewed for offline behavior.

---

## 14. PDF Risks

1. Records PDF preview mobile UX risk due iframe.
2. Object URL cleanup issue in `pages/Records`.
3. PDF generation imports appear present in inspected files.
4. Reloading batch PDF export uses `generateReloadingBatchPDF(session)` and saves directly; no runtime error observed, but page-2/mobile preview was not exercised.
5. PDF preview failure handling is minimal; if blob generation throws, spinner may remain because the async effect has no catch/finally.

---

## 15. App Store Readiness Risks

1. Account deletion exists and is visible in Profile, but needs end-to-end verification on a real account.
2. Support route exists as public route in App.jsx.
3. Privacy Policy route exists as public route in App.jsx.
4. Production debug logging should be removed/gated.
5. Permissions prompt should be tested on iPhone for location/notification behavior.
6. App icon/manifest/service worker were not modified; manifest needs follow-up read/build verification.
7. PDF preview and offline map should be tested on physical iPhone.

---

## 16. Exact Recommended Minimal Fixes

Do first, in order:

1. Fix `pages/Records` normal-user `User.list()` permission issue.
2. Fix `deleteSessionRecordWithRefund` spending log cleanup to match current `notes` linkage.
3. Verify/fix normal-user Ammunition add/edit/delete path through backend functions.
4. Disable/remove legacy reload session creation branch or route it through `createReloadBatchWithAmmunition`.
5. Make Stalking Map POI/Harvest delete offline-aware via repository.
6. Standardize checkout ammunition loading to `loadOwnedAmmunitionWithReloads`.
7. Normalize clay gauge/ammo matching.
8. Extend/rework offline sync TTL and add conflict recovery UI.
9. Fix Records PDF preview mobile and object URL cleanup.
10. Gate/remove production debug logs.

---

## 17. Files Proposed for Editing After Approval

No files edited during audit except this report.

Proposed fix files:
- `pages/Records`
- `functions/deleteSessionRecordWithRefund`
- `functions/createAmmunitionForUser`
- New backend function for Ammunition update/delete, if approved
- `pages/settings/AmmunitionInventory`
- `pages/ReloadingManagement`
- `pages/DeerStalkingMap`
- `pages/ClayShooting`
- `lib/syncQueue.js`
- `components/OfflineStatusBar` or equivalent sync-conflict UI
- `pages/Profile` only if account deletion wording needs App Store polish

Protected files needing explicit approval before edits:
- `App.jsx`
- `public/manifest.json`
- `public/sw.js`
- `lib/trackingService.js`
- PDF generator files
- Ammunition/reloading/brass lifecycle math files
- Entity schemas

---

## 18. Files That Must Not Be Touched Without Approval

Per database lock and protected systems:

- Entity schemas in `entities/` / `base44/entities/`
- `App.jsx` routing/auth redirect logic
- Manifest
- Service worker
- Base44 config
- Maps/GPS tracking logic
- PDF generation/layout files
- Theme/icons/design tokens
- Reloading/ammunition stock calculations
- Brass lifecycle maths
- Records delete/refund logic
- Database/entity schemas

Exception: Only touch if the exact bug is proven there and approval is given.

---

## 19. Test Plan

### Build / file integrity
1. Run production Vite build.
2. Verify all imports resolve on case-sensitive filesystem.
3. Verify all registered routes load.
4. Verify no 404 app source files.

### Roles
1. Admin user: dashboard, records, admin users, ammunition, reloading.
2. Existing normal user: records, add/edit/delete own ammo, checkout/delete records.
3. Brand-new normal user: profile setup, module onboarding, one-time permissions prompt, bottom tab hidden during setup.

### Ammunition
1. Add factory ammo as normal user.
2. Edit factory ammo as normal user.
3. Delete factory ammo as normal user.
4. Add `.303 British`, `.303`, `.308`, `.308 Win`; verify labels and filters.
5. Verify archived/deleted ammo hidden.

### Reloading / brass
1. Add primer/powder/bullet/brass.
2. Add new brass and used brass.
3. Create reload batch.
4. Confirm components decrement once.
5. Confirm new brass first-use cost charged once.
6. Fire reloaded ammo.
7. Recover brass.
8. Reuse brass at £0 brass cost.
9. Delete batch before firing.
10. Delete record after brass reuse.
11. Confirm no brass total inflation.

### Records / refund
For target, clay, deer:
1. Create checkout with ammo.
2. Confirm stock decrements.
3. Confirm armory counter increments.
4. Delete record.
5. Confirm stock restores.
6. Confirm AmmoSpending logs removed.
7. Confirm rifle/shotgun counters reverse correctly.

### Offline field use
1. Go offline before check-in.
2. Check in target/clay/deer.
3. Add Stalking Map POI offline.
4. Check out offline with ammo.
5. Stay offline over 24 hours test case.
6. Reconnect and verify sync.
7. Test stock conflict case.

### Mobile/iPhone
1. Profile setup on iPhone.
2. GlobalModal keyboard focus and footer visibility.
3. Bottom tab safe area.
4. Stalking Map offline fallback.
5. PDF preview and download.
6. Camera/photo upload behavior.
7. Permission prompt only once.

### App Store readiness
1. Public `/support` route works unauthenticated.
2. Public `/privacy-policy` route works unauthenticated.
3. Delete Account visible and works.
4. Offline data cleared on logout/delete.
5. No excessive production debug logs.

---

## 20. What Should Be Fixed First

1. `pages/Records` normal-user `User.list()` permission bug.
2. `deleteSessionRecordWithRefund` spending log cleanup mismatch.
3. Normal-user Ammunition edit/delete backend path.
4. Legacy reloading direct-create path.
5. Stalking Map offline delete gap.
6. Checkout ammunition visibility consistency.
7. Clay gauge/ammo normalization.
8. Offline sync TTL/conflict UX.
9. PDF mobile preview.
10. Production debug logs.

---

## Top 10 Most Dangerous Issues

1. `pages/Records` uses `User.list()` and may fail for normal users.
2. `deleteSessionRecordWithRefund` does not match current `AmmoSpending.notes` session linkage.
3. Ammunition edit/delete uses direct frontend entity calls.
4. Legacy reloading create path can bypass stock/brass lifecycle if reached.
5. Offline sync queue expires after 24h.
6. Stalking Map POI/Harvest delete is not offline-aware.
7. Checkout ammunition visibility differs between Stalking Map and main checkout pages.
8. Clay ammo/gauge matching uses raw equality.
9. Manual record edit has multi-step frontend stock reconciliation that can partially fail.
10. Mobile PDF preview can be unusable on iPhone.

---

## Final Safety Assessment

**Missing/broken files:** No confirmed broken/missing runtime-critical files in inspected areas.  
**Broken routes:** No confirmed broken protected/public routes in inspected App.jsx context.  
**Runtime errors:** No app-owned runtime crash captured in current logs.  
**Safe for TestFlight:** Not yet. Fix critical/high items first.  
**Safe for App Store review:** Not yet. Fix account deletion verification, public support/privacy verification, permissions prompt behavior, mobile PDF, and production debug logs first.