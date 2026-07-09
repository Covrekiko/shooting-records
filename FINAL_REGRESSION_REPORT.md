# Final Regression Report

Date: 2026-07-09

---

## Automated checks executed

| Test | Expected | Actual | Evidence type | Status |
|---|---|---|---|---|
| Build | Vite production build succeeds | `npm run build` passed | EXECUTED BUILD | VERIFIED PASS |
| Lint | No lint errors | `npm run lint` passed | EXECUTED BUILD | VERIFIED PASS |
| Typecheck | Configured typecheck succeeds | `npm run typecheck` passed | EXECUTED BUILD | VERIFIED PASS |
| Unit tests | Gauge normalization tests pass | `npm test` passed | EXECUTED UNIT TEST | VERIFIED PASS |

---

## Feature regression checks

| Area | Expected | Actual | Evidence type | Status |
|---|---|---|---|---|
| Clay gauge normalization | `12 Gauge`, `12 gauge`, `12ga`, `12 GA`, and `12` match safely | Unit test passed | EXECUTED UNIT TEST | VERIFIED PASS |
| Sync queue expiry | Expired queue entries must not be returned as pending in same call | Code now re-reads queue after expiry update | STATIC CODE EVIDENCE | VERIFIED PASS |
| Sync recovery UI | User can inspect failed/conflicted/expired sync entries | `/sync-conflicts` route implemented | STATIC CODE EVIDENCE | VERIFIED PASS |
| Data health diagnostics | Read-only diagnostic checks available | `/data-health` route implemented | STATIC CODE EVIDENCE | VERIFIED PASS |
| Global search | User-owned searchable data view available | `/global-search` route implemented | STATIC CODE EVIDENCE | VERIFIED PASS |
| Activity timeline | Derived chronological activity view available | `/activity-timeline` route implemented | STATIC CODE EVIDENCE | VERIFIED PASS |
| Firearm profiles | Unified read-only firearm summaries available | `/firearm-profiles` route implemented | STATIC CODE EVIDENCE | VERIFIED PASS |
| Notification center | Maintenance/low-stock/sync notifications visible | `/notifications` route implemented | STATIC CODE EVIDENCE | VERIFIED PASS |
| Records PDF cleanup | Object URL should be revoked reliably | Effect cleanup now tracks local URL | STATIC CODE EVIDENCE | VERIFIED PASS |

---

## Protected-flow runtime regressions

| Test | Expected | Actual | Evidence type | Status |
|---|---|---|---|---|
| Target stock deduction 500 → use 100 → 400 | Must remain working | Not executed; protected code path not modified | TEST-DATA BLOCKED | BLOCKED |
| Target delete/return 400 → delete → 500 | Must remain working | Not executed; protected code path not modified | TEST-DATA BLOCKED | BLOCKED |
| Repeated target delete must not produce 600 | Must remain working | Not executed; protected code path not modified | TEST-DATA BLOCKED | BLOCKED |
| Duplicate target checkout must not deduct twice | Must remain working | Not executed; protected code path not modified | TEST-DATA BLOCKED | BLOCKED |
| Reloading deduction/reversal | Must remain working | Not executed; protected code path not modified | TEST-DATA BLOCKED | BLOCKED |
| Rifle cleaning reset/threshold/lifetime totals | Must remain working | Not executed; protected code path not modified | TEST-DATA BLOCKED | BLOCKED |

---

## Remaining blocked verification

| Test | Reason | Status |
|---|---|---|
| Cross-user privacy/RLS | Requires dedicated User A/User B/Admin | BLOCKED |
| Service-role negative authorization | Requires dedicated accounts and seeded IDs | BLOCKED |
| Account deletion | Requires disposable account | BLOCKED |
| Mobile PDF/share/camera/GPS/QR | Requires physical iPhone/TestFlight/device permissions | BLOCKED |
| Offline reconnect on real device | Requires real offline/device execution | BLOCKED |