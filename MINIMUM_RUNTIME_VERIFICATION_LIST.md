# Minimum Runtime Verification List

Goal: minimize Base44 credit usage by running only surgical runtime tests that static analysis cannot settle.

No tests should use real production records. Cross-user tests require dedicated test accounts. Destructive tests require disposable seeded data only.

---

## Required test account policy

The first five P0 tests remain:

`BLOCKED — REQUIRES DEDICATED TEST ACCOUNTS / TEST DATA`

Do not create accounts automatically. Required accounts:

- Dedicated User A
- Dedicated User B
- Dedicated Admin

---

## Runtime tests

| Test ID | Suspected issue | Exact function/entity/page | Why static analysis is insufficient | Required account | Required data | Exact steps | Expected result | Evidence capture | Cleanup | Safety classification | Effort |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MRT-001 | User A/User B Rifle isolation | Entity `Rifle`; settings/records references | Missing explicit RLS is not proof of exposure | User A, User B, Admin | One seeded User A rifle | User A creates rifle. User B attempts list/filter/get/update/delete by ID. Admin tests intended policy. | User B cannot see or mutate; Admin matches policy. | API responses, before/after record snapshot | Delete seeded rifle | REQUIRES DEDICATED TEST ACCOUNTS | LOW |
| MRT-002 | User A/User B Ammunition isolation | Entity `Ammunition`; `listAmmunitionForUser` | RLS/function ownership must be proven at runtime | User A, User B | User A ammo stock record | User B calls list UI/function and direct get/update/delete attempts by ID. | User B only sees own ammo and cannot mutate User A ammo. | Function responses, entity snapshots | Delete seeded ammo | REQUIRES DEDICATED TEST ACCOUNTS | LOW |
| MRT-003 | Cross-user service-role delete/refund denial | `deleteSessionRecordWithRefund`, `restoreSessionStock`, `SessionRecord` | Static ownership checks exist but must be proven with real auth context | User A, User B | User A target SessionRecord with test rifle/ammo/spending | User B invokes both functions using User A session ID. | 403/denial; no stock/counter/session mutation. | Function response and snapshots of ammo/rifle/session/spending before/after | User A/Admin deletes seeded data | REQUIRES DEDICATED TEST ACCOUNTS / DESTRUCTIVE TEST DATA | MEDIUM |
| MRT-004 | Target delete/retry idempotency | `deleteSessionRecordWithRefund`; Target Shooting | Static code shows multi-stage risk; only runtime proves exact counters | User A | Test rifle counter 0, ammo 100, completed target session using 10 | Delete once; retry delete same ID; optionally double-click delete. | Ammo 100 after first delete, rifle 0, record soft-deleted once, retry no further change. | Before/after snapshots of `Ammunition`, `Rifle`, `SessionRecord`, `AmmoSpending` | Delete seeded records/components | SAFE ON TEST DATA ONLY | MEDIUM |
| MRT-005 | Reload batch create/delete exact reversal | `createReloadBatchWithAmmunition`, reload delete utility/function | Static order is multi-step; runtime proves normal-path exactness | User A | Seeded primer/powder/brass/bullet | Create batch 10; delete batch; retry delete. | Components decrement then restore exactly once; ammo/session/log cleanup correct. | Component/ammo/session/brass log snapshots | Delete seeded reloading data | SAFE ON TEST DATA ONLY | MEDIUM |
| MRT-006 | Delete/refund partial failure after ammo refund | `deleteSessionRecordWithRefund` | Static risk severe, but actual platform failure behavior and retry effects need controlled proof | User A in preview/test only | Seeded target/deer records | Force failure after ammo refund but before final soft-delete; retry delete. | No double refund; if double refund occurs, capture exact state. | Function logs/responses and entity snapshots after failure/retry | Manual cleanup from snapshot | SAFE ON PREVIEW ONLY / FAILURE INJECTION | HIGH |
| MRT-007 | Manual record edit partial failure | `Records.jsx` edit flow, `restoreSessionStock`, `decrementAmmoStock` | Static order is non-atomic; runtime verifies actual impact | User A | Seeded existing manual/session record with ammo/counter | Edit record; force failure after restore and after update in separate runs. | Either rollback or clear recoverable error without stock drift. | Ammo/counter/session/spending snapshots | Restore seeded baseline | SAFE ON PREVIEW ONLY | HIGH |
| MRT-008 | Reload batch create partial failure | `createReloadBatchWithAmmunition` | Static order updates components before later creates; only controlled failure proves corruption | User A in preview/test only | Seeded components | Force failure after component update, after session create, after ammo create. | No orphan/deducted state, or exact defect captured. | Component/session/ammo/log snapshots | Manual reconciliation from snapshot | SAFE ON PREVIEW ONLY / FAILURE INJECTION | HIGH |
| MRT-009 | Offline queue 24h expiry behavior | `syncQueue.getPendingQueue`, `runSync` | Static evidence indicates stale in-memory return; runtime confirms whether expired entry syncs | User A | Local IndexedDB queue entry older than 24h | Create old pending entry in test harness; run sync. | Entry becomes EXPIRED and is not processed; if processed, capture defect. | IndexedDB before/after, server state, sync result | Remove queue entry/server record | SAFE ON TEST DATA | MEDIUM |
| MRT-010 | Offline conflict recovery visibility | `syncQueue`, `OfflineContext`, UI | Static found no recovery UI; runtime confirms user experience | User A | Test queued mutation causing 409/conflict | Trigger conflict and inspect app UI. | User can inspect/retry/discard/resolve; otherwise record blocked finding. | Screenshot/video, IndexedDB queue entry | Clear queue/test records | SAFE ON TEST DATA | MEDIUM |
| MRT-011 | Generic offline duplicate create after ambiguous network failure | `offlineEntityRepository`, `syncQueue` generic create | `_transactionId` is sent but dedup not proven | User A | One local-only test record | Simulate create request succeeds server-side but client treats as failed; rerun sync. | Exactly one server record. | Local queue, server records by unique marker | Delete created records | SAFE ON PREVIEW ONLY | HIGH |
| MRT-012 | Deer map offline delete asymmetry | `DeerStalkingMap.jsx`, `MapMarker`, `Harvest` | Static shows create repository/delete direct; runtime verifies user impact | User A | Test area, marker, harvest | Create offline, delete offline/reconnect; repeat for online-created local-deleted item. | Delete queues/replays correctly or clearly blocks offline. | UI screenshot, IndexedDB queue, server records | Delete seeded marker/harvest/area | SAFE ON TEST DATA | MEDIUM |
| MRT-013 | Clay gauge normalization | `ClayShooting.jsx` ammunition selector | Static equality risk needs product data verification | User A | Shotguns with gauges `12 Gauge`, `12 gauge`, `12ga`, `12 GA`, `12`; ammo equivalents | Open checkout selector for each pairing. | Expected matching policy works consistently. | Screenshots/listed options | Delete seeded shotguns/ammo | SAFE ON TEST DATA | LOW |
| MRT-014 | AmmoSpending cleanup linkage | `ammoUtils`, `deleteSessionRecordWithRefund`, `restoreSessionStock` | Static matching supports notes tags but legacy/new variations need runtime proof | User A | Target, clay, deer records with spending logs; include legacy-like spending rows | Delete/restore each and verify spending cleanup. | Correct spending rows removed exactly once; unrelated rows remain. | Spending snapshots before/after | Delete seeded data | SAFE ON TEST DATA ONLY | MEDIUM |
| MRT-015 | Records admin `User.list` failure isolation | `src/pages/Records.jsx` | Static says normal users guarded; admin failure could still block records | Admin test account | No destructive data | Simulate/observe User.list denial/failure for admin path if possible. | Records still load or failure is captured as admin-only risk. | Console/log/UI evidence | None | SAFE READ-ONLY | LOW |
| MRT-016 | Records PDF object URL cleanup | `Records.jsx` PDF preview | Static indicates stale cleanup; runtime confirms leak/user impact | Any test user | Several test records | Open/close PDF preview repeatedly; inspect object URL/memory where possible. | Object URLs revoked; no memory leak. | Browser devtools/memory/object URL evidence | None | SAFE READ-ONLY | LOW |
| MRT-017 | Reports/Records/Ammo/Reloading mobile PDF smoke | PDF/export modules | Static cannot prove iOS/TestFlight save/share/open behavior | Device/TestFlight user | Non-sensitive sample data | Run each export button: Reports, Records, AmmoSummary, Ammunition, Reloading PDF, QR print. | Preview/save/open/cancel behave acceptably; cancellation not reported as failure. | Device video/screenshots | Delete sample data if created | DEVICE BLOCKED | HIGH |
| MRT-018 | Account deletion cleanup | `deleteMyAccount` | Cannot be safely inferred or run on real account | Disposable User A only | Seed one record in each sensitive entity plus shared area data | Execute account deletion once; inspect remaining data and other users. | Only disposable user's intended data removed; no orphan sensitive records; others unaffected. | Full before/after entity inventory | Account is disposable; no rollback guaranteed | DESTRUCTIVE / DISPOSABLE ACCOUNT ONLY | HIGH |

---

## Tests intentionally excluded to save credits

- Broad “test the whole app” navigation sweeps.
- Repeating static lint/typecheck/audit until fixes are authorized.
- Re-running blocked P0 tests without dedicated accounts.
- Duplicate tests for every entity before the first representative User A/User B checks confirm the platform/RLS behavior.
- Load Development Milestone 2 tests; Milestone 2 is not started.

---

## Recommended minimum execution order

1. MRT-001
2. MRT-002
3. MRT-003
4. MRT-004
5. MRT-005
6. Stop and review evidence before failure-injection tests.

If any test reveals a failure: stop, document, do not fix without approval.