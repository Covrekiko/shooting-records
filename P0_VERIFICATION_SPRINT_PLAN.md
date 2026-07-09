# P0 Verification Sprint Plan

Scope: **READ-ONLY planning only**. No fixes, schema changes, RLS changes, backend function changes, dependency updates, stock/offline changes, refactors, commits, or feature work are authorised by this document.

Evidence base:

- `FULL_APP_READ_ONLY_INVENTORY.md`
- `FULL_APP_READ_ONLY_AUDIT.md`
- `FULL_APP_DATA_INTEGRITY_AUDIT.md`
- `FULL_APP_SECURITY_RLS_AUDIT.md`
- `FULL_APP_OFFLINE_SYNC_AUDIT.md`
- `FULL_APP_PRODUCT_GAP_ANALYSIS.md`
- `FULL_APP_RECOMMENDED_ROADMAP.md`
- Additional read-only static scans performed for this plan.

Status rule:

- `VERIFIED FAIL` is used only for directly observed command/static defects, not theoretical runtime risk.
- `STATIC RISK — NOT EXECUTED` is used where code/schema evidence shows a risk but no runtime proof exists.
- `BLOCKED` is used where role/device/network/native access is required.
- `NOT TESTED` is used where executable verification has not yet been run.

---

## 1. Consolidated P0 Findings With Evidence

### P0-01 — Sensitive entities do not have explicit RLS proof

| Field | Value |
|---|---|
| ID | P0-01 |
| Title | Sensitive entities require explicit privacy verification |
| Exact module | Data model / app-wide privacy |
| Exact file path | `base44/entities/*.jsonc` |
| Exact function/component/entity | `Rifle`, `Shotgun`, `Ammunition`, `ReloadingComponent`, `ReloadingSession`, `ReloadingTest`, `ReloadingTestResult`, `SessionRecord`, `Area`, `AreaShare`, `MapMarker`, `Harvest`, `TargetGroup`, `TargetPhoto`, clay entities, and others |
| Exact evidence | Static schema inspection found 46 entities; most entity schemas do not declare an explicit `rls` object. `FULL_APP_SECURITY_RLS_AUDIT.md` lines 20-66 list entity RLS status. |
| Static or executed evidence | STATIC RISK — NOT EXECUTED |
| Current status | NOT TESTED |
| User impact | Users may not trust privacy of firearms, ammunition, locations, harvests, targets, and reloading data until isolation is proven. |
| Data impact | Cross-user read/write/delete exposure is unproven. |
| Privacy impact | High; firearm inventory, GPS, hunting locations, and photos are sensitive. |
| Reproduction steps | Use User A to create a record, then use User B to list/filter/get/update/delete it by ID. Repeat for Admin. |
| Dependencies affected | Base44 entity security, frontend direct entity calls, backend service-role functions, share-token flows. |
| Proposed future fix | Only after verification: add/adjust explicit RLS or backend authorization rules entity-by-entity. |
| Regression risk | High; RLS changes can block legitimate workflows if not tested with User A, User B, and Admin. |

### P0-02 — Admin and service-role authorization is not proven

| Field | Value |
|---|---|
| ID | P0-02 |
| Title | Elevated backend functions need ownership/role execution tests |
| Exact module | Backend functions / admin / maintenance / stock mutation |
| Exact file path | `base44/functions/*/entry.ts` |
| Exact function/component/entity | Service-role functions listed in Section 5 below |
| Exact evidence | Static function scan found 18 backend functions using `base44.asServiceRole`, including stock, admin, delete, and maintenance functions. |
| Static or executed evidence | STATIC RISK — NOT EXECUTED |
| Current status | NOT TESTED / BLOCKED for role-specific tests |
| User impact | A normal user might be able to trigger elevated work unless every function enforces ownership/role correctly. This is unproven, not confirmed. |
| Data impact | Potential cross-user mutation or destructive cleanup if abused. |
| Privacy impact | High for service-role reads/writes to private entities. |
| Reproduction steps | Invoke each function as User B using User A record IDs and verify denial/no mutation. Invoke admin-only functions as normal user and verify 403/denial. |
| Dependencies affected | Backend functions, entities, admin pages, stock/refund flows. |
| Proposed future fix | Only after verification: add missing auth/ownership/role checks and regression tests. |
| Regression risk | High; tightening functions can break legitimate automations if not scoped carefully. |

### P0-03 — Stock/refund/idempotency flows are unproven

| Field | Value |
|---|---|
| ID | P0-03 |
| Title | Stock deduction, refund, and repeated delete are not proven exactly-once |
| Exact module | Target Shooting, Clay Shooting, Deer Management, Reloading, Load Development, Records |
| Exact file path | `src/pages/TargetShooting.jsx`, `src/pages/ClayShooting.jsx`, `src/pages/DeerManagement.jsx`, `src/pages/Records.jsx`, `src/components/load-development/TestDetailPage.jsx`, `src/components/load-development/VariantFormModal.jsx`, `base44/functions/deleteSessionRecordWithRefund/entry.ts`, `base44/functions/restoreSessionStock/entry.ts`, `base44/functions/createReloadBatchWithAmmunition/entry.ts`, `base44/functions/deleteReloadedAmmunitionWithSessionCleanup/entry.ts` |
| Exact function/component/entity | `SessionRecord`, `Ammunition`, `AmmoSpending`, `Rifle`, `Shotgun`, `ReloadingComponent`, `ReloadingSession`, `ReloadingTestVariant`, `ReloadingTestResult`, `BrassMovementLog` |
| Exact evidence | `FULL_APP_DATA_INTEGRITY_AUDIT.md` lines 22-35 list mixed stock/counter mutation paths; lines 37-67 define unexecuted stock test matrices. Static scan also found stock/counter direct calls in Target/Clay/Deer pages and service-role stock functions. |
| Static or executed evidence | STATIC RISK — NOT EXECUTED |
| Current status | NOT TESTED |
| User impact | Users could see incorrect ammo/component/firearm counters if flows are not idempotent. |
| Data impact | Potential duplicate deduction, duplicate refund, orphan child records, or stale stock. |
| Privacy impact | Low direct privacy impact; high operational data integrity impact. |
| Reproduction steps | Seed stock/counters, execute create/checkout/delete/retry/double-click scenarios, compare every affected entity before and after. |
| Dependencies affected | Stock entities, session records, delete/refund functions, reload batch functions, offline sync. |
| Proposed future fix | Only after verification: centralise authoritative stock mutation paths and add idempotency guards/tests. |
| Regression risk | High; stock logic touches multiple modules and entities. |

### P0-04 — Offline repository and direct online entity calls are mixed

| Field | Value |
|---|---|
| ID | P0-04 |
| Title | Offline architecture bypass risk |
| Exact module | Offline/sync and all field/session modules |
| Exact file path | `src/context/OutingContext.jsx`, `src/pages/DeerStalkingMap.jsx`, `src/pages/ClayShooting.jsx`, `src/pages/Records.jsx`, `src/pages/DeerManagement.jsx`, `src/pages/TargetShooting.jsx`, plus other direct-call files |
| Exact function/component/entity | `getRepository(...)` calls mixed with `base44.entities...` calls |
| Exact evidence | `FULL_APP_OFFLINE_SYNC_AUDIT.md` lines 23-29: 397 direct `base44.entities` references and 59 `getRepository` references. Additional scan found 8 files with both repository usage and direct calls. |
| Static or executed evidence | STATIC RISK — NOT EXECUTED |
| Current status | NOT TESTED / BLOCKED for offline runtime |
| User impact | Some creates may appear to work offline while update/delete/checkout paths fail online-only. |
| Data impact | Local cache and server can diverge. |
| Privacy impact | Indirect privacy risk if offline cache exposes stale shared data; not executed. |
| Reproduction steps | For each mixed file, create/update/delete while offline, restart offline, reconnect, and verify exactly one server mutation. |
| Dependencies affected | `offlineEntityRepository`, `syncQueue`, `syncEngine`, session pages, field map pages. |
| Proposed future fix | Only after verification: migrate direct calls to repository or explicitly mark online-only. |
| Regression risk | High; offline conversion can alter core CRUD behaviour. |

### P0-05 — Critical automated regression tests are not present

| Field | Value |
|---|---|
| ID | P0-05 |
| Title | Critical privacy/data/offline flows lack automated coverage |
| Exact module | App-wide QA/test infrastructure |
| Exact file path | Repository-wide test scan |
| Exact function/component/entity | No clear unit/integration/E2E suite found for critical flows |
| Exact evidence | `FULL_APP_READ_ONLY_AUDIT.md` lines 186-199: no conventional app unit, integration, E2E, offline, RLS, stock, PDF, or mobile test suite found. |
| Static or executed evidence | Executed static repository scan |
| Current status | VERIFIED FAIL |
| User impact | Regression risk remains high for every future change. |
| Data impact | Bugs in privacy, stock, delete/refund, and offline replay can recur undetected. |
| Privacy impact | High because User A/User B privacy has no automated proof. |
| Reproduction steps | Search for conventional test files and runnable test scripts; existing `package.json` has no test script. |
| Dependencies affected | All modules. |
| Proposed future fix | Add a dedicated test harness and seeded verification accounts after plan approval. |
| Regression risk | Medium to introduce tests; high risk if not introduced. |

### P0-06 — Account deletion safety is unproven

| Field | Value |
|---|---|
| ID | P0-06 |
| Title | Destructive account deletion requires dedicated test data only |
| Exact module | Account/admin/backend cleanup |
| Exact file path | `base44/functions/deleteMyAccount/entry.ts` |
| Exact function/component/entity | `deleteMyAccount`; entities include `AreaShare`, `SharedClientOutingLog`, `User`, and potentially account-linked data |
| Exact evidence | Service-role scan found `deleteMyAccount` uses `base44.asServiceRole` and performs delete/update actions. `FULL_APP_DATA_INTEGRITY_AUDIT.md` lines 147-156 marks account deletion as NOT TESTED. |
| Static or executed evidence | STATIC RISK — NOT EXECUTED |
| Current status | NOT TESTED |
| User impact | Destructive cleanup can permanently remove user data. |
| Data impact | High; broad cleanup can miss records or delete shared records incorrectly. |
| Privacy impact | High; incomplete deletion can leave private remnants. |
| Reproduction steps | Use a dedicated disposable test account with seeded records in every entity, run deletion, verify only that account's data is deleted and shared records follow intended rules. |
| Dependencies affected | User, all user-owned entities, shared entities, backend service role. |
| Proposed future fix | Only after verification: add dry-run/report mode and exhaustive cleanup tests. |
| Regression risk | High due to destructive scope. |

---

## 2. Security / RLS Entity Verification Matrix

Ownership note: Base44 records have built-in `created_by` metadata even when not declared in schema. The `created_by?` column below indicates whether an ownership field is usable/expected in verification, not whether it is explicitly declared in `properties`.

| Priority | Entity | Schema path | Explicit RLS present? | Ownership field | created_by? | user_id? | Normal-user list query path | Direct get path | Update path | Delete path | Service-role path | Current risk | Exact verification required |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P0 | User | Built-in / `base44/entities/User.jsonc` if customised | Built-in platform | `id`, `email`, `role` | No | `id` | `base44.entities.User.list()` admin-only expected | `User.get(id)` if SDK allows | User update/admin functions | User delete/admin/account delete | `createUserWithProfile`, `updateUserRole`, `deleteMyAccount`, test functions | Admin/role privacy | Normal user must not list/update/delete other users; admin-only functions must deny normal user |
| P0 | Rifle | `base44/entities/Rifle.jsonc` | No | built-in `created_by` | Yes | No | `Rifle.filter({created_by:user.email})` | `Rifle.get(id)` | direct/function updates | delete paths/settings | `deleteSessionRecordWithRefund`, `restoreSessionStock`, `markFirearmCleanedForUser`, `createMaintenanceAlertsFromSession` | Firearm private data/counters | User B cannot list/filter/get/update/delete User A rifle; service functions deny User A rifle when invoked by User B |
| P0 | Shotgun | `base44/entities/Shotgun.jsonc` | No | built-in `created_by` | Yes | No | `Shotgun.filter({created_by:user.email})` | `Shotgun.get(id)` | clay checkout/direct updates | settings delete | `deleteSessionRecordWithRefund`, `restoreSessionStock`, `markFirearmCleanedForUser`, `createMaintenanceAlertsFromSession` | Firearm private data/counters | Same as Rifle plus clay checkout/counter tests |
| P0 | Ammunition | `base44/entities/Ammunition.jsonc` | Yes | built-in `created_by` | Yes | No | `Ammunition.filter({created_by:user.email})`; `listAmmunitionForUser` | `Ammunition.get(id)` | settings/functions | settings/functions | `listAmmunitionForUser`, `createAmmunitionForUser`, `updateAmmunitionForUser`, `deleteAmmunitionForUser`, stock/refund functions | Stock/privacy | User B cannot access User A ammo; functions return/mutate only caller ammo |
| P0 | ReloadingComponent | `base44/entities/ReloadingComponent.jsonc` | No | built-in `created_by` | Yes | No | `ReloadingComponent.filter({created_by:user.email})` | `ReloadingComponent.get(id)` | reload/load functions | component delete | `createReloadBatchWithAmmunition`, `deleteReloadedAmmunitionWithSessionCleanup` | Component stock privacy/integrity | User B cannot access/mutate User A components; reload function rejects User B component IDs |
| P0 | ReloadingSession | `base44/entities/ReloadingSession.jsonc` | No | built-in `created_by` | Yes | No | `ReloadingSession.filter({created_by:user.email})` | `ReloadingSession.get(id)` | reload delete/update | reload delete | `backfillReloadBatchAmmo`, `deleteReloadedAmmunitionWithSessionCleanup`, `deleteSessionRecordWithRefund` | Reload batch privacy/integrity | User B cannot access/delete User A reload sessions |
| P0 | ReloadingTest | `base44/entities/ReloadingTest.jsonc` | No | built-in `created_by` | Yes | No | `ReloadingTest.filter({created_by:user.email})` | `ReloadingTest.get(id)` | Load Development edit | Load Development delete | none observed | Load test privacy | User B cannot access User A tests |
| P0 | ReloadingTestVariant | `base44/entities/ReloadingTestVariant.jsonc` | Yes | built-in `created_by`; `test_id` | Yes | No | `ReloadingTestVariant.filter({test_id})` | `ReloadingTestVariant.get(id)` | Variant modal | Variant delete | none observed | Explicit RLS must be proven | User B cannot access variant by known ID/test ID; Admin can if intended |
| P0 | ReloadingTestResult | `base44/entities/ReloadingTestResult.jsonc` | No | built-in `created_by`; `test_id`, `variant_id` | Yes | No | `ReloadingTestResult.filter({test_id})` | `ReloadingTestResult.get(id)` | Result modal | Variant/result delete | none observed | Results/chrono privacy | User B cannot list/get/update/delete User A results |
| P0 | SessionRecord | `base44/entities/SessionRecord.jsonc` | No | built-in `created_by` | Yes | No | `SessionRecord.filter({created_by:user.email})` | `SessionRecord.get(id)` | records/session checkout | delete/refund | `deleteSessionRecordWithRefund`, `restoreSessionStock`, `attachWeatherToSessionRecord`, `createMaintenanceAlertsFromSession` | Central activity/privacy/stock | User B cannot access; service functions deny User B using User A record ID |
| P0 | AmmoSpending | `base44/entities/AmmoSpending.jsonc` | No | built-in `created_by` | Yes | No | `AmmoSpending.filter({created_by:user.email})` | `AmmoSpending.get(id)` | spending/refund update | refund/delete | `deleteSessionRecordWithRefund`, `restoreSessionStock` | Spending/privacy/stock | User B cannot access spending logs; refund deletes only caller records |
| P0 | Area | `base44/entities/Area.jsonc` | No | built-in `created_by`; share fields | Yes | No | `Area.filter({created_by:user.email})` | `Area.get(id)` | map/area update | map area delete | account/share flows | GPS/boundary privacy | User B cannot access User A area unless share accepted; revoke/accept tests required |
| P0 | AreaShare | `base44/entities/AreaShare.jsonc` | No | `owner_email`, `accepted_by_email`, built-in `created_by` | Yes | No | `AreaShare.filter({owner_email})`, token lookup | `AreaShare.get(id)` | accept/revoke | account/delete | `deleteMyAccount` | Share token privacy | User B can only use valid intended token; cannot enumerate other shares |
| P0 | MapMarker | `base44/entities/MapMarker.jsonc` | No | built-in `created_by`; area/share fields possible | Yes | No | `MapMarker.filter(criteria)` | `MapMarker.get(id)` | map marker update | map marker delete | account/share flows | High-sensitivity POI privacy | User B cannot access private markers; shared-marker intent must be explicit |
| P0 | Harvest | `base44/entities/Harvest.jsonc` | No | built-in `created_by` | Yes | No | `Harvest.filter(criteria)` | `Harvest.get(id)` | map/harvest update | map harvest delete | account flows | GPS/harvest privacy | User B cannot access User A harvests |
| P0 | TargetGroup | `base44/entities/TargetGroup.jsonc` | No | built-in `created_by`; `session_id` | Yes | No | `TargetGroup.filter({session_id})` | `TargetGroup.get(id)` | analyzer/group updates | analyzer delete | target functions if any | Target performance privacy | User B cannot access User A groups through session ID or direct ID |
| P0 | TargetPhoto | `base44/entities/TargetPhoto.jsonc` | No | built-in `created_by` | Yes | No | `TargetPhoto.filter(...)` | `TargetPhoto.get(id)` | photo analysis update | photo delete | AI analysis functions may process files | Uploaded image privacy | User B cannot access metadata/file URL |
| P0 | ClayShooting | `base44/entities/ClayShooting.jsonc` | No | built-in `created_by` | Yes | No | `ClayShooting.filter({created_by:user.email})` | `ClayShooting.get(id)` | clay updates | clay delete | delete/refund paths | Clay session privacy | User B cannot access clay session |
| P0 | ClayScorecard | `base44/entities/ClayScorecard.jsonc` | No | built-in `created_by`; `clay_session_id` | Yes | No | `ClayScorecard.filter({clay_session_id})` | `ClayScorecard.get(id)` | score updates | cascade delete | `deleteClaySessionStands` | Score privacy/integrity | User B cannot access by User A session ID |
| P0 | ClayStand | `base44/entities/ClayStand.jsonc` | No | built-in `created_by`; `clay_scorecard_id` | Yes | No | `ClayStand.filter({clay_scorecard_id})` | `ClayStand.get(id)` | stand updates | cascade delete | `deleteClaySessionStands` | Score privacy/integrity | User B cannot access/delete User A stands |
| P0 | ClayShot | `base44/entities/ClayShot.jsonc` | No | built-in `created_by`; `clay_stand_id` | Yes | No | `ClayShot.filter({clay_stand_id})` | `ClayShot.get(id)` | shot updates | cascade delete | `deleteClaySessionStands` | Score privacy/integrity | User B cannot access/delete User A shots |
| P0 | Goal | `base44/entities/Goal.jsonc` | No | built-in `created_by` | Yes | No | `Goal.filter({created_by:user.email})` | `Goal.get(id)` | goal update | goal delete | none observed | User goal privacy | User B cannot access User A goals |
| P1 | DeerOuting | `base44/entities/DeerOuting.jsonc` | No | built-in `created_by`; shared fields | Yes | No | `DeerOuting.filter({created_by:user.email})` | `DeerOuting.get(id)` | OutingContext | Outing delete | Outing/account functions | GPS/outing privacy | User B cannot access User A outing or GPS track |
| P1 | DeerManagement | `base44/entities/DeerManagement.jsonc` | No | built-in `created_by` | Yes | No | `DeerManagement.filter({created_by:user.email})` | `DeerManagement.get(id)` | deer session update | deer delete | delete/refund paths | Deer session privacy | User B isolation matrix |
| P1 | DeerLocation | `base44/entities/DeerLocation.jsonc` | No | built-in `created_by` | Yes | No | `DeerLocation.filter({created_by:user.email})` | `DeerLocation.get(id)` | settings update | settings delete | none observed | Location privacy | User B isolation matrix |
| P1 | SharedClientOutingLog | `base44/entities/SharedClientOutingLog.jsonc` | No | owner/client email fields | Yes | No | owner/client filters | direct get | live updates | account cleanup | `deleteMyAccount`, OutingContext direct updates | Shared live tracking privacy | Owner/invitee/revoke matrix |
| P1 | CleaningHistory | `base44/entities/CleaningHistory.jsonc` | No | built-in `created_by` | Yes | No | `CleaningHistory.filter(...)` | direct get | cleaning update | cleaning delete | `markFirearmCleanedForUser` | Firearm maintenance privacy | User B isolation and function ownership |
| P1 | MaintenanceAlert | `base44/entities/MaintenanceAlert.jsonc` | Yes | built-in `created_by`; firearm fields | Yes | No | `MaintenanceAlert.filter({created_by:user.email})` | direct get | alert update | alert delete/dismiss | `createMaintenanceAlertsFromSession`, `markFirearmCleanedForUser` | Alerts/counter privacy | User B cannot access/dismiss User A alerts |
| P1 | BallisticProfile | `base44/entities/BallisticProfile.jsonc` | No | built-in `created_by`; rifle_id | Yes | No | `BallisticProfile.filter({created_by:user.email})` | direct get | profile update | delete | none observed | Ballistic/firearm privacy | User B isolation matrix |
| P1 | ScopeProfile | `base44/entities/ScopeProfile.jsonc` | No | built-in `created_by`; rifle_id | Yes | No | `ScopeProfile.filter({created_by:user.email})` | direct get | profile update | delete | none observed | Scope/firearm privacy | User B isolation matrix |
| P1 | ScopeDistanceData | `base44/entities/ScopeDistanceData.jsonc` | No | built-in `created_by`; scope_profile_id | Yes | No | `ScopeDistanceData.filter({scope_profile_id})` | direct get | update | delete | none observed | Scope data privacy | User B cannot access through known scope ID |
| P1 | TargetSession | `base44/entities/TargetSession.jsonc` | No | built-in `created_by` | Yes | No | `TargetSession.filter({created_by:user.email})` | direct get | analyzer update | delete | analyzer functions if any | Analyzer privacy | User B isolation matrix |
| P1 | TargetShooting | `base44/entities/TargetShooting.jsonc` | No | built-in `created_by` | Yes | No | `TargetShooting.filter({created_by:user.email})` | direct get | update | delete | records/delete paths | Session privacy | User B isolation matrix |
| P1 | BrassMovementLog | `base44/entities/BrassMovementLog.jsonc` | No | built-in `created_by`; brass_id | Yes | No | `BrassMovementLog.filter(...)` | direct get | update | delete | reload functions/delete refund | Brass lifecycle privacy/integrity | User B cannot access User A brass logs |
| P1 | ReloadingStock | `base44/entities/ReloadingStock.jsonc` | No | built-in `created_by` | Yes | No | stock filter | direct get | update | delete | none observed | Stock privacy | User B isolation matrix |
| P2 | Club | `base44/entities/Club.jsonc` | No | built-in `created_by` | Yes | No | `Club.filter({created_by:user.email})` | direct get | update | delete | none observed | Club/location privacy | User B isolation matrix |
| P2 | AuditLog | `base44/entities/AuditLog.jsonc` | No | `user_email` | Yes | No | admin/audit filters | direct get | update unlikely | delete unlikely | `auditRLSViolation`, `manageDataVersion` | Audit privacy | Normal users cannot list all audit logs |
| P2 | BetaFeedbackPost | `base44/entities/BetaFeedbackPost.jsonc` | No | built-in `created_by` | Yes | No | feedback list | direct get | update/admin | delete/admin | admin pages | Feedback visibility | Define public/shared vs private intent and test |
| P2 | BetaFeedbackComment | `base44/entities/BetaFeedbackComment.jsonc` | No | built-in `created_by` | Yes | No | comments filter | direct get | update/admin | delete/admin | admin pages | Feedback privacy | Define intended visibility and test |
| P2 | ReloadingInventory | `base44/entities/ReloadingInventory.jsonc` | No | built-in `created_by` | Yes | No | inventory filter | direct get | update | delete | none observed | Inventory privacy | User B isolation matrix |
| P2 | Map/catalog/reference entities | `BulletReference`, `ScopeReference`, `ReloadingBrassCatalog`, `ReloadingBulletCatalog`, `ReloadingPowderCatalog`, `ReloadingPrimerCatalog` | No | likely shared/catalog intent | Yes if user-created | No | list/filter | direct get | admin/catalog update | admin/catalog delete | importer/admin pages | Intent ambiguity | Decide public/catalog vs user-private, then test accordingly |

### Critical User A / User B / Admin Matrix Template

For every P0/P1 private entity above:

| Step | Actor | Operation | Expected result | Data safety class |
|---|---|---|---|---|
| 1 | User A | Create seeded record with unique prefix `P0-A-<entity>-<timestamp>` | Create succeeds | SAFE ON TEST DATA / REQUIRES DEDICATED TEST ACCOUNT |
| 2 | User B | `list()` / page list | User A record absent | SAFE ON TEST DATA |
| 3 | User B | `filter({})` and common UI filters | User A record absent | SAFE ON TEST DATA |
| 4 | User B | `get(UserARecordId)` | Denied/not found | SAFE ON TEST DATA |
| 5 | User B | `update(UserARecordId, harmless marker)` | Denied and record unchanged | SAFE ON TEST DATA |
| 6 | User B | `delete(UserARecordId)` | Denied and record still exists | DANGEROUS ON PRODUCTION; SAFE ON TEST DATA ONLY |
| 7 | Admin | list/get/update/delete according to intended admin policy | Matches policy | REQUIRES DEDICATED ADMIN TEST ACCOUNT |
| 8 | User A | Cleanup created record | Cleanup succeeds | SAFE ON TEST DATA ONLY |

---

## 3. Stock / Refund / Idempotency Transaction Map

### TX-01 Target Shooting checkout

| Field | Evidence / plan |
|---|---|
| Initiating screen | `src/pages/TargetShooting.jsx` |
| Handler | Target checkout handler; static evidence includes direct `SessionRecord.create/update` and `Rifle.get/update` lines from scan. |
| Backend function | May use direct page writes; deletion/refund uses backend functions below. |
| Entity writes | `SessionRecord`, `Ammunition`, `AmmoSpending`, `Rifle` |
| Stock deduction | Ammunition quantity should decrement by total rounds used. |
| Spending log | `AmmoSpending` should record cost/quantity if configured. |
| Firearm counter | `Rifle.total_rounds_fired` increments by rounds. |
| Delete path | Records delete UI / `deleteSessionRecordWithRefund` / `restoreSessionStock` depending path. |
| Refund path | Ammo stock and rifle counters should reverse once. |
| Retry behaviour | NOT TESTED. |
| Duplicate-click protection | NOT TESTED. |
| Rollback | NOT TESTED. |
| Idempotency | NOT TESTED. |
| Scenario | Initial ammo 100, rifle counter 0. Create target session using 10 rounds. Expected ammo 90, rifle 10, one `SessionRecord`, one spending log if cost exists. Delete once: ammo 100, rifle 0, spending reversed/removed. Repeat delete/retry: ammo remains 100 and rifle remains 0. Rapid double checkout: exactly one operation. |
| Data safety | SAFE ON TEST DATA; DANGEROUS ON PRODUCTION. |

### TX-02 Target record deletion

| Field | Evidence / plan |
|---|---|
| Initiating screen | `src/pages/Records.jsx`, records components |
| Handler | Delete handler invoking backend delete/refund path; exact path requires execution mapping. |
| Backend function | `base44/functions/deleteSessionRecordWithRefund/entry.ts`, `base44/functions/restoreSessionStock/entry.ts` |
| Entity writes | `SessionRecord`, `Ammunition`, `AmmoSpending`, `Rifle`, possibly `ReloadingComponent`/`BrassMovementLog` for reloaded ammo |
| Scenario | Use the TX-01 created record. Capture all affected IDs and quantities. Delete once, verify exact reversal. Try delete same ID again or retry failed request; expect no second refund. |
| Data safety | SAFE ON TEST DATA ONLY; DANGEROUS ON PRODUCTION. |

### TX-03 Clay checkout

| Field | Evidence / plan |
|---|---|
| Initiating screen | `src/pages/ClayShooting.jsx` |
| Handler | Clay checkout handler; static mixed scan shows `getRepository('SessionRecord').create/update` plus direct `Shotgun.get/update` and `ClayScorecard.filter`. |
| Backend function | `deleteClaySessionStands` for cascade pieces; delete/refund functions may apply through records. |
| Entity writes | `SessionRecord`, `Shotgun`, `Ammunition`, `AmmoSpending`, `ClayScorecard`, `ClayStand`, `ClayShot` |
| Stock deduction | Cartridge/ammo quantity should decrement by cartridges used. |
| Firearm counter | `Shotgun.total_cartridges_fired` increments. |
| Scenario | Initial ammo 100 cartridges, shotgun counter 0. Create clay session using 25. Expected ammo 75, shotgun 25, scorecard totals correct. Delete: ammo 100, shotgun 0, clay children deleted or retained according to intended policy. Repeat delete: no second refund. Double checkout: one session only. |
| Data safety | SAFE ON TEST DATA; DANGEROUS ON PRODUCTION. |

### TX-04 Clay record deletion

| Field | Evidence / plan |
|---|---|
| Initiating screen | Records / Clay Shooting details |
| Backend function | `deleteSessionRecordWithRefund`, `restoreSessionStock`, `deleteClaySessionStands` |
| Entity writes | `SessionRecord`, `Shotgun`, `Ammunition`, `AmmoSpending`, `ClayScorecard`, `ClayStand`, `ClayShot` |
| Scenario | Delete a seeded clay session. Expected one refund, one counter reversal, clay child cleanup according to defined policy. Retry must not change stock/counters again. |
| Data safety | SAFE ON TEST DATA ONLY. |

### TX-05 Deer checkout

| Field | Evidence / plan |
|---|---|
| Initiating screen | `src/pages/DeerManagement.jsx` |
| Handler | Deer checkout handler; mixed scan shows repository area/rifle reads plus direct `Rifle.get/update` lines. |
| Backend function | Delete/refund functions for session cleanup. |
| Entity writes | `SessionRecord`, `Rifle`, `Ammunition`, `AmmoSpending`, `DeerManagement`/harvest-related entities |
| Scenario | Initial ammo 100, rifle counter 0. Create deer record using 1 round and one harvested animal. Expected ammo 99, rifle 1, record linked to deer fields. Delete: ammo 100, rifle 0. Retry delete: unchanged. |
| Data safety | SAFE ON TEST DATA ONLY; DANGEROUS ON PRODUCTION. |

### TX-06 Deer record deletion

| Field | Evidence / plan |
|---|---|
| Initiating screen | Records / Deer Management |
| Backend function | `deleteSessionRecordWithRefund`, `restoreSessionStock` |
| Entity writes | `SessionRecord`, `Rifle`, `Ammunition`, `AmmoSpending`, `Harvest` if linked |
| Scenario | Delete seeded deer record and verify exact reversal plus no orphan/duplicate harvest linkage according to intended policy. Retry delete must not refund twice. |
| Data safety | SAFE ON TEST DATA ONLY. |

### TX-07 Stalking outing/harvest flow

| Field | Evidence / plan |
|---|---|
| Initiating screen | `src/context/OutingContext.jsx`, `src/pages/DeerStalkingMap.jsx` |
| Handler | Outing start/end, harvest save, GPS update handlers. |
| Backend function | None necessarily; direct and repository calls are mixed. |
| Entity writes | `DeerOuting`, `SessionRecord`, `Harvest`, `MapMarker`, `SharedClientOutingLog`, possibly `Ammunition`/`Rifle` at checkout. |
| Scenario | Start test outing, add GPS points and a harvest, end outing to create session record. Expected outing closed, one session record, one harvest, optional live shared log consistent. Delete/cleanup test data. Repeat end/checkout should not duplicate session. |
| Data safety | REQUIRES DEDICATED TEST ACCOUNT; DANGEROUS ON PRODUCTION; device/GPS tests are BLOCKED until device available. |

### TX-08 Reload batch creation

| Field | Evidence / plan |
|---|---|
| Initiating screen | Reloading module / reload batch form |
| Handler | UI invokes `createReloadBatchWithAmmunition` or performs reload-related saves depending path. |
| Backend function | `base44/functions/createReloadBatchWithAmmunition/entry.ts` |
| Entity writes | `ReloadingComponent`, `ReloadingSession`, `Ammunition`, `BrassMovementLog` |
| Stock deduction | Bullet -N, primer -N, powder decremented by grains-to-grams conversion, brass state moved. |
| Spending log | Not primary; ammo created/updated. |
| Firearm counter | None. |
| Scenario | Initial bullets 100, primers 100, brass 100 available, powder known grams. Create 50 rounds. Expected bullets 50, primers 50, brass available/loaded state exact, powder exact decrement, ammo +50, one reload session, brass movement log. Repeat submit: exactly one batch. Forced partial failure test only in preview/test environment. |
| Data safety | SAFE ON TEST DATA; partial-failure tests SAFE ON PREVIEW ONLY. |

### TX-09 Reload batch deletion

| Field | Evidence / plan |
|---|---|
| Initiating screen | Reloading module / ammunition delete path |
| Handler | Delete reloaded ammunition/session cleanup. |
| Backend function | `base44/functions/deleteReloadedAmmunitionWithSessionCleanup/entry.ts`, possibly `deleteAmmunitionForUser` invokes it. |
| Entity writes | `ReloadingSession`, `Ammunition`, `ReloadingComponent`, `BrassMovementLog`, possible `SessionRecord` checks. |
| Scenario | Delete the TX-08 batch before use. Expected exact reversal to initial quantities and no orphan ammo/session/logs. Repeat delete: no second reversal. Delete after related target usage: must block or handle according to intended policy. |
| Data safety | SAFE ON TEST DATA; DANGEROUS ON PRODUCTION. |

### TX-10 Load Development variant creation

| Field | Evidence / plan |
|---|---|
| Initiating screen | `src/components/load-development/VariantFormModal.jsx` |
| Handler | Variant submit / stock deduction path. |
| Backend function | None observed; UI direct entity/component path indicated by previous audit. |
| Entity writes | `ReloadingTestVariant`, `ReloadingComponent`, maybe test `variant_count` |
| Stock deduction | Component stock deducted if `stock_deducted` path used. |
| Scenario | Create test and variant using 10 components. Expected one variant, stock decremented exactly once, `stock_deducted` true if used. Edit variant: no duplicate deduction. Double submit: one variant and one deduction. |
| Data safety | SAFE ON TEST DATA. |

### TX-11 Load Development variant deletion

| Field | Evidence / plan |
|---|---|
| Initiating screen | `src/components/load-development/TestDetailPage.jsx` |
| Handler | `handleDeleteVariant` |
| Backend function | None observed. |
| Entity writes | `ReloadingComponent`, `ReloadingTestResult`, `ReloadingTestVariant`, `ReloadingTest` |
| Exact static evidence | Existing file snapshot shows `handleDeleteVariant` restores stock if `v.stock_deducted`, deletes associated `ReloadingTestResult`, deletes `ReloadingTestVariant`, and updates `ReloadingTest.variant_count`. |
| Scenario | Delete TX-10 variant. Expected components restored exactly once, linked result deleted, variant removed, count updated. Repeat delete must not restore twice. |
| Data safety | SAFE ON TEST DATA; DANGEROUS ON PRODUCTION. |

---

## 4. Offline Bypass Map

| Priority | File | Function/area | Operation | Create path | Update path | Delete path | Offline aware? | Direct online bypass? | Risk |
|---|---|---|---|---|---|---|---|---|---|
| P0 | `src/context/OutingContext.jsx` | Active outing lifecycle | Outing/session/shared log/GPS | `getRepository('DeerOuting').create`, `getRepository('SessionRecord').create`; direct `SharedClientOutingLog.create` | mix of repository and direct `DeerOuting.update`, `SessionRecord.update`, shared log updates | not primary | Partially | Yes | Create can be offline while shared log/GPS updates may bypass offline queue |
| P0 | `src/pages/TargetShooting.jsx` | Target session checkout | Session/counter write | direct `SessionRecord.create` and repository session paths both present | direct `SessionRecord.update`, direct `Rifle.get/update` | records delete elsewhere | Partially | Yes | Offline create/update/counter behaviour may diverge |
| P0 | `src/pages/ClayShooting.jsx` | Clay session checkout/scoring | Session/shotgun/scorecards | direct `SessionRecord.create` and `getRepository('SessionRecord').create` both present | repository session update plus direct `Shotgun.get/update` | child scorecard paths | Partially | Yes | Session may be cached but shotgun counter bypasses offline architecture |
| P0 | `src/pages/DeerManagement.jsx` | Deer checkout | Rifle counter/session | repository reads | direct `Rifle.get/update` | records delete elsewhere | Partially | Yes | Deer checkout counter update likely online-only |
| P0 | `src/pages/DeerStalkingMap.jsx` | Map marker/harvest CRUD | Map/harvest/area | repository `MapMarker`, `Harvest`, `Area` creates | repository reads/creates | direct `MapMarker.delete`, `Harvest.delete` | Partially | Yes | Create may work offline while delete bypasses offline queue |
| P1 | `src/pages/Records.jsx` | Records list/edit | Session records and user list | repository `SessionRecord.create` | direct `SessionRecord.update` | delete via functions/components | Partially | Yes | Offline create but direct edit bypass risk; direct `User.list` admin-only risk |
| P1 | `src/pages/AmmoSummary.jsx` | Armory dashboard | Alerts/firearms/ammo | repository or functions in some paths | direct maintenance alert/firearm paths in module family | alert dismiss/delete paths | Partially | Yes | Dashboard counts may diverge when offline |
| P1 | Reloading/Load Development pages | Inventory/load dev | Component/test mutations | mixed direct/backend paths | direct component/test updates | direct deletes/functions | Limited | Yes | Range/reloading offline behaviour unproven |

Verification priority: cases where create uses `getRepository` but update/delete uses `base44.entities`: `DeerStalkingMap` marker/harvest delete, `Records` edit, `ClayShooting` shotgun counter update, `TargetShooting` rifle counter update, `OutingContext` shared/GPS updates.

---

## 5. Service-Role / Backend Authorization Inventory

| Function | File path | Caller | Normal user can invoke? | User identity validated? | Ownership validated? | Role validated? | Entities affected | Impact if abused | Required execution test |
|---|---|---|---|---|---|---|---|---|---|
| attachWeatherToSessionRecord | `base44/functions/attachWeatherToSessionRecord/entry.ts` | Likely automation/session weather | Unknown | No static `auth.me` | No static ownership evidence | No | `SessionRecord` | Weather metadata on arbitrary record if callable | Invoke as unauthenticated/normal user with User A record ID; expect denial or automation-only protection |
| auditRLSViolation | `base44/functions/auditRLSViolation/entry.ts` | RLS diagnostics | Yes likely | Yes | User email logged | Role evidence present | `AuditLog` | Audit spam/data exposure | Normal user invocation creates only own audit-safe entry; cannot list all logs |
| backfillReloadBatchAmmo | `base44/functions/backfillReloadBatchAmmo/entry.ts` | Admin/backfill | Should be admin only | Yes | Filters by user email | Yes, admin check observed | `ReloadingSession`, `Ammunition` | Mass backfill/update | Normal user invocation must 403; admin test only on seeded data |
| createMaintenanceAlertsFromSession | `base44/functions/createMaintenanceAlertsFromSession/entry.ts` | Entity automation/session | Unknown | No static `auth.me` | Uses record owner checks for firearms | No | `MaintenanceAlert`, `SessionRecord`, `Rifle`, `Shotgun` | Alert creation/email side effects | Invoke directly with arbitrary record ID; verify no unauthorized email/alert or require automation secret |
| createReloadBatchWithAmmunition | `base44/functions/createReloadBatchWithAmmunition/entry.ts` | Reloading UI | Yes | Yes | Static ownership evidence on components | No | `ReloadingComponent`, `ReloadingSession`, `Ammunition`, `BrassMovementLog` | Cross-user stock mutation | User B submits User A component IDs; expect denial/no mutation |
| createUserWithProfile | `base44/functions/createUserWithProfile/entry.ts` | Admin user creation | Should be admin only | Yes | N/A | Yes | `User` | User/role creation abuse | Normal user invocation must 403; admin can create disposable test user |
| deleteAmmunitionForUser | `base44/functions/deleteAmmunitionForUser/entry.ts` | Ammo UI | Yes | Yes | Static ownership evidence | No | `Ammunition` | Delete another user's ammo | User B deletes User A ammo ID; expect denial/no mutation |
| deleteMyAccount | `base44/functions/deleteMyAccount/entry.ts` | Account settings | Yes | Yes | Uses caller identity | No | `AreaShare`, `SharedClientOutingLog`, `User`, likely account data | Destructive data loss | Dedicated disposable account only; verify other users unaffected |
| deleteReloadedAmmunitionWithSessionCleanup | `base44/functions/deleteReloadedAmmunitionWithSessionCleanup/entry.ts` | Reloading/ammo delete | Yes | Yes | Static ownership evidence | No | `ReloadingSession`, `Ammunition`, `SessionRecord`, `ReloadingComponent`, `BrassMovementLog` | Cross-user stock/session deletion | User B deletes User A reloaded ammo/session; expect denial/no mutation |
| deleteSessionRecordWithRefund | `base44/functions/deleteSessionRecordWithRefund/entry.ts` | Records delete | Yes | Yes | Static ownership evidence | No | `SessionRecord`, `Ammunition`, `AmmoSpending`, `Rifle`, `Shotgun`, `ReloadingComponent`, `BrassMovementLog` | Cross-user delete/refund | User B deletes User A session ID; expect denial/no stock change |
| listAmmunitionForUser | `base44/functions/listAmmunitionForUser/entry.ts` | Ammo selectors | Yes | Yes | Uses caller identity | No | `Ammunition`, `ReloadingSession` | Cross-user inventory listing | User B call returns only User B ammo |
| manageDataVersion | `base44/functions/manageDataVersion/entry.ts` | Data version/audit | Unknown | Yes | User evidence | No | `AuditLog` | Audit/version manipulation | Normal user invocation expected policy must be defined and verified |
| markFirearmCleanedForUser | `base44/functions/markFirearmCleanedForUser/entry.ts` | Cleaning action | Yes | Yes | Static ownership evidence | No | `Rifle`, `Shotgun`, `CleaningHistory`, `MaintenanceAlert` | Cross-user firearm counter/alerts | User B uses User A firearm ID; expect denial/no mutation |
| restoreSessionStock | `base44/functions/restoreSessionStock/entry.ts` | Record cleanup | Yes | Yes | Static ownership evidence | No | `SessionRecord`, `Ammunition`, `Rifle`, `Shotgun`, `AmmoSpending` | Cross-user refund/stock change | User B invokes with User A session ID; expect denial/no mutation |
| testBetaTesterFlow | `base44/functions/testBetaTesterFlow/entry.ts` | Diagnostic/admin | Should be admin only | Yes | N/A | Yes | `User` | Diagnostic role mutation | Normal user must 403; ideally disable outside test environments later |
| testCreateUserFlow | `base44/functions/testCreateUserFlow/entry.ts` | Diagnostic/admin | Should be admin only | Yes | N/A | Yes | `User` | User creation mutation | Normal user must 403; admin only on test data |
| updateUserRole | `base44/functions/updateUserRole/entry.ts` | Admin user management | Should be admin only | Yes | N/A | Yes | `User` | Privilege escalation | Normal user attempts to set self/admin; expect 403/no role change |
| validateEquipmentDeletion | `base44/functions/validateEquipmentDeletion/entry.ts` | Equipment delete checks | Yes likely | Yes | Must be verified | Possible | multiple linked entities | Linked delete bypass | User B validates User A equipment; should reveal nothing or deny |

---

## 6. Dependency Vulnerability Triage

Command used for evidence: `npm audit --json` only. No fix command was run.

Summary: 24 vulnerabilities total — 1 low, 10 moderate, 13 high. 468 production dependencies, 250 dev dependencies, 785 total dependency records reported by npm audit metadata.

| Package | Installed version | Advisory / via | Severity | Direct/transitive | Runtime/dev-only | Reachable in this app? | Exploitability | Recommended action | Breaking-change risk |
|---|---:|---|---|---|---|---|---|---|---|
| `@babel/core` | 7.29.0 | Arbitrary file read via sourceMappingURL | Low | Transitive | Dev/build likely | Not user-runtime unless build pipeline processes untrusted source maps | Low | Update via normal dependency refresh | Low |
| `@mapbox/node-pre-gyp` | 1.0.11 | via `tar`; affects `canvas` | High | Transitive | Node/native dependency via PDF stack | Probably not browser runtime; build/install exposure | Low/Medium | Review `react-pdf`/`canvas` upgrade path | High; fix suggests `react-pdf@10.4.1` major |
| `ajv` | 6.12.6 | ReDoS using `$data` option | Moderate | Transitive | Depends on caller | Unknown; likely tooling/schema validation | Low unless untrusted schemas use vulnerable path | Update transitive if possible | Low/Medium |
| `brace-expansion` | 1.1.12 | zero-step sequence DoS | Moderate | Transitive | Build/tooling glob | Low in app runtime | Low | Update transitive | Low |
| `canvas` | 2.11.2 | via `@mapbox/node-pre-gyp` | High | Transitive | Node/native PDF dependency | Not browser runtime directly | Low/Medium | Review PDF dependency upgrade | High; `react-pdf` major |
| `dompurify` | 3.3.1 | Multiple XSS/sanitization advisories | Moderate | Transitive | Runtime if used by PDF/HTML rendering dependency | Potentially reachable if app renders untrusted HTML through affected dependency | Medium; needs usage review | Update transitive and verify rich text/PDF rendering | Low/Medium |
| `engine.io-client` | 6.6.4 | via `ws` | Moderate | Transitive | Runtime if socket client used by dependency | Unknown | Low until socket use confirmed | Update transitive | Low |
| `flatted` | 3.3.3 | DoS/prototype pollution parse | High | Transitive | Runtime if untrusted serialized input parsed by dependency | Unknown | Low/Medium | Update transitive | Low |
| `js-yaml` | 4.1.1 | quadratic DoS aliases | Moderate | Transitive | Build/tooling unless app parses YAML | Not known reachable | Low | Update transitive | Low |
| `lodash` | 4.17.23 | template code injection; prototype pollution via unset/omit | High | Direct | Runtime | Reachable if app uses `_.template`, `_.unset`, `_.omit` with untrusted input; not proven | Medium until usage scan | Replace vulnerable usage or update when patched; audit usage first | Low/Medium |
| `minimatch` | 3.1.2 | ReDoS via glob patterns | High | Transitive | Build/tooling likely | Not app runtime unless user-controlled glob patterns processed | Low | Update transitive | Low |
| `pdfjs-dist` | 3.11.174 | malicious PDF JavaScript execution; canvas chain | High | Transitive via `react-pdf` | Runtime PDF viewer | Potentially reachable if users open untrusted PDFs in app viewer | Medium/High for PDF viewer surfaces | Review PDF viewer exposure; upgrade path likely major | High; fix suggests `react-pdf` major |
| `picomatch` | 2.3.1 | glob method injection/incorrect matching | High | Transitive | Build/tooling likely | Low runtime reachability | Low | Update transitive | Low |
| `postcss` / related tooling | version per lock | audit rows if present | Moderate/High | Transitive | Build tooling | Not app runtime | Low | Update tooling carefully | Medium |
| Remaining transitive rows | per `npm audit --json` | see npm audit output | Mixed | Mostly transitive | Mostly tooling/runtime dependency-specific | Not assumed exploitable | Unknown | Triage by reachability before updating | Varies |

Important: The audit count is a confirmed command result. Exploitability is **not** confirmed for all 13 high findings.

---

## 7. Build Quality Evidence

Commands were run read-only. No dependency update/fix command was run.

| Command | Exit status | Errors | Warnings | Evidence | Runtime impact | Pre-existing? |
|---|---:|---:|---:|---|---|---|
| `npm install` | 0 | N/A | N/A | `up to date, audited 737 packages`; 24 vulnerabilities reported | Does not prove runtime correctness | Yes, observed before this plan |
| `npm run build` | 0 | 0 build errors | 0 captured | Vite build exited 0 | Buildable app, but not functional proof | Yes |
| `npm run lint` | 1 | 79 | 0 | All parsed lint issues are `unused-imports/no-unused-imports` | Mostly build-quality; may hide dead/legacy code but not direct runtime failure unless import side effects matter | Yes |
| `npm run typecheck` | 2 | 513 | 0 | TypeScript/JSDoc checker errors across JSX components | Static type safety is failing; runtime may still build | Yes |

### Lint category breakdown

| Category | Count | Affected files summary |
|---|---:|---|
| `unused-imports/no-unused-imports` | 79 | `src/components/BottomSheet.jsx`, `Charts.jsx`, `GpsPathViewer.jsx`, `LegalShootingHours.jsx`, `LocationMap.jsx`, `MissingFieldsAlert.jsx`, `Navigation.jsx`, `OfflineStatusBar.jsx`, `PDFProgressIndicator.jsx`, `PdfExportButton.jsx`, `PhotoUpload.jsx`, `RifleAmmoTracker.jsx`, analyzer/target-analysis components, clay components, reference/reloading/scope components, and pages including `Dashboard.jsx`, `Records.jsx`, `ReloadingManagement.jsx`, `Reports.jsx`, `ClayShooting.jsx`, `BetaFeedback.jsx`, `Profile.jsx`, `DeerStalkingMap.jsx`. |

### Typecheck category breakdown

| Category | Evidence examples | Count status | Runtime impact |
|---|---|---|---|
| Missing required component props | `GlobalModal`, `NumberInput`, `BottomSheetSelect` prop type errors | Many of 513 | Can hide real contract mismatch, but build still passes |
| Incorrect inferred state shapes | `GoalCard` number/object property errors | Present | May indicate runtime assumptions need review |
| String/number assignment mismatch | Example `AmmoEditModal` string assigned to number | Present | Can become data integrity issue if forms save wrong type |
| JSX implicit type limitations | Many generated from JS/JSX check mode | Present | Typecheck is noisy but still a confirmed static fail |

---

## 8. Safest P0 Verification Sprint Order

Recommended order:

1. User A / User B privacy.
2. Backend/service-role authorization.
3. Stock deduction/refund.
4. Repeated delete/idempotency.
5. Duplicate submit.
6. Reload batch atomicity.
7. Offline replay/sync exactly once.

### Test data and account rules

- Use dedicated test accounts only: `User A`, `User B`, `Admin`.
- Use unique prefixes: `P0-VERIFY-<test-id>-<timestamp>`.
- Never run destructive verification against real user data.
- Snapshot all affected entities before and after each test.
- Cleanup only seeded records.

### First five verification tests to run

| Test ID | Safety class | Preconditions | Test account | Initial data | Exact steps | Expected result | Evidence to capture | Cleanup | Production risk |
|---|---|---|---|---|---|---|---|---|---|
| P0-RLS-001 | SAFE ON TEST DATA / REQUIRES DEDICATED TEST ACCOUNT | User A, User B, Admin exist | User A then User B | Create one `Rifle` named `P0-RLS-001` | User A creates rifle. User B attempts list/filter/get/update/delete by ID. Admin attempts according to intended policy. | User B cannot see or mutate. Admin behaviour matches policy. | Request/response logs, entity before/after, screenshots if UI used | User A/Admin deletes seeded rifle | DANGEROUS ON PRODUCTION if delete targets real rifle |
| P0-RLS-002 | SAFE ON TEST DATA / REQUIRES DEDICATED TEST ACCOUNT | Test ammo exists | User A then User B | `Ammunition` stock 100 named `P0-RLS-002` | User B list/filter/get/update/delete User A ammo ID and call `listAmmunitionForUser`. | User B cannot access; list function returns only User B ammo. | Function responses and entity snapshots | Delete seeded ammo | DANGEROUS ON PRODUCTION if stock is real |
| P0-FUNC-001 | SAFE ON TEST DATA / REQUIRES DEDICATED TEST ACCOUNT | User A session record exists | User B | `SessionRecord` with ammo/rifle links | User B invokes `deleteSessionRecordWithRefund` and `restoreSessionStock` using User A record ID. | Denied/no mutation/no refund. | Function response, ammo/rifle/session snapshots | User A/Admin cleanup | DANGEROUS ON PRODUCTION because refund/delete path |
| P0-STOCK-001 | SAFE ON TEST DATA | User A ammo/rifle created | User A | Ammo 100, rifle counter 0 | Create target session using 10 rounds. Verify stock/counter/spending. Delete once. Retry delete. | 100→90→100, rifle 0→10→0, retry unchanged. | Before/after snapshots, UI evidence, function responses | Delete seeded records | DANGEROUS ON PRODUCTION if real stock |
| P0-RELOAD-001 | SAFE ON TEST DATA / SAFE ON PREVIEW ONLY for failure injection | User A reload components seeded | User A | 100 bullets/primers/brass and known powder | Create reload batch 50 via normal flow. Verify component decrement, ammo creation, session/log. Delete batch. Retry delete. | Exact decrement/reversal once; retry unchanged. | Component/ammo/session/log snapshots | Delete seeded data | DANGEROUS ON PRODUCTION if real components |

### Full sprint test set

| Test ID | Safety class | Preconditions | Account | Initial data | Steps | Expected result | Evidence | Cleanup | Production risk |
|---|---|---|---|---|---|---|---|---|---|
| P0-RLS-ALL-001 | SAFE ON TEST DATA | Entity factory ready | User A/B/Admin | One seeded record for every P0/P1 entity | Run User B list/filter/get/update/delete matrix | User B denied/isolated | Entity snapshots and responses | Delete seeded records | High if real data used |
| P0-FUNC-ALL-001 | SAFE ON TEST DATA | Seeded User A records | User B/Admin | IDs for every service-role function | Invoke functions with unauthorized IDs | Denial/no mutation | Function logs/responses and entity snapshots | Delete seeded records | High if real IDs used |
| P0-STOCK-TARGET-001 | SAFE ON TEST DATA | Ammo/rifle seeded | User A | Ammo 100, rifle 0 | Target checkout/delete/retry/double-submit | Exact once | Entity snapshots | Cleanup | High on production |
| P0-STOCK-CLAY-001 | SAFE ON TEST DATA | Ammo/shotgun seeded | User A | Ammo 100, shotgun 0 | Clay checkout/delete/retry/double-submit | Exact once | Entity snapshots | Cleanup | High on production |
| P0-STOCK-DEER-001 | SAFE ON TEST DATA | Ammo/rifle seeded | User A | Ammo 100, rifle 0 | Deer checkout/delete/retry/double-submit | Exact once | Entity snapshots | Cleanup | High on production |
| P0-STALK-001 | REQUIRES DEDICATED TEST ACCOUNT / DEVICE | Map/GPS available | User A | Test area/outing | Start outing, add harvest/GPS, end outing twice | One outing/session/harvest set only | GPS/session snapshots | Cleanup | Very high on production |
| P0-RELOAD-ATOMIC-001 | SAFE ON PREVIEW ONLY | Ability to simulate failure | User A | Components seeded | Force failure between component update and ammo/session create | No partial stock corruption or documented failure state | Logs/entity snapshots | Manual cleanup | DANGEROUS ON PRODUCTION |
| P0-OFFLINE-001 | SAFE ON TEST DATA / DEVICE OR PREVIEW NETWORK CONTROL | Offline tooling ready | User A | Test entity | Create/update/delete offline, reconnect | Exactly one final server state | IndexedDB/queue/server snapshots | Cleanup | Medium/high if real data |
| P0-OFFLINE-002 | SAFE ON TEST DATA | Two sessions/devices | User A | Same test record | Modify server while offline local edit pending | Conflict handled according to intended policy | Queue/conflict snapshots | Cleanup | High on production |
| P0-DUP-001 | SAFE ON TEST DATA | UI test harness | User A | Test forms seeded | Rapid double-click submit/delete/checkout | One mutation only | Network log/entity snapshots | Cleanup | High for stock flows |

---

## 9. Production Data Safety Classification

| Test family | Classification | Notes |
|---|---|---|
| User A/User B list/filter/get | SAFE ON TEST DATA / REQUIRES DEDICATED TEST ACCOUNT | Do not use real users' data IDs. |
| User B update/delete attempts | DANGEROUS ON PRODUCTION | Use seeded disposable records only. |
| Admin route/function tests | REQUIRES DEDICATED TEST ACCOUNT | Admin test account must not manage real users. |
| Stock checkout/refund | DANGEROUS ON PRODUCTION | Use seeded ammo/firearms only. |
| Reload batch create/delete | DANGEROUS ON PRODUCTION | Use seeded components only. |
| Account deletion | DANGEROUS ON PRODUCTION | Disposable account only. |
| Offline queue/replay | SAFE ON TEST DATA / SAFE ON PREVIEW ONLY | Requires controlled network. |
| Failure injection/rollback | SAFE ON PREVIEW ONLY | Never induce failure on production data. |
| GPS/camera/QR/mobile tests | REQUIRES DEDICATED TEST ACCOUNT / DEVICE | Avoid real locations/photos. |
| Dependency vulnerability validation | SAFE READ-ONLY | No `npm audit fix`; no dependency updates. |

---

## 10. What Is Confirmed vs Not Confirmed

### Confirmed failures

- No clear critical-flow automated test suite found: `VERIFIED FAIL`.
- `npm run lint` fails: 79 errors, 0 warnings, all parsed as unused imports.
- `npm run typecheck` fails: 513 errors, 0 warnings.
- `npm audit --json` reports 24 vulnerabilities, 13 high.

### Static P0 risks not yet executed

- Sensitive entity isolation is not proven.
- Service-role ownership/role enforcement is not proven.
- Stock/refund/idempotency is not proven.
- Offline repository/direct call mixing may create offline gaps.
- Account deletion safety is not proven.

### Blocked P0 tests

- User A/User B/Admin runtime matrix.
- Normal-user direct invocation of admin/service-role functions.
- Offline sync replay and conflict tests.
- Device/TestFlight/GPS/camera/PDF/share tests.
- Account deletion on disposable dedicated account.

---

## 11. Execution Gate

Do not start fixes until this plan is approved and the P0 verification sprint has produced evidence. The first executable action should be `P0-RLS-001` on dedicated test data, not a code change.