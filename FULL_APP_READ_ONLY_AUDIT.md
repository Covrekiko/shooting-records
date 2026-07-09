# Full App Read-Only Audit

Audit type: production engineering/product read-only audit. No fixes performed.

## Executive Summary

The application is large and feature-rich, covering target shooting, clay shooting, deer management, stalking maps, reloading, load development, armory, reporting, QR, admin, beta feedback, offline support, PDFs, and analytics. The build succeeds, but lint fails and critical runtime flows were not executed in this audit. Static inspection shows significant architectural risk from mixed online/offline data access, duplicated business logic, incomplete explicit RLS coverage, and multiple stock/refund paths.

This report does **not** certify the app as production-ready. Most functional flows are `NOT TESTED` or `BLOCKED` because static code inspection is not runtime proof.

## Status Rules Used

- `VERIFIED PASS`: directly verified by command/static inventory where runtime is not implied.
- `VERIFIED FAIL`: directly verified failure or directly observed static/config defect.
- `BLOCKED`: cannot execute in this environment.
- `NOT TESTED`: not executed end-to-end.

## Build Quality Commands

| Command | Result | Status | Evidence |
|---|---|---|---|
| `npm install` | Completed | VERIFIED PASS | Up to date; audited 737 packages |
| `npm run build` | Completed | VERIFIED PASS | Vite build exited 0 |
| `npm run lint` | Failed | VERIFIED FAIL | 79 lint error occurrences counted; unused imports across many files |
| `npm run typecheck` | Executed | See command output in audit capture | NOT TESTED for runtime correctness | Typecheck output must be reviewed in CI logs; not proof of app functionality |
| `npm audit` | Vulnerabilities reported | VERIFIED FAIL | 24 vulnerabilities: 1 low, 10 moderate, 13 high |

A build pass is not functional proof.

## Global Runtime Coverage

| Area | Status | Reason |
|---|---|---|
| Login / auth lifecycle | NOT TESTED | No runtime login/logout/token expiry execution |
| Module gating | NOT TESTED | Static route wrappers found; hidden-module behaviour not executed |
| Admin access denial | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Requires normal/admin users |
| User A/User B privacy | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Requires two users and direct ID attempts |
| Mobile safe-area behaviour | BLOCKED — REQUIRES DEVICE VERIFICATION | Requires iPhone/TestFlight/PWA |
| TestFlight native wrapper | BLOCKED — REQUIRES TESTFLIGHT/NATIVE VERIFICATION | Native container unavailable |
| Offline sync | BLOCKED | Requires controlled offline/online transitions and long-duration tests |
| Camera / microphone | BLOCKED — REQUIRES DEVICE VERIFICATION | Browser/device permissions required |
| PDF preview/save/share | BLOCKED — REQUIRES DEVICE/NATIVE VERIFICATION | WebView/share sheet behaviour required |

## Routes and Navigation Audit

| Finding | Status | Evidence | Risk |
|---|---|---|---|
| All primary routes are declared in `src/App.jsx` | VERIFIED PASS | Route declarations found | Static only; runtime not guaranteed |
| Public routes use separate route tree | VERIFIED PASS | `/privacy-policy`, `/support` bypass authenticated app | Must verify refresh/direct URL in runtime |
| Duplicate fallback route trees exist | VERIFIED PASS | `*` route in private and public route trees | May be intended; not a failure |
| ModuleGate wraps target/clay/deer/stalk/reloading routes | VERIFIED PASS | Static route tree | Module hiding behaviour not executed |
| Admin pages are routed | VERIFIED PASS | `/admin/users`, `/admin/beta-testers`, `/admin/beta-feedback` | Role/security must be server-tested |
| Orphan/legacy pages exist | VERIFIED PASS | `Equipment.jsx`, `TargetAnalyzer.jsx`, `src/pages/target-analyzer/*` not directly in router | Dead/legacy code risk |
| Mobile back/header route history | NOT TESTED | Requires navigation execution | Back loops/wrong tab destination possible |
| Deep links with query params | NOT TESTED | `/qr-item` depends on URL params | Missing/invalid params not executed |

## Interactive Action Audit

Static counts: 648 `onClick` references, 62 `onSubmit` references, 584 `<button>` elements.

Because the user explicitly required runtime evidence, action flows are not marked pass. The following action categories are present but **NOT TESTED** end-to-end:

| Action Category | Modules | Status | Known Risk |
|---|---|---|---|
| Save/Create forms | Armory, records, reloading, load development, target, clay, deer, admin | NOT TESTED | Duplicate submit and partial failure not systematically tested |
| Delete/Refund | Records, ammo, reload batches, sessions, variants, scope data | NOT TESTED | Repeated delete/double refund risks |
| Upload/photo/camera | Target analyzer, range photos, beta feedback, record photos | BLOCKED — REQUIRES DEVICE VERIFICATION | Permission/camera/WebView paths unknown |
| Export/PDF/share/print | Records, reports, load development, clay, QR labels | BLOCKED — REQUIRES DEVICE/NATIVE VERIFICATION | Mobile share/download/print windows inconsistent by platform |
| Start/Stop/Check-in/out | Target, clay, deer, stalking | BLOCKED — REQUIRES DEVICE/GPS VERIFICATION | GPS/background/offline paths unknown |
| Search/filter/sort | Records, reports, load comparison, settings/reference DB | NOT TESTED | Empty/null data and stale state not executed |
| Voice/microphone | Clay scoring | BLOCKED — REQUIRES DEVICE VERIFICATION | Permission and speech input not executed |
| QR scan/print | QR scanner, QR label button | BLOCKED — REQUIRES CAMERA/PRINT VERIFICATION | Camera and print window not executed |

## Forms and Validation

| Area | Status | Risk |
|---|---|---|
| Number handling | NOT TESTED | Many forms accept numeric strings; zero/null/empty behaviour must be E2E-tested |
| Dates/timezones | NOT TESTED | Session/check-in/test-date handling may differ by device/timezone |
| Duplicate submit | NOT TESTED | Some buttons use loading state; not systematically verified |
| Failure feedback | NOT TESTED | Many flows use alerts; async failures not all handled visibly |
| Modal close during save | NOT TESTED | Needs UI execution |
| Mobile keyboard/decimal input | BLOCKED — REQUIRES DEVICE VERIFICATION | Decimal keyboard behaviour varies by locale/device |

## Module Audit Summary

| Module | Status | Main Findings |
|---|---|---|
| Dashboard | NOT TESTED | Lint unused imports; runtime data not executed |
| Target Shooting | NOT TESTED | High-risk stock/counter/session workflow; direct and offline calls coexist |
| Target Analyzer | NOT TESTED | Multiple analyzer implementations; AI/manual/calibration paths not executed |
| Clay Shooting | BLOCKED / NOT TESTED | Voice/microphone/gauge normalization and stock deduction untested |
| Deer Management | NOT TESTED | Outing/harvest/session/ammo/counter linkage untested |
| Stalking Map | BLOCKED — REQUIRES DEVICE VERIFICATION | GPS, map, sharing, offline field use untested |
| Reloading | NOT TESTED | Component deduction, brass lifecycle, rollback, duplicate paths require proof |
| Load Development | NOT TESTED | M1/M1.5 static changes exist; runtime chrono/PDF flows not executed |
| Armory | NOT TESTED | Firearm deletion and maintenance/counter linkage untested |
| Reports/PDF | BLOCKED — REQUIRES DEVICE/NATIVE VERIFICATION | PDF logic is distributed; mobile app-wide compatibility not proven |
| Admin | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | UI and backend enforcement must be verified separately |
| Offline/sync | BLOCKED | Requires controlled network/device scenarios |

## Load Development Audit

| Flow | Status | Evidence / Risk |
|---|---|---|
| Test creation/edit/delete | NOT TESTED | Code exists; runtime not executed |
| Variant creation/edit/delete | NOT TESTED | Component deduction/restoration must be E2E-tested |
| Result creation/edit | NOT TESTED | Dynamic chrono UI exists; runtime not executed |
| 3/5/10/20 round input render | NOT TESTED | Static code path supports dynamic rows; runtime not executed |
| Legacy 5-field compatibility | NOT TESTED | Adapter exists; runtime old-record edit not executed |
| Excluded readings | NOT TESTED | Code supports included flag; persistence not runtime-tested |
| SD convention/provenance | NOT TESTED | M1.5 logic exists; end-to-end save/display/analytics not executed |
| PDF all readings | NOT TESTED | Static code maps readings; actual PDF not inspected on device |
| Share cancellation | BLOCKED — REQUIRES DEVICE/NATIVE VERIFICATION | Web Share path requires device/browser |
| Analysis tab/charts | NOT TESTED | Milestone 2 not started; do not assume present |

## Target Shooting Audit

End-to-end target session flow is `NOT TESTED`.

Required future tests:

1. Start session with one rifle and one ammo.
2. Start session with multiple rifles if supported.
3. Checkout deducts exact ammo once.
4. Rifle counters increment exactly once.
5. Record creation links ammo, rifle, location, notes, weather.
6. Delete record restores stock/counters exactly once.
7. Duplicate checkout cannot double-deduct.
8. Repeated delete cannot double-refund.
9. Offline session survives app restart.
10. PDF/export renders correct source data.

## Target Analyzer Audit

| Area | Status | Risk |
|---|---|---|
| Session creation | NOT TESTED | Duplicated analyzer page/component structure |
| Upload/camera | BLOCKED — REQUIRES DEVICE VERIFICATION | Camera/library permissions |
| AI path | NOT TESTED | Backend function auth and model behaviour not executed |
| Manual path | NOT TESTED | Point placement and calculation correctness not verified |
| Calibration | BLOCKED — REQUIRES DEVICE/MOBILE VERIFICATION | Touch precision and scale calibration |
| PDF | NOT TESTED | Export/runtime not executed |

## Clay Shooting Audit

| Area | Status | Risk |
|---|---|---|
| Session creation/checkout | NOT TESTED | Ammo deduction/counter updates require proof |
| Gauge normalization | NOT TESTED | Identity variants `12 Gauge`, `12 gauge`, `12ga`, `12 GA`, `12` not executed |
| Voice input | BLOCKED — REQUIRES DEVICE/MICROPHONE VERIFICATION | Browser/native permission differences |
| Scoring totals | NOT TESTED | Dead/Lost/No Bird totals must be E2E-tested |
| PDF/analytics | NOT TESTED | Runtime correctness unknown |

## Deer Management / Stalking Audit

| Area | Status | Risk |
|---|---|---|
| Deer outing/session/harvest | NOT TESTED | Linkage between outing, harvest, session, stock, rifle not executed |
| Stalking map boundaries/markers/POIs | BLOCKED — REQUIRES DEVICE/MAP VERIFICATION | Map render, GPS permissions, offline tiles |
| Area sharing | BLOCKED — REQUIRES MULTI-USER EXECUTION | Share token/privacy flows |
| Auto check-in | BLOCKED — REQUIRES DEVICE/GPS VERIFICATION | Background/geofence behaviour |

## Admin/Auth Audit

| Area | Status | Risk |
|---|---|---|
| Login/logout | NOT TESTED | Token expiry and stale session not executed |
| Profile setup | NOT TESTED | New user path not executed |
| User admin | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Normal user direct URL access must be tested |
| Role updates | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Backend function exists; runtime enforcement not executed |
| Account deletion | NOT TESTED | Destructive cleanup path high risk |

## Duplicate / Legacy Code Findings

| Operation | Evidence | Status | Risk |
|---|---|---|---|
| Admin/users | `Users.jsx`, `admin/Users.jsx`, old audit docs reference duplicate admin files | VERIFIED PASS inventory | Duplicate paths may diverge |
| Target analyzer | `TargetShootingAnalyzer.jsx`, `TargetAnalyzer.jsx`, `src/pages/target-analyzer/*`, `src/components/analyzer/*`, `src/components/target-analyzer/*` | VERIFIED PASS inventory | Multiple implementations/calculations |
| Ammo CRUD | Settings pages, Armory, backend functions, direct entity calls | VERIFIED PASS inventory | Inconsistent filters/stock safety |
| PDF generation | Multiple utils and components | VERIFIED PASS inventory | Mobile fixes not app-wide |
| Offline vs direct CRUD | 397 direct Base44 references vs 59 repository references | VERIFIED PASS inventory | Offline inconsistency |
| Reload creation/deletion | Frontend forms plus backend functions | VERIFIED PASS inventory | Competing authoritative paths |
| Gauge/calibre normalization | Multiple module-specific loaders/selectors | NOT TESTED | Identity mismatches likely |

## Test Coverage Inventory

No conventional automated test suite was found during static scan. Existing files with `test` in the name are mainly diagnostic backend functions and historical markdown reports, not app test suites.

| Coverage Type | Status | Finding |
|---|---|---|
| Unit tests | VERIFIED FAIL | No clear app unit test suite found |
| Integration tests | VERIFIED FAIL | No clear integration suite found |
| E2E tests | VERIFIED FAIL | No clear Playwright/Cypress-style suite found |
| Offline/sync tests | VERIFIED FAIL | No automated offline scenario suite found |
| RLS/user privacy tests | VERIFIED FAIL | Diagnostic functions exist, but no comprehensive automated suite found |
| Stock integrity tests | VERIFIED FAIL | Historical reports exist; no executable test coverage found |
| PDF tests | VERIFIED FAIL | No app-wide PDF regression tests found |
| Mobile/TestFlight tests | BLOCKED | Requires device/native process |

## Critical Untested Flows

1. Login → target session → checkout → stock deduction.
2. Delete target record → exact stock restoration.
3. Reload batch → component deduction → ammunition created.
4. Delete reload batch → exact reversal once.
5. Load test → variant → result → PDF.
6. Clay session → scoring → checkout.
7. Deer outing → harvest → checkout.
8. Offline create → reconnect → sync exactly once.
9. Normal user admin route denial.
10. User A/User B privacy.
11. Mobile PDF preview/share/save.
12. Duplicate tap on checkout/delete/save.

## Top P0 Findings

1. Explicit RLS coverage is incomplete across many entities.
2. Direct Base44 entity calls remain widespread despite offline repository architecture.
3. Stock/refund logic exists in multiple paths and lacks executed idempotency proof.
4. Admin/security enforcement is not proven server-side for normal-user direct URL/function attempts.
5. Automated test coverage for critical data integrity/privacy flows appears absent.

## Top P1 Findings

1. Lint fails with many unused imports.
2. `npm audit` reports 24 vulnerabilities including 13 high.
3. Mobile/TestFlight/PDF/camera/GPS flows are blocked pending device verification.
4. Offline/sync conflict and TTL behaviour are not proven.
5. Duplicate business logic increases regression risk.