# Full App Data Integrity Audit

Read-only audit only. No stock, schema, backend, frontend, or offline changes were made.

## Executive Summary

The application contains many high-value data integrity flows: ammunition stock, component stock, brass lifecycle, firearm counters, spending logs, reloading sessions, session records, target groups, harvest records, area sharing, QR linking, and PDFs. Static inspection shows multiple competing mutation paths, direct entity writes, backend service-role functions, and offline queue logic. None of the critical mutation flows were executed in this audit, so they remain `NOT TESTED` or `BLOCKED`.

## Critical Data Domains

| Domain | Entities | Main Writers | Status | Primary Risk |
|---|---|---|---|---|
| Ammunition stock | `Ammunition`, `AmmoSpending`, `SessionRecord` | UI pages, backend functions | NOT TESTED | Double deduction/refund and stale stock |
| Reloading components | `ReloadingComponent`, `ReloadingStock`, `BrassMovementLog` | Reloading forms, backend functions | NOT TESTED | Partial batch create/delete and unit conversion |
| Brass lifecycle | `ReloadingComponent`, `BrassMovementLog`, `ReloadingSession`, `Ammunition` | Reload batch functions/forms | NOT TESTED | Incorrect state transitions new/used/fired/retired |
| Firearm counters | `Rifle`, `Shotgun`, `CleaningHistory`, `MaintenanceAlert` | Session checkout/delete, cleaning functions | NOT TESTED | Counters not matching records |
| Shooting records | `SessionRecord`, `TargetShooting`, `ClayShooting`, `DeerManagement`, `DeerOuting`, `Harvest` | UI and backend delete/refund functions | NOT TESTED | Orphan records and inconsistent rollback |
| Load development | `ReloadingTest`, `ReloadingTestVariant`, `ReloadingTestResult` | Load Development UI | NOT TESTED | Variant stock deduction/restoration and SD convention |
| Scope/ballistics | `ScopeProfile`, `ScopeDistanceData`, `BallisticProfile` | Scope pages/forms | NOT TESTED | Linked distance/profile deletion safety |
| Area sharing | `Area`, `AreaShare`, `MapMarker`, `SharedClientOutingLog` | Stalking map/share accept flows | BLOCKED — REQUIRES MULTI-USER EXECUTION | Privacy and orphan shared records |

## Stock and Counter Mutation Inventory

| Operation | Initiating UI / Function | Authoritative Path Observed | Status | Risk |
|---|---|---|---|---|
| Target session checkout | `TargetShooting`, checkout modal/function paths | Mixed UI/backend direct writes | NOT TESTED | Ammo and rifle counters may diverge |
| Clay session checkout | `ClayShooting`, clay components | Mixed UI/backend writes | NOT TESTED | Gauge normalization and shotgun counters |
| Deer management checkout | `DeerManagement`, outing/session handlers | Mixed UI/backend writes | NOT TESTED | Harvest/session/ammo/counter linkage |
| Session record deletion/refund | `deleteSessionRecordWithRefund`, `restoreSessionStock`, Records UI | Backend functions plus UI triggers | NOT TESTED | Double refund/repeated delete risk |
| Reload batch create | `createReloadBatchWithAmmunition`, reload forms | Backend service-role function plus possible frontend paths | NOT TESTED | Partial component deduction if later create fails |
| Reload batch delete | `deleteReloadedAmmunitionWithSessionCleanup`, utility delete paths | Backend function and utility paths | NOT TESTED | Exact reversal and brass movement cleanup |
| Load variant create | `VariantFormModal` | Direct entity/component updates | NOT TESTED | Component stock deducted in UI without transaction proof |
| Load variant delete | `TestDetailPage.handleDeleteVariant` | Direct restoration and deletion | NOT TESTED | Repeated delete / partial restoration risk |
| Firearm cleaning | `markFirearmCleanedForUser`, cleaning components | Backend service-role function | NOT TESTED | Counter baselines and alert state |
| Ammo delete | `deleteAmmunitionForUser`, settings/armory pages | Backend and direct entity paths | NOT TESTED | Linked sessions/reloaded ammo cleanup |

## Example Required Test Matrices

### Target Session Stock

| Step | Expected | Status |
|---|---|---|
| Initial ammo stock 100 | record shows 100 | NOT TESTED |
| Create target session using 10 | ammo stock 90; rifle counter +10; spending +10 | NOT TESTED |
| Delete session | ammo stock 100; rifle counter restored; spending removed/reversed | NOT TESTED |
| Delete same session again | stock remains 100; no second refund | NOT TESTED |
| Repeat checkout double tap | one session/one deduction only | NOT TESTED |

### Reload Batch

| Step | Expected | Status |
|---|---|---|
| Initial bullets/primers/brass/powder known | exact quantities captured | NOT TESTED |
| Create reload batch of 50 | bullet -50, primer -50, powder exact conversion, brass state moved, ammo +50 | NOT TESTED |
| Backend failure during create | no partial stock corruption | NOT TESTED |
| Delete batch | exact reversal once | NOT TESTED |
| Delete batch again | no second reversal | NOT TESTED |

### Load Variant Component Deduction

| Step | Expected | Status |
|---|---|---|
| Create variant with stock deduction | component quantities reduced exactly | NOT TESTED |
| Edit variant | no unintended duplicate deduction | NOT TESTED |
| Delete variant | stock restored once | NOT TESTED |
| Delete parent test | variants/results/stock behaviour defined | NOT TESTED |

## Partial Failure Risks

| Risk | Evidence | Status | Impact |
|---|---|---|---|
| Multi-entity writes without database transaction | Backend functions and UI direct updates touch multiple entities | NOT TESTED | Partial records after failure |
| Service-role mutation functions | Several backend functions use service role after auth | NOT TESTED | Must verify business-rule authorization per record |
| Direct UI component stock writes | Load variant deletion/restoration uses frontend direct calls | NOT TESTED | Offline/concurrent failures may corrupt stock |
| Repeated delete/refund | Delete/refund paths exist across records/reloading/ammo | NOT TESTED | Double restoration/counter decrement |
| Stale stock | Direct reads then updates rather than atomic increments in some paths | NOT TESTED | Concurrent updates may overwrite |
| Offline queue replay | Offline queue retries mutations | BLOCKED | Duplicate mutations if idempotency insufficient |

## Duplicate Business Logic Risks

| Operation | Implementation A | Implementation B | Risk |
|---|---|---|---|
| Ammo loading | Direct `base44.entities.Ammunition.filter` | `listAmmunitionForUser` function / utility loaders | Inconsistent visibility and filters |
| Ammo create/update/delete | Settings/Armory direct calls | Backend create/update/delete functions | Divergent validation/security |
| Reload batch create | Frontend reloading forms | `createReloadBatchWithAmmunition` backend | Partial duplicate behaviour |
| Session deletion/refund | Records UI/utilities | `deleteSessionRecordWithRefund`, `restoreSessionStock` | Double refund or inconsistent reversal |
| PDF generation | Module-specific utilities | Shared/mobile PDF components | Inconsistent mobile handling |
| Offline CRUD | `getRepository` paths | Direct Base44 paths | Offline inconsistency |
| Calibre/gauge matching | Module-specific string comparisons | Utility/catalog-based selectors | Identity mismatches |

## Module-Specific Findings

### Reloading Management

Status: `NOT TESTED`.

Risks:

- Component deduction spans bullets, primers, powder, brass.
- Powder conversion grain/grams must be exact and consistent.
- Brass lifecycle has multiple fields: available, currently loaded, fired awaiting cleaning, retired, reload count.
- Reloaded ammunition creation links `Ammunition`, `ReloadingSession`, `ReloadingComponent`, `BrassMovementLog`.
- Delete/reversal must be idempotent.

### Load Development

Status: `NOT TESTED`.

Risks:

- Variant stock deduction/restoration is separate from reload batch logic.
- `ReloadingTestResult` supports both V2 readings and legacy velocity fields.
- Historical stored SD values may remain non-comparable unless provenance is honoured.
- PDF/export must not imply historical/manual statistics are calculated.

### Target Shooting

Status: `NOT TESTED`.

Risks:

- Multiple rifles per session appear supported through `rifles_used` shape.
- Stock/counter deductions must match each rifle/ammo line.
- Weather/location attachment may happen asynchronously.
- Delete/refund must exactly reverse all lines once.

### Clay Shooting

Status: `NOT TESTED` / device-blocked for voice.

Risks:

- Gauge identity variants may not normalize consistently.
- Clay shots/stands/scorecards are separate entities; deletion must cascade safely.
- Ammo stock and shotgun counters must align with scoring/checkout.

### Deer Management / Stalking

Status: `BLOCKED — REQUIRES DEVICE/MULTI-USER VERIFICATION` for many flows.

Risks:

- Outing, harvest, session record, ammo, rifle, and shared client log linkage can diverge.
- Background GPS updates can fail partially.
- Shared area access must not leak private POIs/harvests.

## Data Loss / Orphan Risks

| Scenario | Status | Risk |
|---|---|---|
| Delete rifle with linked sessions/load tests | NOT TESTED | Orphan session/test references |
| Delete ammunition linked to reload session/session records | NOT TESTED | Orphan records or broken stock history |
| Delete reload batch after ammo has been used | NOT TESTED | Negative stock or invalid session linkage |
| Delete area shared to client | BLOCKED | Shared area/log orphan privacy risk |
| Delete account | NOT TESTED | Cleanup may miss entities or delete shared data incorrectly |
| Offline delete then online edit on another device | BLOCKED | Conflict/data loss risk |

## Recommended Data Integrity Test Roadmap

P0 tests before growth:

1. Target checkout/deduction/refund exactly once.
2. Clay checkout/deduction/refund exactly once.
3. Reload batch create/delete exact component reversal.
4. Reloaded ammunition deletion after use.
5. Load variant deduction/edit/delete stock restoration.
6. User A/User B record isolation for every stock/session entity.
7. Offline create/edit/delete replay exactly once.
8. Duplicate tap protection on save/delete/checkout.
9. Linked firearm/ammunition deletion safety.
10. Account deletion dry-run/report mode before destructive execution.

## Overall Data Integrity Status

`NOT TESTED` for runtime correctness. Static inspection identifies significant risk due to distributed business logic, direct entity calls, multi-entity mutations, and limited automated tests.