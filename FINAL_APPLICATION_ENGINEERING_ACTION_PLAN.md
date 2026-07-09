# Final Application Engineering Action Plan

Mode: future planning only. This file does not implement fixes and does not authorize changes.

Each action must be approved before implementation. Runtime tests that are BLOCKED require dedicated test accounts/test data first.

---

## PHASE A — SECURITY AND DATA INTEGRITY

| Action ID | Linked finding | Priority | Exact problem | Exact evidence | Likely files/modules affected | Schema impact | RLS impact | Stock impact | Offline impact | Regression risk | Prerequisites | Required tests | Order | Rollback requirement |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| A-001 | P0-CAND-001 | P0 | Cross-user entity privacy is unproven | Many sensitive entities lack explicit RLS; runtime User A/B tests blocked | all `base44/entities/*.jsonc`, frontend filters | Possible | Possible | None direct | Possible cache/privacy | High | Dedicated User A/User B/Admin | Entity list/filter/get/update/delete matrix | 1 | Revert RLS per-entity if access breaks |
| A-002 | P0-CAND-002 | P0 | Service-role destructive functions require negative authorization proof | Elevated functions accept client IDs and mutate via service role | backend functions using `asServiceRole` | None likely | Possible | High for stock funcs | None direct | High | Dedicated accounts/seeded records | User B invokes each function with User A IDs | 2 | Revert function auth guard if false positive breaks valid calls |
| A-003 | Service-role matrix | P0/P1 | Admin/user-management functions require normal-user denial proof | `createUserWithProfile`, `updateUserRole`, test functions | admin/backend functions | None | None | None | None | High | Test normal user/admin | Normal user 403, admin success on disposable user only | 3 | Restore prior function after failed deployment |
| A-004 | Account deletion | P0/P1 | Account deletion safety unproven | `deleteMyAccount` is destructive and service-role backed | `deleteMyAccount`, account UI, shared entities | Possible | Possible | Possible | Possible | Very high | Disposable account with seeded data | Dry-run-style inventory if added, then deletion in disposable account only | 4 | Backup/export before test; rollback may be impossible |
| A-005 | RLS matrix catalog ambiguity | P2 | Catalog/reference public vs private policy is unclear | catalog entities lack explicit RLS | reference DB modules/entities | Possible | Possible | None | Cache impact | Medium | Product decision | User/admin visibility tests | 5 | Revert policy if catalog access breaks |

---

## PHASE B — TRANSACTION / STOCK / REFUND SAFETY

| Action ID | Linked finding | Priority | Exact problem | Exact evidence | Likely files/modules affected | Schema impact | RLS impact | Stock impact | Offline impact | Regression risk | Prerequisites | Required tests | Order | Rollback requirement |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| B-001 | P1-001/P0-CAND-003 | P0/P1 | Delete/refund is non-transactional | `deleteSessionRecordWithRefund` refunds ammo before counter reversal and final flags | `deleteSessionRecordWithRefund`, `Records.jsx`, `ammoUtils` | Maybe idempotency fields | No | High | No | Very high | Seeded stock/session records | Delete once/retry/concurrent; forced failure after refund | 1 | Restore old function and reconcile seeded data |
| B-002 | P1-002 | P1 | Manual edit restore/update/reapply can partially fail | `Records.jsx` lines 165-190 independent calls | `Records.jsx`, `restoreSessionStock`, `ammoUtils` | Maybe edit transaction ID | No | High | Medium | High | Seeded records | Edit failure after restore, after update, rapid double save | 2 | Restore old edit path and data snapshot |
| B-003 | P1-010 | P1 | Online checkout mutates counters/stock before session save | Target/Clay/Deer checkout order | `TargetShooting`, `ClayShooting`, `DeerManagement`, `OutingContext` | Maybe transaction fields | No | High | High | High | Seeded sessions | Force session update failure after stock mutation | 3 | Revert checkout transaction changes |
| B-004 | P0-CAND-004 | P0/P1 | Reload batch create lacks atomic rollback | component deductions occur before session/ammo/log creation | `createReloadBatchWithAmmunition`, `ReloadBatchForm` | Maybe transaction fields | No | High | No | Very high | Seeded components | Failure injection after component update, after session create, after ammo create | 4 | Restore old function; manually reconcile test stock |
| B-005 | Duplicate paths | P1 | Refund/restore paths are duplicated | `deleteSessionRecordWithRefund` and `restoreSessionStock` both restore stock by different logic | backend functions, `Records.jsx` | Maybe | No | High | Medium | High | B-001/B-002 results | Regression suite for all categories | 5 | Keep old function available until replacement proven |
| B-006 | AmmoSpending linkage | P1 | Spending log matching relies on notes/session tags plus optional fields | `ammoUtils` writes `notes: session:<id>`; delete function matches `session_id` or notes | `ammoUtils`, delete/refund funcs, `AmmoSpending` | Maybe add explicit `session_id` | No | Medium | No | Medium | Schema decision | Legacy and new spending cleanup tests | 6 | Backward-compatible migration only |

---

## PHASE C — OFFLINE AND SYNC RELIABILITY

| Action ID | Linked finding | Priority | Exact problem | Evidence | Likely files/modules affected | Schema impact | RLS impact | Stock impact | Offline impact | Regression risk | Prerequisites | Required tests | Order | Rollback requirement |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| C-001 | P1-003 | P1 | 24h expiry processing returns stale pending entries once | `syncQueue.getPendingQueue()` marks DB rows expired but filters old `all` | `syncQueue.js`, `syncEngine` | None | No | Possible | High | Medium | Offline harness | Entry older than 24h does not sync and is visible as expired | 1 | Revert queue function |
| C-002 | P1-005 | P1 | No user recovery UI for conflict/expired queue entries | No UI consumer for `getAllQueueEntries`, `CONFLICT`, `EXPIRED` found | Offline status UI, new conflict center | None | No | Possible | High | Medium | C-001 decision | Create conflict/expired entry and resolve/retry/discard | 2 | Hide feature flag if unstable |
| C-003 | P1-004 | P1 | Generic `_transactionId` is not proven exactly-once | Generic create/update only attaches ID | `syncQueue.js`, repositories, backend if needed | Maybe dedup fields | No | High if stock entities | High | High | Decide dedup semantics | Duplicate create after network ambiguity | 3 | Backward-compatible dedup only |
| C-004 | P1-006/P1-007 | P1 | Offline-aware and direct-online paths are mixed | mixed file list identified | Target/Clay/Deer/Records/Map/OutingContext | None likely | No | Medium | High | High | C-001/C-002 | Offline create/update/delete/reconnect per page | 4 | Revert per module |
| C-005 | Deer map delete asymmetry | P1 | MapMarker/Harvest create repository, delete direct online | `DeerStalkingMap.jsx` lines 261/296 vs 401/411 | `DeerStalkingMap`, repository | None | No | None | High | Medium | C-002 | Delete offline-created marker/harvest offline then reconnect | 5 | Revert delete path |

---

## PHASE D — CORE WORKFLOW RELIABILITY

| Action ID | Linked finding | Priority | Problem | Evidence | Files/modules | Schema impact | RLS impact | Stock impact | Offline impact | Regression risk | Prerequisites | Tests | Order | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| D-001 | P1-008 | P1 | Clay gauge/caliber strict equality can hide valid ammo | `ClayShooting.jsx` uses `a.caliber === selectedShotgun.gauge` | `ClayShooting`, ammo utilities | None | No | Medium | Low | Medium | Define gauge normalization | 12 Gauge/12 gauge/12ga/12 GA/12 selector tests | 1 | Revert selector normalization |
| D-002 | Ammo loader consistency | P1 | Ammunition selectors use mixed loaders/filters | `loadOwnedAmmunitionWithReloads`, repository/direct filters | Target/Clay/Deer/Map/settings | None likely | No | Medium | Medium | Medium | D-001 | Factory/reloaded/archived/deleted ownership tests | 2 | Feature-flag loader if needed |
| D-003 | Records admin `User.list` dependency | P2 | Admin Records load still depends on `User.list` inside outer catch | `Records.jsx` guarded for admin only but User.list failure can stop admin records load | `Records.jsx` | None | No | None | Low | Low | None | Admin User.list failure simulation | 3 | Revert display-name lookup |
| D-004 | Reload legacy/edit paths | P1/P2 | Reloading edit path direct-updates metadata; creation blocked | `ReloadingManagement.jsx` lines 76-85 | Reloading management/forms | None | No | Medium | Low | Medium | B-004 | Edit does not alter stock/rounds | 4 | Revert edit guard |

---

## PHASE E — MOBILE / PDF / DEVICE

| Action ID | Linked finding | Priority | Problem | Evidence | Files/modules | Schema impact | RLS impact | Stock impact | Offline impact | Regression risk | Prerequisites | Tests | Order | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| E-001 | P1-009 | P1/P2 | Records PDF object URL cleanup likely stale | `Records.jsx` cleanup closes over `pdfUrl` state | `Records.jsx` | None | No | None | No | Low | None | Open/close preview repeatedly; memory/object URL check | 1 | Revert effect only |
| E-002 | PDF matrix | P1 | App has inconsistent export paths | `doc.save`, object URL, window.open, iframe, MobilePdfViewer all present | Reports, Records, AmmoSummary, Reloading, QR, utils | None | No | None | Low | Medium | Device matrix | iOS/TestFlight save/share/cancel/open tests | 2 | Per-module revert |
| E-003 | QR print window | P2 | Print popup flow untested on mobile | `QRLabelButton` uses `window.open` print window | QR label module | None | No | None | No | Low | Device | Print/open/cancel on mobile/desktop | 3 | Revert QR print change if needed |
| E-004 | Camera/photo flows | P1/P2 | Camera/file uploads require device verification | Target/Clay/Deer photo upload paths | PhotoUpload, session pages | None | No | None | Offline upload constraints | Medium | Device/TestFlight | Camera permission, upload, cancel, offline | 4 | Revert per module |

---

## PHASE F — ENGINEERING QUALITY

| Action ID | Linked finding | Priority | Problem | Evidence | Files/modules | Schema impact | RLS impact | Stock impact | Offline impact | Regression risk | Prerequisites | Tests | Order | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| F-001 | VF-001 | P1 | No critical automated regression suite | static scan | test infrastructure | None | No | None | None | Medium | Stabilize P0/P1 specs | RLS, stock, offline, PDF smoke | 1 | Remove failing test changes if blocking deploy |
| F-002 | VF-003 | P2 | Typecheck failure hides runtime contract issues | 513 errors | app-wide | None | No | Possible | Possible | Medium | Prioritize runtime-risk files | Typecheck targeted modules first | 2 | Revert module-by-module |
| F-003 | VF-002 | P2 | Lint failure/unused import debt | 79 errors | app-wide | None | No | None | None | Low | F-002 or after | Lint clean | 3 | Revert cleanup if side effects break |
| F-004 | Dependency triage | P1/P2 | Advisories need reachability-based remediation | 24 audit advisories | package dependencies | None | No | None | None | Medium/High | Lockfile backup, test suite | PDF/lodash/runtime smoke after updates | 4 | Restore lock/package files |

---

## PHASE G — PRODUCT GROWTH

| Action ID | Linked finding | Priority | Problem/opportunity | Evidence | Files/modules likely affected | Schema impact | RLS impact | Stock impact | Offline impact | Regression risk | Prerequisites | Required tests | Order | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| G-001 | Product priorities | P3 | Sync Conflict Center builds trust and supports field use | Offline matrix | new UI + syncQueue | No/low | No | Possible | High | Medium | C-001/C-002 | Conflict/expired recovery tests | 1 | Feature flag |
| G-002 | Product priorities | P3 | Data Health Center helps detect stock/counter drift | Stock risks | new diagnostics | Maybe diagnostic entities | No | High | Medium | Medium | B-phase diagnostics | Known-drift detection tests | 2 | Feature flag |
| G-003 | Product priorities | P3 | Unified Firearm Profile high user value | product roadmap | firearm/records/maintenance | Maybe | privacy scoped | Counter dependent | cache dependent | Medium | A/B/C stable | firearm aggregation tests | 3 | Feature flag |
| G-004 | Product priorities | P3 | Professional reports can support premium | product roadmap | PDF/report modules | No | No | No | Low | Medium | E-phase stable | mobile/desktop export matrix | 4 | Revert report module |
| G-005 | Product priorities | P3 | Proven Load Lifecycle subscription value | roadmap + LD state | Reloading/Load Development | Maybe | No | High | Low | High | B-004 stable; no Milestone 2 until approved | reload lifecycle tests | 5 | Feature flag |

---

## Implementation rule

Do not begin any phase until the owner approves that phase and its test prerequisites. Findings in the final audit do not authorize automatic fixes.