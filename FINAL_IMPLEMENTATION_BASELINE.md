# Final Implementation Baseline — Shooting Records

Date: 2026-07-09  
Mode: implementation baseline before functional/source changes

---

## 1. Current HEAD SHA

`cec86165239e1f55caa92b29fc4e4d0937e45f30`

Branch: `main`

Rollback point: current HEAD before any implementation changes.

---

## 2. Current working-tree state before implementation

Baseline git check returned a clean working tree:

```text
statusShort: empty
diffStat: empty
untracked audit reports: empty
```

The previously produced audit reports are present in the repository state and must not be deleted.

---

## 3. Baseline build result

Command:

```text
npm run build
```

Result:

```text
PASS
```

Evidence type: `EXECUTED BUILD`

---

## 4. Baseline lint result

Command:

```text
npm run lint
```

Result:

```text
FAIL
```

Representative output shows unused-import errors, for example:

```text
src/components/BottomSheet.jsx — ChevronDown unused
src/components/Charts.jsx — ScatterChart/Scatter unused
src/components/GpsPathViewer.jsx — useRef unused
src/components/Navigation.jsx — QrCode/useRef unused
src/components/OfflineStatusBar.jsx — Wifi/CheckCircle2 unused
```

Classification:

- primary category: unused imports
- priority: engineering-quality cleanup unless a missing/invalid import is also present
- protected-flow impact: none if only unused imports are removed

Evidence type: `EXECUTED BUILD`

---

## 5. Baseline typecheck result

Command:

```text
npm run typecheck
```

Result:

```text
FAIL
```

Representative output includes:

```text
GlobalModal prop typing reports missing subtitle/footer on callers
Rifles/Shotguns number/string typing errors
Target analyzer UI component prop typing errors
```

Classification:

- mixed type quality and potential runtime-relevant signature/prop defects
- must be fixed in priority order
- do not alter protected stock/reversal/cleaning logic merely to satisfy types

Evidence type: `EXECUTED BUILD`

---

## 6. Protected working flows

The following user-confirmed working flows are protected:

1. Target Shooting ammunition deduction
   - example: 500 → use 100 → 400
2. Target Shooting delete / ammunition return
   - example: 400 → delete 100-use record → 500
3. Reloading stock/component deduction and reversal
4. Rifle cleaning / maintenance behaviour
5. Firearm round-count behaviour tied to the above working flows

Rule applied:

`PRESERVE CURRENT WORKING IMPLEMENTATION` unless an exact current defect is proven with caller, failure condition, regression tests, and rollback.

---

## 7. Findings selected for repair first

Selected because they can be improved without rewriting protected stock/reversal/cleaning flows:

| Finding | Classification | Planned action |
|---|---|---|
| Lint unused imports | VERIFIED DEFECT / engineering quality | Remove unused imports only; no logic changes. |
| Type-only component prop declarations | VERIFIED DEFECT in type surface | Fix prop defaults/types where runtime behaviour is unchanged. |
| Offline sync expired/conflict visibility | STRONG STATIC DEFECT / product reliability | Add user-facing inspection/recovery without rerouting protected stock paths. |
| Clay gauge matching | STRONG STATIC DEFECT if selector hides valid equivalent gauge labels | Implement narrowly-scoped gauge normalization utility after caller inspection; do not alter rifle caliber matching. |
| Records PDF object URL cleanup | STRONG STATIC DEFECT | Fix cleanup only, no report logic redesign. |
| Load Development Analysis upgrade | Authorised product upgrade | Additive UI/data-analysis features preserving existing Milestone 1/1.5 work. |
| Global Search / Activity Timeline / Data Health / Sync Conflict Center | Authorised product upgrades | Add derived/read-only or safe user-owned views first. |

---

## 8. Findings intentionally not modified at baseline

| Finding | Reason |
|---|---|
| Target Shooting stock deduction internals | User-confirmed working protected flow; static architecture risk alone does not authorize modification. |
| Target Shooting delete/return internals | User-confirmed working protected flow; runtime test data unavailable. |
| Reloading deduction/reversal internals | User-confirmed working protected flow; do not rewrite without proven defect. |
| Rifle cleaning/counter semantics | User-confirmed working protected flow. |
| Broad RLS redesign | Missing explicit RLS is not proof of public access; dedicated User A/User B tests are blocked. |
| Forced partial-failure transaction redesign | Requires isolated seeded failure-injection tests. |
| Account deletion runtime verification | Requires disposable account. |
| Device/TestFlight validation | Requires physical device/TestFlight. |

---

## 9. Blocked runtime tests

The following remain blocked:

- Cross-user Rifle isolation
- Cross-user Ammunition isolation
- User B negative service-role delete/refund attempt
- Target delete/retry exact stock idempotency
- Reload batch create/delete exact reversal
- Account deletion safety
- Mobile/TestFlight PDF/camera/GPS/QR verification

Status:

`BLOCKED — REQUIRES DEDICATED TEST ACCOUNTS / TEST DATA / DEVICE`

---

## 10. Rollback strategy

- Baseline rollback point: `cec86165239e1f55caa92b29fc4e4d0937e45f30`
- For code changes: use small, isolated batches and inspect `git diff --stat` after each phase.
- For protected-flow-adjacent files: preserve old behaviour and keep changes UI/type/guard-only unless defect is proven.
- For new product upgrades: prefer additive files/components/routes over invasive rewrites.
- For dependencies: no `npm audit fix --force`; update only targeted groups with build/test after each group.
- For schema changes: stop if destructive migration is required.

---

## 11. Immediate next implementation phase

Proceed with Phase 2 limited to:

1. lint cleanup for unused imports only;
2. runtime-relevant type/build defects that do not alter protected stock/reversal/cleaning logic;
3. re-run build/lint/typecheck;
4. inspect diff before continuing.