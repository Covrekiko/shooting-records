# Final Application-Wide Engineering Audit — Shooting Records

Repository: https://github.com/Covrekiko/shooting-records  
Audit mode: READ-ONLY FINAL CONSOLIDATION  
Date: 2026-07-09  

No fixes, source edits, schema edits, RLS edits, dependency updates, test-account creation, seed data, destructive tests, or Load Development Milestone 2 work were performed.

---

## 1. Executive Summary

This document consolidates the prior seven audit reports, the P0 verification plan, the blocked test-account evidence, and targeted current-source revalidation of the specific risks requested.

### Highest-confidence conclusions

| Area | Finding | Status | Evidence Type | Priority |
|---|---|---|---|---|
| Test coverage | No meaningful critical-flow automated coverage found for RLS, stock/refund, offline replay, PDF/device, or E2E flows | VERIFIED FAIL | EXECUTED STATIC COMMAND | P1 |
| Build quality | `npm run lint` previously reported 79 errors, 0 warnings | VERIFIED FAIL | EXECUTED BUILD | P2 |
| Type safety | `npm run typecheck` previously reported 513 errors, 0 warnings | VERIFIED FAIL | EXECUTED BUILD | P2 |
| Dependencies | `npm audit --json` previously reported 24 advisories: 1 low, 10 moderate, 13 high | NOT TESTED | EXECUTED STATIC COMMAND | P1/P2 by reachability |
| P0 runtime verification | First five P0 runtime tests remain blocked because dedicated User A/User B accounts do not exist | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED | P0 verification gate |
| Records delete/refund | Current backend delete flow is multi-step and non-transactional; static code shows partial-failure windows after ammo refund and before final soft-delete flags | NOT TESTED | STATIC CODE EVIDENCE | P0 candidate / P1 reliability |
| Manual record edit | Current edit flow restores stock, updates record, then reapplies stock as separate independent mutations | NOT TESTED | STATIC CODE EVIDENCE | P1 |
| Offline queue TTL | Current `getPendingQueue()` marks entries expired in IndexedDB but returns the pre-update in-memory objects, allowing just-expired entries to be processed once | NOT TESTED | STATIC CODE EVIDENCE | P1 |
| Offline conflict recovery | Conflict/expired queue entries are stored but no current user-facing recovery UI was found | NOT TESTED | STATIC CODE EVIDENCE | P1 |
| Deer map delete paths | Offline-aware create paths and direct online delete paths are still present | NOT TESTED | STATIC CODE EVIDENCE | P1 |
| Clay gauge matching | Saved ammunition selector still compares `a.caliber === selectedShotgun.gauge` directly | NOT TESTED | STATIC CODE EVIDENCE | P1 |
| Reload batch creation | Current reachable create path uses `createReloadBatchWithAmmunition`; legacy create via generic session form is blocked for new records | NOT TESTED | STATIC CODE EVIDENCE | P1 residual atomicity risk |

### No confirmed runtime P0 failure

No cross-user privacy breach, unauthorized mutation, double refund, stock corruption, or destructive authorization bypass was executed. The relevant tests remain blocked and must not be marked as runtime failures.

---

## 2. Audit Scope

Included:

- Prior reports:
  - `FULL_APP_READ_ONLY_INVENTORY.md`
  - `FULL_APP_READ_ONLY_AUDIT.md`
  - `FULL_APP_DATA_INTEGRITY_AUDIT.md`
  - `FULL_APP_SECURITY_RLS_AUDIT.md`
  - `FULL_APP_OFFLINE_SYNC_AUDIT.md`
  - `FULL_APP_PRODUCT_GAP_ANALYSIS.md`
  - `FULL_APP_RECOMMENDED_ROADMAP.md`
- Prior verification plan:
  - `P0_VERIFICATION_SPRINT_PLAN.md`
- Prior blocked test-account evidence:
  - 4 users found
  - admin-like account found
  - no dedicated User A
  - no dedicated User B
- Targeted current-source revalidation only for requested files and contradictions.

Excluded:

- Fixes
- Runtime destructive tests
- Test account creation
- Production record mutation
- Dependency updates
- Broad repeated scans
- Milestone 2 Load Development work

---

## 3. Evidence Limitations

| Limitation | Impact |
|---|---|
| No dedicated User A/User B accounts | Cross-user RLS/privacy and unauthorized service-role tests are BLOCKED. |
| No destructive test data | Stock/refund/delete/retry/idempotency tests are BLOCKED. |
| No device/TestFlight execution | Camera, QR, PDF share/save, GPS, offline field use are DEVICE BLOCKED. |
| Static source review only for many findings | Static code risk does not equal runtime failure. |
| Dependency advisories are not exploit proofs | High severity advisories are SECURITY ADVISORY RISK until reachability is proven. |

---

## 4. Current Repository State

Targeted source evidence was gathered from the current workspace. The final safety check is recorded in the final response.

Key current files revalidated:

- `src/pages/Records.jsx`
- `src/lib/syncQueue.js`
- `src/lib/ownedAmmunition.js`
- `src/lib/ammoUtils.js`
- `src/pages/TargetShooting.jsx`
- `src/pages/ClayShooting.jsx`
- `src/pages/DeerManagement.jsx`
- `src/pages/DeerStalkingMap.jsx`
- `src/pages/ReloadingManagement.jsx`
- `src/components/reloading/ReloadBatchForm.jsx`
- `base44/functions/deleteSessionRecordWithRefund/entry.ts`
- `base44/functions/restoreSessionStock/entry.ts`
- `base44/functions/createReloadBatchWithAmmunition/entry.ts`
- `base44/functions/deleteMyAccount/entry.ts`

---

## 5. Verified Passes

| Finding ID | Area | Status | Evidence Type | Evidence |
|---|---|---|---|---|
| VP-001 | Records normal-user `User.list()` path | VERIFIED PASS for static guard only | STATIC CODE EVIDENCE | `src/pages/Records.jsx` lines 76-85 call `base44.entities.User.list()` only when `currentUser.role === 'admin'`; normal users map only their own `currentUser`. |
| VP-002 | Reloading legacy new-session creation reachability | VERIFIED PASS for static reachability guard only | STATIC CODE EVIDENCE | `src/pages/ReloadingManagement.jsx` lines 76-85 blocks non-edit generic session creation with alert: `Please use New Batch...`; new batch uses `ReloadBatchForm` and `createReloadBatchWithAmmunition`. |
| VP-003 | Reload batch component ownership checks | VERIFIED PASS for static ownership check only | STATIC CODE EVIDENCE | `createReloadBatchWithAmmunition` lines 123-148 define and apply `assertOwned(component, user)` before component deduction. |

Note: these are static/code-path passes, not full runtime passes.

---

## 6. Verified Failures

| Finding ID | Area | Status | Evidence Type | Evidence | Priority |
|---|---|---|---|---|---|
| VF-001 | Critical automated testing | VERIFIED FAIL | EXECUTED STATIC COMMAND | Prior scan found no conventional critical-flow test suite; no test script coverage for RLS, stock, offline, mobile/PDF, or E2E. | P1 |
| VF-002 | Lint quality | VERIFIED FAIL | EXECUTED BUILD | Prior `npm run lint`: 79 errors, 0 warnings. | P2 |
| VF-003 | Typecheck quality | VERIFIED FAIL | EXECUTED BUILD | Prior `npm run typecheck`: 513 errors, 0 warnings. | P2 |

No runtime P0 failure was verified.

---

## 7. P0 Findings

P0 is reserved for proven privacy/security failure, unauthorized access, proven destructive bypass, proven stock corruption, proven double refund, or extremely strong static severe defect. Because destructive/cross-user runtime tests are blocked, most P0 items remain candidates.

| Finding ID | Title | Status | Evidence Type | Evidence | Impact | Required next test |
|---|---|---|---|---|---|---|
| P0-CAND-001 | Cross-user privacy/RLS isolation unproven | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED | No dedicated User A/User B accounts. Entity matrix shows many sensitive entities without explicit RLS. | Potential privacy exposure if platform defaults or filters are insufficient; not proven. | Dedicated User A/User B/Admin matrix. |
| P0-CAND-002 | Service-role destructive function authorization unproven at runtime | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED | Elevated functions accept client IDs and use service role; several have ownership checks but cross-user runtime tests are blocked. | Potential unauthorized destructive mutation if a check is missing; not proven. | User B invokes functions against User A seeded IDs. |
| P0-CAND-003 | Delete/refund partial-failure can create stock/counter inconsistency | NOT TESTED | STATIC CODE EVIDENCE | `deleteSessionRecordWithRefund` refunds ammo before firearm reversal and final soft-delete flags; target/clay reversal errors are logged and may continue; deer reversal error can return 400 after ammo refund. | Potential repeated refund or inconsistent stock/counters if failure occurs mid-flow. | Surgical seeded delete/retry test with forced failure. |
| P0-CAND-004 | Reload batch atomicity unproven | NOT TESTED | STATIC CODE EVIDENCE | `createReloadBatchWithAmmunition` updates four component records before creating `ReloadingSession`, `Ammunition`, and `BrassMovementLog`. | Partial component deduction if later create/log step fails; not executed. | Seeded reload batch failure-injection test in preview only. |

---

## 8. P1 Findings

| Finding ID | Title | Status | Evidence Type | Exact evidence | Impact |
|---|---|---|---|---|
| P1-001 | Records delete/refund is multi-step and non-transactional | NOT TESTED | STATIC CODE EVIDENCE | `deleteSessionRecordWithRefund`: ammo update lines 337-340, spending delete lines 360-378, firearm reversal lines 380-444, final soft-delete lines 446-457. | Partial failure can leave stock, counters, spending logs, and deletion flags inconsistent. |
| P1-002 | Manual record edit is restore→update→reapply, not atomic | NOT TESTED | STATIC CODE EVIDENCE | `Records.jsx` lines 165-190: calls `restoreSessionStock`, then `SessionRecord.update`, then `decrementAmmoStock`. | Failed save after restore or after update can corrupt stock/counters/spending. |
| P1-003 | Offline queue 24-hour expiry handling is internally inconsistent | NOT TESTED | STATIC CODE EVIDENCE | `syncQueue.js` lines 67-84 marks expired entries in DB but filters/returns original in-memory `all`. | Expired entry can still process once in same run; later recovery visibility is weak. |
| P1-004 | Generic sync idempotency is asserted but not proven | NOT TESTED | STATIC CODE EVIDENCE | `syncQueue.js` lines 193-203 attaches `_transactionId`; no generic pre-create server lookup/dedup is visible. | Duplicate create/replay possible after ambiguous network failure. |
| P1-005 | Offline conflicts/expired entries lack recovery UI | NOT TESTED | STATIC CODE EVIDENCE | Only `OfflineContext` imports `getPendingCount`; no UI consumer for `getAllQueueEntries`, `CONFLICT`, or `EXPIRED` was found. | User may not inspect, retry, discard, or resolve stuck pending work. |
| P1-006 | Offline repository bypass remains in core pages | NOT TESTED | STATIC CODE EVIDENCE | Files mixing repository and direct calls: `OutingContext`, `DeerStalkingMap`, `ClayShooting`, `Records`, `DeerManagement`, `TargetShooting`, `offlineEntityRepository`. | Offline create/update/delete asymmetry and replay gaps. |
| P1-007 | Deer Stalking map create/delete asymmetry remains | NOT TESTED | STATIC CODE EVIDENCE | `DeerStalkingMap.jsx`: create via `getRepository('MapMarker').create`/`getRepository('Harvest').create`; delete via `base44.entities.MapMarker.delete` and `base44.entities.Harvest.delete`. | Offline-created records may not have offline-aware delete/retry/conflict behavior. |
| P1-008 | Clay ammunition gauge matching is strict equality | NOT TESTED | STATIC CODE EVIDENCE | `ClayShooting.jsx` lines 602-605: `a.caliber === selectedShotgun.gauge`. | `12 Gauge`, `12 gauge`, `12ga`, `12 GA`, `12` may not match consistently. |
| P1-009 | Records PDF object URL cleanup captures stale state | NOT TESTED | STATIC CODE EVIDENCE | `Records.jsx` lines 478-489 creates URL then cleanup closes over `pdfUrl` state from prior render; initial cleanup sees `null`. | Object URL leak; mobile memory risk. |
| P1-010 | Checkout stock effects occur before session final save in online flows | NOT TESTED | STATIC CODE EVIDENCE | Target/Clay/Deer checkout update counters/decrement ammo before final repository session update. | Failure after stock mutation but before session completion can leave stock/counters without corresponding completed record. |

---

## 9. P2 Findings

| Finding ID | Title | Status | Evidence Type | Evidence |
|---|---|---|---|---|
| P2-001 | Lint unused import debt | VERIFIED FAIL | EXECUTED BUILD | 79 lint errors reported, primarily unused imports. |
| P2-002 | Typecheck debt | VERIFIED FAIL | EXECUTED BUILD | 513 typecheck errors across JSX/component prop contracts and inferred shapes. |
| P2-003 | PDF/export inconsistency | NOT TESTED | STATIC CODE EVIDENCE | App uses a mix of `doc.save`, object URLs, `window.open`, iframe preview, `MobilePdfViewer`, print windows, and download anchors. |
| P2-004 | Direct debug logging in user flows | NOT TESTED | STATIC CODE EVIDENCE | Several pages/functions include debug console output in checkout/reloading paths. |
| P2-005 | Catalog/reference visibility intent unclear | NOT TESTED | STATIC CODE EVIDENCE | Catalog entities lack explicit RLS and may be intended shared; policy is undocumented. |

---

## 10. Blocked Findings

| Test/Finding | Status | Evidence Type | Blocker |
|---|---|---|---|
| P0-RLS-001 — Rifle isolation | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED | No dedicated User A/User B accounts. |
| P0-RLS-002 — Ammunition isolation | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED | No dedicated User A/User B accounts. |
| P0-FUNC-001 — User B delete/refund attempt | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED | No dedicated User A/User B seeded records. |
| P0-STOCK-001 — Target stock delete/retry | BLOCKED | TEST-DATA BLOCKED | Would require seeded stock/firearm/session data. |
| P0-RELOAD-001 — Reload batch exact reversal | BLOCKED | TEST-DATA BLOCKED | Would require seeded reloading components and batch. |
| Device/TestFlight PDF/share/camera/GPS | BLOCKED | DEVICE BLOCKED | Requires real mobile/TestFlight/device environment. |
| Account deletion safety | BLOCKED | TEST-DATA BLOCKED | Requires disposable account only. |

---

## 11. Not Tested Findings

Major not-tested areas:

- Cross-user access by direct entity ID.
- Normal user invoking service-role functions against another user's IDs.
- Concurrent double delete/double checkout.
- Network failure after stock/counter mutation but before session update.
- Offline queue conflict and expiry recovery.
- PDF mobile save/share/cancel behavior outside Load Development.
- Actual exploitability of dependency advisories.

---

## 12. Security/RLS Matrix

`created_by` is a Base44 built-in ownership attribute even when not declared in schema. Missing explicit RLS is not proof of public access; runtime isolation is unproven unless tested.

| Entity | Schema path | Explicit RLS? | Ownership field | created_by? | user_id? | Frontend ownership filtering? | Backend/service validation? | Sensitive? | Runtime test required |
|---|---|---:|---|---:|---:|---|---|---:|---|
| AmmoSpending | `base44/entities/AmmoSpending.jsonc` | No | built-in / notes tags | Yes | No | Mixed via user filters and notes matching | delete/refund functions filter owner | Medium | User A/B list/get/delete by ID |
| Ammunition | `base44/entities/Ammunition.jsonc` | Yes | built-in | Yes | No | Yes in loaders/functions | `list/create/update/deleteAmmunitionForUser`, refund functions | High | User A/B + function ID tests |
| Area | `base44/entities/Area.jsonc` | No | built-in + share fields | Yes | No | Yes in map/settings | account/share flows partial | High | Private/shared area matrix |
| AreaShare | `base44/entities/AreaShare.jsonc` | No | owner/accepted email fields | Yes | No | Share-token paths | account deletion touches | High | Token enumeration/revoke tests |
| AuditLog | `base44/entities/AuditLog.jsonc` | No | user email/log fields | Yes | No | Admin/diagnostic only intended | audit functions | Medium | Normal user cannot list all |
| BallisticProfile | `base44/entities/BallisticProfile.jsonc` | No | built-in | Yes | No | User filters in scope flows | none prominent | Medium | User A/B profile isolation |
| BetaFeedbackComment | `base44/entities/BetaFeedbackComment.jsonc` | No | built-in | Yes | No | Feedback/admin intent | admin pages | Low/Medium | Define intended visibility |
| BetaFeedbackPost | `base44/entities/BetaFeedbackPost.jsonc` | No | built-in | Yes | No | Feedback/admin intent | admin pages | Low/Medium | Define intended visibility |
| BrassMovementLog | `base44/entities/BrassMovementLog.jsonc` | No | built-in + brass/session IDs | Yes | No | Reloading paths | reload/delete functions | High | User A/B brass-log isolation |
| BulletReference | `base44/entities/BulletReference.jsonc` | No | catalog intent unclear | Yes | No | Reference DB | importer/admin | Low | Public vs private policy test |
| ClayScorecard | `base44/entities/ClayScorecard.jsonc` | No | built-in + session ID | Yes | No | Session filters | `deleteClaySessionStands` | Medium | User A/B by session ID |
| ClayShooting | `base44/entities/ClayShooting.jsonc` | No | built-in | Yes | No | Legacy/current unclear | delete flows | Medium | User A/B isolation |
| ClayShot | `base44/entities/ClayShot.jsonc` | No | built-in + stand ID | Yes | No | Stand filters | `deleteClaySessionStands` | Medium | User A/B by stand ID |
| ClayStand | `base44/entities/ClayStand.jsonc` | No | built-in | Yes | No | Direct user filters | `deleteClaySessionStands` | Medium | User A/B isolation |
| CleaningHistory | `base44/entities/CleaningHistory.jsonc` | No | built-in + firearm ID | Yes | No | Armory filters | `markFirearmCleanedForUser` | High | User A/B firearm history |
| Club | `base44/entities/Club.jsonc` | No | built-in | Yes | No | User filters | none prominent | Medium | User A/B isolation |
| DeerLocation | `base44/entities/DeerLocation.jsonc` | No | built-in | Yes | No | Settings filters | none prominent | High | User A/B location isolation |
| DeerManagement | `base44/entities/DeerManagement.jsonc` | No | built-in | Yes | No | Page filters | delete/refund paths | High | User A/B isolation |
| DeerOuting | `base44/entities/DeerOuting.jsonc` | No | built-in + share fields | Yes | No | OutingContext | account/share flows | High | User A/B GPS/outing isolation |
| Goal | `base44/entities/Goal.jsonc` | No | built-in | Yes | No | User filters | none prominent | Low | User A/B isolation |
| Harvest | `base44/entities/Harvest.jsonc` | No | built-in | Yes | No | Map filters | map delete direct | High | User A/B harvest isolation |
| MaintenanceAlert | `base44/entities/MaintenanceAlert.jsonc` | Yes | built-in + firearm ID | Yes | No | User filters | maintenance functions | High | User A/B alert isolation |
| MapMarker | `base44/entities/MapMarker.jsonc` | No | built-in | Yes | No | Map filters | direct delete | High | User A/B marker isolation |
| ReloadingBrassCatalog | `base44/entities/ReloadingBrassCatalog.jsonc` | No | catalog intent | Yes | No | Reference DB | importer/admin | Low | Catalog visibility policy |
| ReloadingBulletCatalog | `base44/entities/ReloadingBulletCatalog.jsonc` | No | catalog intent | Yes | No | Reference DB | importer/admin | Low | Catalog visibility policy |
| ReloadingComponent | `base44/entities/ReloadingComponent.jsonc` | No | built-in | Yes | No | User filters | reload functions assert owner | High | User A/B component isolation |
| ReloadingInventory | `base44/entities/ReloadingInventory.jsonc` | No | built-in | Yes | No | Legacy inventory | none prominent | Medium | User A/B isolation |
| ReloadingPowderCatalog | `base44/entities/ReloadingPowderCatalog.jsonc` | No | catalog intent | Yes | No | Reference DB | importer/admin | Low | Catalog visibility policy |
| ReloadingPrimerCatalog | `base44/entities/ReloadingPrimerCatalog.jsonc` | No | catalog intent | Yes | No | Reference DB | importer/admin | Low | Catalog visibility policy |
| ReloadingSession | `base44/entities/ReloadingSession.jsonc` | No | built-in | Yes | No | User filters | reload/delete functions | High | User A/B batch isolation |
| ReloadingStock | `base44/entities/ReloadingStock.jsonc` | No | built-in | Yes | No | Stock inventory | none prominent | Medium | User A/B isolation |
| ReloadingTest | `base44/entities/ReloadingTest.jsonc` | No | built-in | Yes | No | Load Development filters | none prominent | High | User A/B test isolation |
| ReloadingTestResult | `base44/entities/ReloadingTestResult.jsonc` | No | built-in + test/variant IDs | Yes | No | Load Development filters | none prominent | High | User A/B result isolation |
| ReloadingTestVariant | `base44/entities/ReloadingTestVariant.jsonc` | Yes | built-in + test ID | Yes | No | Load Development filters | none prominent | High | User A/B variant isolation |
| Rifle | `base44/entities/Rifle.jsonc` | No | built-in | Yes | No | User filters | stock/counter functions check owner | High | User A/B rifle isolation |
| ScopeDistanceData | `base44/entities/ScopeDistanceData.jsonc` | No | built-in + profile ID | Yes | No | Scope filters | none prominent | Medium | User A/B by profile ID |
| ScopeProfile | `base44/entities/ScopeProfile.jsonc` | No | built-in | Yes | No | User filters | none prominent | Medium | User A/B isolation |
| ScopeReference | `base44/entities/ScopeReference.jsonc` | No | catalog intent | Yes | No | Reference DB | importer/admin | Low | Catalog policy |
| SessionRecord | `base44/entities/SessionRecord.jsonc` | No | built-in | Yes | No | User filters | delete/refund/weather/maintenance functions | High | User A/B central record matrix |
| SharedClientOutingLog | `base44/entities/SharedClientOutingLog.jsonc` | No | owner/client email fields | Yes | No | Outing/share filters | account deletion | High | Owner/client/revoke matrix |
| Shotgun | `base44/entities/Shotgun.jsonc` | No | built-in | Yes | No | User filters | stock/counter functions check owner | High | User A/B shotgun isolation |
| TargetGroup | `base44/entities/TargetGroup.jsonc` | No | built-in + session ID | Yes | No | Analyzer filters | AI/analysis flows | High | User A/B by session ID |
| TargetPhoto | `base44/entities/TargetPhoto.jsonc` | No | built-in | Yes | No | Analyzer filters | AI functions | High | User A/B photo metadata/file test |
| TargetSession | `base44/entities/TargetSession.jsonc` | No | built-in | Yes | No | Analyzer filters | analyzer flows | High | User A/B session isolation |
| TargetShooting | `base44/entities/TargetShooting.jsonc` | No | built-in | Yes | No | Legacy/current unclear | delete flows | Medium | User A/B isolation |
| User | built-in / optional `User.jsonc` | Built-in platform | id/email/role | N/A | id | Admin-only expected | user/admin functions | High | Normal user cannot list/update/delete others |

---

## 13. Service-Role Function Matrix

| Function | File | Frontend callers / likely caller | Auth check | Role check | Ownership check | Target entities | Input IDs | Abuse scenario | Runtime test required |
|---|---|---|---:|---:|---:|---|---|---|---|
| attachWeatherToSessionRecord | `base44/functions/attachWeatherToSessionRecord/entry.ts` | session/weather automation | unclear/static risk | No | must verify | SessionRecord | session/record ID | Add metadata to another user's record | Unauth/User B against User A record |
| backfillReloadBatchAmmo | `base44/functions/backfillReloadBatchAmmo/entry.ts` | admin/backfill | Yes | Yes observed in prior scan | owner filtered | ReloadingSession, Ammunition | batch/session IDs | Mass stock backfill | Normal user 403; admin seeded only |
| createMaintenanceAlertsFromSession | `base44/functions/createMaintenanceAlertsFromSession/entry.ts` | automation/session | unclear/static risk | No | partial by firearm owner | MaintenanceAlert, Rifle, Shotgun, SessionRecord | session ID | Alert/email side effect on arbitrary session | Direct invoke test |
| createReloadBatchWithAmmunition | `base44/functions/createReloadBatchWithAmmunition/entry.ts` | ReloadBatchForm | Yes | No | Yes for components | ReloadingComponent, ReloadingSession, Ammunition, BrassMovementLog | component IDs | Cross-user component deduction | User B component ID test |
| createUserWithProfile | `base44/functions/createUserWithProfile/entry.ts` | Admin users | Yes | Yes | N/A | User | email/role/profile | Unauthorized user creation | Normal user 403 |
| deleteAmmunitionForUser | `base44/functions/deleteAmmunitionForUser/entry.ts` | ammo UI | Yes | No | expected by function name; verify | Ammunition | ammunitionId | Delete another user's ammo | User B ammo ID test |
| deleteMyAccount | `base44/functions/deleteMyAccount/entry.ts` | account settings | Yes | No | caller-scoped expected | many user-owned/shared records, User | current user | Incomplete/excess cleanup | Disposable account only |
| deleteReloadedAmmunitionWithSessionCleanup | `base44/functions/deleteReloadedAmmunitionWithSessionCleanup/entry.ts` | reload/ammo delete | Yes | No | expected; verify | ReloadingSession, Ammunition, ReloadingComponent, BrassMovementLog | ammo/session IDs | Cross-user stock restore/delete | User B against User A seeded batch |
| deleteSessionRecordWithRefund | `base44/functions/deleteSessionRecordWithRefund/entry.ts` | Records delete | Yes | No | Yes on record/ammo/firearms | SessionRecord, Ammunition, AmmoSpending, Rifle, Shotgun, ReloadingComponent, BrassMovementLog | sessionId | Cross-user delete/refund | User B against User A seeded record |
| listAmmunitionForUser | `base44/functions/listAmmunitionForUser/entry.ts` | `loadOwnedAmmunitionWithReloads` | Yes | No | caller scoped expected | Ammunition, ReloadingSession | none/client context | Inventory enumeration | User B returns only own ammo |
| manageDataVersion | `base44/functions/manageDataVersion/entry.ts` | diagnostics/versioning | Yes likely | unclear | unclear | AuditLog/version entities | action IDs | user data version manipulation | Policy definition + role test |
| markFirearmCleanedForUser | `base44/functions/markFirearmCleanedForUser/entry.ts` | Armory cleaning | Yes | No | expected; verify | Rifle, Shotgun, CleaningHistory, MaintenanceAlert | firearm ID | Mark another user's firearm clean | User B firearm ID test |
| restoreSessionStock | `base44/functions/restoreSessionStock/entry.ts` | Records edit/manual restore | Yes | No | Yes on session/ammo/firearms | SessionRecord, Ammunition, Rifle, Shotgun, AmmoSpending | sessionId | Cross-user stock/counter mutation | User B against User A seeded record |
| testBetaTesterFlow | `base44/functions/testBetaTesterFlow/entry.ts` | diagnostic/admin | Yes | Yes expected | N/A | User | user/test params | test function mutates real users | Normal user 403, admin test only |
| testCreateUserFlow | `base44/functions/testCreateUserFlow/entry.ts` | diagnostic/admin | Yes | Yes expected | N/A | User | email/role | user creation abuse | Normal user 403 |
| updateAmmunitionForUser | `base44/functions/updateAmmunitionForUser/entry.ts` | `decrementAmmoStock`, ammo UI | Yes | No | expected; verify | Ammunition | ammunitionId | Cross-user stock update | User B ammo ID test |
| updateUserRole | `base44/functions/updateUserRole/entry.ts` | Admin users | Yes | Yes | N/A | User | userId/role | privilege escalation | Normal user 403/self-escalation deny |
| validateEquipmentDeletion | `base44/functions/validateEquipmentDeletion/entry.ts` | equipment delete checks | Yes likely | unclear | must verify | equipment/session entities | equipment ID | reveal/delete-link another user's records | User B equipment ID test |

---

## 14. Stock/Refund Transaction Matrix

| Flow | Current mutation order | Idempotency evidence | Partial-failure risk | Status |
|---|---|---|---|---|
| Target checkout | Rifle counter direct update → ammo decrement → SessionRecord update | Offline special queue for effects; online no transaction | Stock/counter can update before final session save | NOT TESTED |
| Clay checkout | Shotgun counter direct update → ammo decrement → SessionRecord update | Offline special queue for effects; online no transaction | Counter/stock can update before session completion | NOT TESTED |
| Deer checkout | Rifle counter direct update → ammo decrement with `activeOuting.id` → `endOutingWithData` | Offline special queue for effects | Stock/counter can update before outing/session completion | NOT TESTED |
| Records delete | Function loads record → refunds ammo → deletes spending → reverses counters → soft-deletes record | Start skips only if record already deleted/refunded | Failure before final flags can permit retry/double refund | NOT TESTED |
| Manual record edit | Restore old stock → update SessionRecord → apply new stock | No visible transaction/lock | Failure after restore/update can corrupt data | NOT TESTED |
| Reload batch create | Deduct four component stocks in parallel → create session → create/update ammo → create brass log | No visible idempotency key/rollback | Component stock can change without session/ammo/log | NOT TESTED |
| Reload batch delete | Dedicated delete utility/function path | Not fully executed | Exact reversal unproven | BLOCKED |

---

## 15. Duplicate Business Path Matrix

| Domain | Primary/current path | Duplicate/legacy path | Current reachability | Risk |
|---|---|---|---|---|
| Record delete/refund | `deleteSessionRecordWithRefund` | `restoreSessionStock` still used for manual edit and may overlap with delete concepts | Both reachable for different actions | Divergent refund logic and flags. |
| Ammo decrement | `decrementAmmoStock` frontend helper + `updateAmmunitionForUser` | direct entity updates in some restore/delete functions | Reachable | Spending logs and stock can diverge by path. |
| Reload batch create | `createReloadBatchWithAmmunition` | generic `ReloadingSessionForm` create path is blocked for new records | Legacy new create currently blocked | Residual edit/delete code paths still direct. |
| Ammunition loading | `loadOwnedAmmunitionWithReloads` | direct `getRepository('Ammunition')` / direct filters in some pages | Mixed | Selector consistency and offline cache divergence. |
| Offline mutation | `getRepository` queue | direct `base44.entities` calls | Mixed in 7 files | Offline create/update/delete asymmetry. |
| PDF export | Load Development robust preview/save helpers | direct `doc.save`, iframe object URLs, `window.open` | Multiple current paths | Mobile/TestFlight reliability varies by module. |

---

## 16. Offline/Sync Matrix

| File | Create path | Read path | Update path | Delete path | Offline-aware? | Direct-online? | Queue/conflict/retry notes |
|---|---|---|---|---|---:|---:|---|
| `src/context/OutingContext.jsx` | repository for outing/session; direct shared log paths likely | mixed | mixed | mixed | Partial | Yes | Live/shared updates need runtime replay testing. |
| `src/pages/DeerStalkingMap.jsx` | `getRepository('MapMarker').create`, `getRepository('Harvest').create` | repository filters | mixed | direct `base44.entities.MapMarker.delete`, `Harvest.delete` | Partial | Yes | Create offline-aware/delete direct-online asymmetry STILL PRESENT. |
| `src/pages/ClayShooting.jsx` | `getRepository('SessionRecord').create` | `loadOwnedAmmunitionWithReloads`, repository, direct ClayStand | `base44.entities.Shotgun.update`, `getRepository('SessionRecord').update` | records path | Partial | Yes | Checkout uses special offline FieldCheckoutEffects for stock/counters. |
| `src/pages/Records.jsx` | new manual records via repository | repository + guarded `User.list` for admin only | direct `SessionRecord.update` for edit | backend function direct online | Partial | Yes | Edit/delete require internet to protect stock. |
| `src/pages/DeerManagement.jsx` | OutingContext | `loadOwnedAmmunitionWithReloads` | direct Rifle update + OutingContext save | records path | Partial | Yes | Online checkout mutates stock/counter before final save. |
| `src/pages/TargetShooting.jsx` | repository check-in; auto checkin direct `SessionRecord.create` | repository + `loadOwnedAmmunitionWithReloads` | direct Rifle update + repository session update | records path | Partial | Yes | Auto check-in direct path bypasses repository. |
| `src/lib/offlineEntityRepository.js` | queue core | cache/server | queue core | queue core | Yes | Uses direct SDK internally when online | Needs exactly-once/runtime replay proof. |

### Sync queue specific findings

| Topic | Evidence | Classification |
|---|---|---|
| 24h expiry | `ENTRY_TTL_MS = 24 * 60 * 60 * 1000`; expired rows are marked `EXPIRED` in DB. | STATIC CODE EVIDENCE |
| Expired row visibility | `getPendingCount()` uses `getPendingQueue()`, which filters pending/failed only; expired rows are not counted as pending after subsequent reads. | STATIC CODE EVIDENCE |
| Recovery UI | No UI consumer of `getAllQueueEntries`, `CONFLICT`, or `EXPIRED` found. | STATIC CODE EVIDENCE |
| Idempotency | Generic create/update only attach `_transactionId`; no generic dedup check visible. | STATIC RISK |
| Special stock effects | `FieldCheckoutEffects` checks `_field_effects_applied_transaction_id` on SessionRecord. | STATIC CODE EVIDENCE, runtime unproven |

---

## 17. PDF/Export Matrix

| Module/path | Export mechanism | Preview | Save/share | Mobile/TestFlight risk | Cleanup/cancel evidence | Status |
|---|---|---|---|---|---|---|
| Load Development | `generateLoadTestPDF`, preview helper, save/share helper | `LoadDevelopmentPdfPreview` / `MobilePdfViewer` | Mobile-aware save/share/download | Lower than other modules; fixed separately | Explicit revoke helper exists | NOT TESTED here |
| Records page | `getRecordsPdfBlob` → `URL.createObjectURL` → iframe | iframe | preview only | iframe/object URL may behave poorly on mobile | cleanup closure likely stale (`pdfUrl` captured before set) | NOT TESTED / STATIC DEFECT |
| RecordsSection | Blob/object URL + lazy PDF viewer | `MobilePdfViewer` | preview | Needs mobile test | object URL patterns need review | NOT TESTED |
| Reports | `URL.createObjectURL` preview and multiple `doc.save` paths | likely preview | `doc.save` | `doc.save` can fail/behave inconsistently in iOS webviews/TestFlight | cancellation handling unclear | NOT TESTED |
| AmmoSummary | `doc.save('ammunition-summary.pdf')` | none | direct save | mobile save prompt risk | no cancel handling | NOT TESTED |
| Ammunition settings | `doc.save('ammunition-inventory.pdf')` | none | direct save | mobile save prompt risk | no cancel handling | NOT TESTED |
| ReloadingManagement | `URL.createObjectURL(doc.output('blob'))` + `window.open` | browser tab/window | open URL | popup blocker/mobile webview risk | `setTimeout` revoke after 60s | NOT TESTED |
| QRLabelButton | `window.open('', '_blank')` print window | print window | print | popup/print support varies | no device proof | NOT TESTED |
| ReferenceImporter | Blob object URL/download | no | anchor download | mobile download risk | immediate revoke visible | NOT TESTED |
| Target/photo analyzer previews | file object URLs | local preview | no save | memory risk if cleanup missed | one local revoke path found | NOT TESTED |

---

## 18. Build/Lint/Typecheck Analysis

| Command | Prior result | Status | Category |
|---|---:|---|---|
| `npm run lint` | 79 errors, 0 warnings | VERIFIED FAIL | BUILD QUALITY FAILURE |
| `npm run typecheck` | 513 errors, 0 warnings | VERIFIED FAIL | BUILD QUALITY FAILURE |
| `npm audit --json` | 24 advisories | NOT TESTED runtime | SECURITY ADVISORY RISK |

### Triage categories

- Unused imports: largest lint category; usually P2 unless import side effects matter.
- JSX/component prop mismatch: typecheck category; may indicate runtime contract issues.
- Invalid property access / inferred shape mismatch: runtime-relevant if code path executes.
- Base44 SDK typing: may be config/noise, but can hide wrong assumptions.
- PDF and target analyzer types: likely runtime-relevant because these flows are complex/mobile-sensitive.

Top runtime-risk typecheck areas to triage first:

1. Form data numeric/string mismatches in stock and ammunition flows.
2. Component prop mismatches around modals/PDF viewers.
3. Entity field property access in target analyzer and records/report components.
4. Any undefined identifier hidden among typecheck output.

---

## 19. Dependency Vulnerability Triage

Prior audit evidence: 24 total advisories; 1 low, 10 moderate, 13 high. No fix commands were run.

| Package/advisory area | Installed/direct version evidence | Severity | Direct/transitive | Runtime/dev | Current usage in app | Reachable? | Exploitability proven? | Safest future action | Breaking risk |
|---|---|---|---|---|---|---|---|---|---|
| lodash | `package.json` has `lodash ^4.17.21`; no direct source refs found in targeted grep | High advisories in prior audit | Direct dependency | Runtime if imported | No current source import found by targeted grep | Not currently proven | No | Remove if unused or update when safe | Low/Medium |
| react-pdf / pdfjs-dist | `react-pdf ^7.7.3`; `MobilePdfViewer.jsx` imports `react-pdf` and CDN worker | High in prior audit via pdfjs/canvas chain | Direct + transitive | Runtime PDF viewing | `MobilePdfViewer` | Yes for PDF preview | No app-specific exploit proof | Review upgrade path and test PDF flows | High; major upgrade likely |
| canvas / node-pre-gyp / tar | transitive via PDF stack | High in prior audit | Transitive | install/build/server-side dependency | Not browser runtime directly | Low/Medium | No | Upgrade through PDF stack | High |
| dompurify | transitive; no direct source refs found | Moderate in prior audit | Transitive | Runtime if dependency sanitizes HTML/PDF annotations | Through PDF/HTML rendering possible | Unknown | No | Upgrade transitive path | Medium |
| js-yaml/minimatch/brace-expansion/picomatch/postcss/tooling | transitive | Moderate/High | Transitive | Mostly tooling/build | No app runtime usage proven | Low | No | Update through dependency maintenance | Low/Medium |
| engine.io-client/ws/flatted | transitive | Moderate/High | Transitive | Runtime only if dependency path used | Not proven used by app feature | Unknown | No | Reachability review before upgrade | Medium |
| jspdf | `jspdf ^4.2.1` | not highlighted as vulnerable in prior summary | Direct | Runtime PDF generation | Many PDF utilities | Yes | No advisory noted | Keep but test mobile exports | Medium |

---

## 20. Test Coverage Gap Analysis

| Test type | Current evidence | Status | Gap |
|---|---|---|---|
| Unit tests | No conventional suite found | VERIFIED FAIL | Business logic not isolated. |
| Integration tests | No current app integration suite found | VERIFIED FAIL | Multi-entity stock/refund paths untested. |
| E2E tests | No Playwright/Cypress-style suite found | VERIFIED FAIL | User flows not covered. |
| RLS/privacy tests | No executable User A/User B matrix | BLOCKED | Needs dedicated accounts. |
| Service-role authorization tests | No executable negative tests | BLOCKED | Needs dedicated accounts/test IDs. |
| Stock integrity tests | Not executable without seeded data | BLOCKED | Needs test records. |
| Offline replay/conflict tests | No executable harness found | NOT TESTED | Needs controlled network/IndexedDB harness. |
| PDF/mobile tests | Not run | DEVICE BLOCKED | Needs mobile/TestFlight/browser matrix. |
| Migration tests | Not found | NOT TESTED | Needed for schema/legacy data changes. |

Code-trace/debug functions are not a substitute for a true automated E2E/permission suite.

---

## 21. Product/Commercial Priorities

| Idea | Ranking | Reason |
|---|---|---|
| Sync Conflict Center | BUILD SOON | Directly addresses P1 offline reliability and field-user trust. |
| Data Health Center | BUILD SOON | Helps detect stock/counter/orphan inconsistencies; supports supportability. |
| Unified Firearm Profile | AFTER RELIABILITY | High user value, but depends on accurate counters and privacy. |
| Proven Load Lifecycle | AFTER RELIABILITY | Strong premium feature, but depends on reload batch/stock correctness. |
| Professional reports | AFTER RELIABILITY | Commercially valuable; PDF/mobile reliability must be stabilized first. |
| Smart Dashboard | AFTER RELIABILITY | Useful retention feature; should not mask data quality issues. |
| Universal Activity Timeline | AFTER RELIABILITY | Strong UX, but depends on consistent record models. |
| Global Search | AFTER RELIABILITY | Useful but privacy/scoping must be proven first. |
| Notification Center | AFTER RELIABILITY | Valuable after maintenance/stock alerts are reliable. |
| Cross-module analytics | PREMIUM LATER | Good subscription value after source data is trustworthy. |
| QR workflows | PREMIUM LATER | Useful for stock/armory workflows; needs print/mobile verification. |
| Chronograph import | PREMIUM LATER | Strong load-development value after Milestone 1.5 reliability. |
| Target measurement | PREMIUM LATER | Valuable but AI/photo/PDF/mobile dependencies add complexity. |
| Coach/reviewer workflow | DEFER | Introduces sharing/privacy surface before RLS and sharing are verified. |

---

## 22. Exact Runtime Tests Still Required

The surgical list is maintained in `MINIMUM_RUNTIME_VERIFICATION_LIST.md`. Highest priority:

1. Dedicated User A/User B/Admin privacy matrix for Rifle and Ammunition.
2. User B negative service-role function tests for delete/refund and restore.
3. Seeded target delete/retry idempotency test.
4. Seeded reload batch create/delete/retry exact reversal test.
5. Forced partial-failure test for delete/refund and reload create in a safe preview/test environment only.
6. Offline queue expiry/conflict recovery test.
7. Mobile/TestFlight PDF export smoke tests.

---

## 23. Recommended Repair Order

1. Create dedicated test accounts and seeded test data in a safe environment.
2. Execute minimum P0/P1 runtime tests before fixing.
3. Fix authorization/privacy defects if any are proven.
4. Centralize stock/refund transaction paths and add idempotency guards.
5. Add data-health diagnostics before broad data repair.
6. Add sync conflict center/recovery UI.
7. Normalize ammunition/gauge/caliber selectors.
8. Rationalize PDF/export flows app-wide.
9. Reduce typecheck/lint debt after functional risk is under control.
10. Only then resume Load Development Milestone 2 or growth features.

---

## 24. Definition of Audit Completion

This final audit is complete when:

- The three final deliverables exist.
- Prior evidence has been reconciled.
- Blocked tests remain blocked without unsafe execution.
- Findings distinguish verified failures from static risks and blocked runtime tests.
- No functional source, schema, RLS, backend, dependency, route, UI, PDF, stock, offline, or auth code has been changed.

This document completes the consolidation phase only. It does not authorize fixes.