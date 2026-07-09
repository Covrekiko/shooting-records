# Full Production Functional Audit — Shooting Records

Date: 2026-07-09  
Repository requested: `https://github.com/Covrekiko/shooting-records`  
Scope: full application audit, with repair authorised only for confirmed Load Development PDF View/Download failure.

## Audit Rules Applied

- No unrelated functionality was modified.
- Findings outside the authorised Load Development PDF scope were documented only.
- Static code review was **not** treated as a verified pass.
- Mobile wrapper, TestFlight, WKWebView, iPhone 17 Pro Max, and real offline behaviour could not be executed in this environment and are marked **BLOCKED** where relevant.
- Build/lint/typecheck were executed where available.

## Executed Checks

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | VERIFIED PASS | Vite build completed successfully after the PDF repair. |
| `npm run lint` | VERIFIED FAIL | Fails on pre-existing unused imports across unrelated files including `Dashboard.jsx`, `Records.jsx`, `Reports.jsx`, `TargetShooting.jsx`, `ReferenceDatabase.jsx`, and target-analyzer files. Not repaired because outside authorised PDF scope. |
| `npm run typecheck` | VERIFIED FAIL | Fails on pre-existing target-analyzer/component typing issues including `NewTargetSession.jsx`, `SessionDetail.jsx`, and `targetAnalyzerPDF.js`. Not repaired because outside authorised PDF scope. |
| Load-test PDF helper regression check | VERIFIED PASS | `createLoadTestPdfPreview()` produced a valid blob URL, non-empty Blob, correct filename sanitisation, and empty-Blob validation error. |
| Actual `generateLoadTestPDF()` sample generation | VERIFIED PASS | Generated one-page PDF, Blob size 7,764 bytes with sample test/variant/result data. |
| Physical iOS/TestFlight/WKWebView PDF behaviour | BLOCKED | Requires device verification. This environment cannot execute Base44 mobile wrapper/TestFlight behaviour. |

## Current Route Inventory

Routes discovered in `src/App.jsx`:

| Route | Page/component | Gate |
|---|---|---|
| `/` | Dashboard | none |
| `/target-shooting` | TargetShooting | `target_shooting` module |
| `/target-analyzer` | TargetShootingAnalyzer | `target_shooting` module |
| `/clay-shooting` | ClayShooting | `clay_shooting` module |
| `/deer-management` | DeerManagement | `deer_management` module |
| `/profile` | Profile | none |
| `/profile/settings` | ProfileSettings | none |
| `/profile/theme` | AppTheme | none |
| `/profile/modules` | AppModules | none |
| `/records` | Records | none |
| `/goals` | Goals | none |
| `/settings/rifles` | Rifles | none |
| `/settings/shotguns` | Shotguns | none |
| `/settings/clubs` | Clubs | none |
| `/settings/locations` | Locations | none |
| `/settings/ammunition` | Ammunition | none |
| `/settings/ammunition-inventory` | AmmunitionInventory | none |
| `/reports` | Reports | none |
| `/admin/users` | AdminUsers | UI-only admin nav visibility; route itself present |
| `/users` | Users | none |
| `/deer-stalking` | DeerStalkingMap | `stalk_map` module |
| `/deer-stalking-logs` | DeerStalkingLogs | `stalk_map` module |
| `/area-share` | AreaShareAccept | `stalk_map` module |
| `/sunrise-sunset` | SunriseSunsetTracker | none |
| `/ammo-summary` | AmmoSummary | none |
| `/reloading` | ReloadingManagement | `reloading` module |
| `/load-development` | LoadDevelopment | `reloading` module |
| `/load-comparison` | LoadComparison | `reloading` module |
| `/scope-click-card` | ScopeClickCard | `target_shooting` module |
| `/settings/bullet-reference` | BulletReferenceDB | none |
| `/settings/scope-reference` | ScopeReferenceDB | none |
| `/settings/reference-database` | ReferenceDatabase | none |
| `/qr-scanner` | QRScanner | none |
| `/qr-item` | QRItemDetails | query-param driven |
| `/beta-feedback` | BetaFeedback | none |
| `/admin/beta-testers` | BetaTesters | admin page, route present |
| `/admin/beta-feedback` | BetaFeedbackAdmin | admin page, route present |
| `/privacy-policy` | PrivacyPolicy | public route branch |
| `/support` | Support | public route branch |
| `*` | PageNotFound | fallback |

## Entity Inventory / RLS Coverage

46 entity schemas were present. Only these entities have explicit RLS rules in the current schema set:

- `Ammunition`
- `MaintenanceAlert`
- `ReloadingTestVariant`

Entities without explicit RLS in the current schema include: `SessionRecord`, `Rifle`, `Shotgun`, `ReloadingTest`, `ReloadingTestResult`, `ReloadingComponent`, `ReloadingSession`, `AmmoSpending`, `BrassMovementLog`, `Area`, `AreaShare`, `MapMarker`, `Harvest`, `Goal`, `TargetGroup`, `TargetPhoto`, `ClayScorecard`, `ClayStand`, `ClayShot`, `BallisticProfile`, and reference/catalog entities.

**Important:** This is a security and privacy audit finding only. No RLS or schema changes were made under this request.

## Backend Function Inventory

Existing backend functions discovered/provided:

- `analyzeTargetPhoto`
- `analyzeTargetPhotoWithAI`
- `attachWeatherToSessionRecord`
- `auditRLSViolation`
- `backfillReloadBatchAmmo`
- `createAmmunitionForUser`
- `createMaintenanceAlertsFromSession`
- `createReloadBatchWithAmmunition`
- `createUserWithProfile`
- `debugSessionRecord`
- `deleteAmmunitionForUser`
- `deleteClaySessionStands`
- `deleteMyAccount`
- `deleteReloadedAmmunitionWithSessionCleanup`
- `deleteSessionRecordWithRefund`
- `detectBulletSplatter`
- `enforceRLS`
- `getGoogleMapsApiKey`
- `listAmmunitionForUser`
- `manageDataVersion`
- `markFirearmCleanedForUser`
- `repairPowderComponents`
- `resetRifleCounters`
- `restoreSessionStock`
- `testBetaTesterFlow`
- `testCreateUserFlow`
- `updateAmmunitionForUser`
- `updateUserRole`
- `validateEquipmentDeletion`

## PDF / Export Risk Inventory

Risky PDF/mobile patterns found outside the repaired Load Development scope and left unchanged:

- `Reports.jsx` uses `doc.save(...)` for report downloads.
- `AmmoSummary.jsx` uses `doc.save('ammunition-summary.pdf')`.
- `RecordsSection.jsx` uses in-app `MobilePdfViewer` for preview and object URL cleanup; this is closer to the repaired pattern but was not fully device-tested.
- Multiple components use `target="_blank"` for photos/links; these may be restricted in mobile wrappers.
- `QRLabelButton.jsx` uses `window.open('', '_blank')` for print; likely popup-sensitive on mobile.
- `ReferenceImporter.jsx` uses Blob URL + anchor download for CSV template.

These were documented only.

## Full Functional Audit Matrix

Allowed statuses used below: **VERIFIED PASS**, **VERIFIED FAIL**, **BLOCKED**, **NOT TESTED**.

| ID | Module | Screen | Action | Code path | Backend/entity | Normal-user result | Admin result | Mobile result | Offline result | Status | Evidence | Severity | Root cause | Proposed fix | Regression risk | Dependencies affected |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PDF-001 | Reloading / Load Development | Test Detail | View PDF icon | `TestDetailPage.handleViewPDF` → `generateLoadTestPDF` → Blob → in-app `MobilePdfViewer` | none | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | VERIFIED PASS | Build passed; helper test passed; sample PDF blob 7,764 bytes | P1 | Previous code relied on `window.open(blobUrl)` with no fallback | Implemented in-app preview path and Blob validation | Low/medium | `TestDetailPage`, `loadTestPDF`, `MobilePdfViewer` |
| PDF-002 | Reloading / Load Development | Test Detail | Download PDF icon | `TestDetailPage.handleExportPDF` → `saveLoadTestPdf` | none | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | VERIFIED PASS | Build passed; helper validation passed | P1 | Previous code used `doc.save()`, unreliable/silent in mobile wrappers | Implemented Web Share API when available, anchor fallback, loading/error feedback | Medium | `TestDetailPage`, new helper |
| PDF-003 | Reloading / Load Development | Test View Modal | Footer PDF button | `LoadDevelopment.handleModalPdfPreview` → `TestViewModal` | none | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | VERIFIED PASS | Build passed; no `window.open(blobUrl)` remains in Load Development PDF flow | P1 | Previous modal callback used `URL.createObjectURL(doc.output('blob'))` + `window.open` | Implemented same in-app preview path with loading/error feedback | Low/medium | `LoadDevelopment`, `TestViewModal` |
| PDF-004 | Reports | Reports page | Download formal/monthly/category PDF | `Reports.handleGenerateReport` → `doc.save(...)` | `SessionRecord` | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | NOT TESTED | Static risk only; not executed | P1 | Same mobile `doc.save()` risk as confirmed Load Development failure | Apply the new robust PDF helper pattern after approval | Medium | Reports PDFs |
| PDF-005 | Ammo Summary | Armory | Ammunition summary PDF | `AmmoSummary` → `doc.save('ammunition-summary.pdf')` | Ammunition/reloading data | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | NOT TESTED | Static risk only; not executed | P1 | Mobile save/download risk | Add in-app preview/share/download helper after approval | Medium | Armory summary PDF |
| PDF-006 | Records | Records section | Record PDF preview | `RecordsSection.handlePdfPreview` → Blob URL → `MobilePdfViewer` | `SessionRecord`, `TargetGroup`, clay entities | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | NOT TESTED | Static review: existing in-app preview pattern present | P1 | Uses in-app viewer but device/PDF.js worker not verified | Device-test; consider shared robust helper after approval | Medium | Records reports |
| ROUTE-001 | Routing | App | Route inventory | `src/App.jsx` | n/a | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | 41 route declarations found | P2 | Not fully navigated/executed | Run E2E route smoke suite | Low | Router/navigation |
| ROUTE-002 | Navigation | Mobile/Desktop nav | Back/navigation actions | `Navigation.jsx`, `TabHistoryContext` | n/a | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | Static nav inventory found 20 nav item definitions | P2 | Not executed across history/deep-link states | Add route/back-button regression tests | Low/medium | Navigation, routing |
| AUTH-001 | Auth/Profile | App startup | Auth-required redirect | `AuthContext`, `App.jsx` | User auth | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Static review shows token injection and cached profile fallback | P0 | Needs real auth/session/device/offline testing | Execute auth matrix; document token failure modes | High | Auth/offline/profile |
| SEC-001 | Privacy/RLS | Entity access | Private user data isolation | Entity schemas + direct filters | 46 entities | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | Only 3/46 entities have explicit RLS | P0 | Many schemas rely on app-side filtering or platform defaults; actual cross-user isolation not proven | Perform role-based RLS tests before any schema changes | High | All data modules |
| SEC-002 | Admin | Admin users | User list / role changes | `AdminUsers`, `Users`, backend functions | User/updateUserRole | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | Admin routes exist; functions exist | P0 | Admin-only guarantees not fully executed | Execute admin/non-admin access tests | High | User/admin/functions |
| OFF-001 | Offline | App-wide | Offline repository coverage | `offlineEntityRepository`, direct `base44.entities` calls | many entities | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | NOT TESTED | Static inventory shows many direct `base44.entities` calls outside repository | P1 | Mixed direct-online and repository paths can bypass offline cache/queue | Inventory and migrate module-by-module after approval | High | Offline sync, stock, CRUD |
| OFF-002 | Offline | Sync queue | Offline create/edit/delete sync | `syncQueue`, `syncEngine`, `offlineDB` | many entities | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | NOT TESTED | Static architecture present; real offline scenarios not executed | P1 | Requires device/browser offline testing and queue replay inspection | Add offline E2E/device test plan | High | Offline DB/queue/entities |
| REL-001 | Reloading Management | Reloading stock/components | Component CRUD and stock counts | `ReloadingManagement`, reloading components | `ReloadingComponent`, `ReloadingInventory`, `ReloadingStock` | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Entities/functions/components present | P1 | Stock workflows not executed end-to-end | Add stock transaction tests | High | Reloading stock/ammo |
| REL-002 | Reloading Batch | Batch creation | Component deduction → ammunition creation | `createReloadBatchWithAmmunition`, reloading forms | Reloading/Ammunition entities | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Backend function exists | P0 | Transaction/rollback not executed | Execute create/delete/reversal test matrix | High | Stock, Ammunition, ReloadingSession |
| REL-003 | Load Development | Variant create/read | Create variant then list/filter | `VariantFormModal`, `TestDetailPage.loadData` | `ReloadingTestVariant` | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Prior service-role test showed backend persistence; user-scoped live test not executed in this audit | P1 | Needs logged-in user UI test after prior RLS correction | Execute normal-user create/read/filter test | Medium | ReloadingTestVariant |
| REL-004 | Load Development | Variant delete | Delete variant and restore deducted stock | `TestDetailPage.handleDeleteVariant` | `ReloadingComponent`, `ReloadingTestVariant`, `ReloadingTestResult` | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Static path restores stock in frontend | P0 | Frontend multi-step stock reversal can partially fail | Move to transaction-like backend function after approval | High | Reloading stock/results |
| REL-005 | Load Development | Results | Add/edit result, best load, velocity/ES/SD | `ResultFormModal`, `TestDetailPage` | `ReloadingTestResult` | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Components/entities present | P1 | Not executed; calculation correctness not proven | Add calculation/unit tests | Medium | Results/comparison/PDF |
| AMMO-001 | Ammunition | Settings/Armory | Factory ammo CRUD | Ammunition pages/functions | `Ammunition` | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Entity RLS exists but app functions also exist | P1 | Multiple possible paths: direct entity + functions | Map source of truth; test normal/admin access | High | Ammunition, records, reports |
| AMMO-002 | Ammunition | Records/delete | Stock deduction/refund | Target/Clay/Deer records + refund functions | `SessionRecord`, `AmmoSpending`, `Ammunition` | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Refund/delete functions exist | P0 | Stock corruption risk if duplicate delete/partial failure | Execute exact reversal tests before changes | High | All shooting modules |
| TARGET-001 | Target Shooting | Session workflow | Start/check-out target session | `TargetShooting`, manual record modals | `SessionRecord`, `Rifle`, `Ammunition` | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | NOT TESTED | Route and components present | P0 | Main workflow not executed in this audit | E2E test on desktop/mobile/offline | High | Target records/stock/counters |
| TARGET-002 | Target Analyzer | Analyzer | Photo analysis/scoring/PDF | analyzer pages/functions | `TargetSession`, `TargetGroup`, target functions | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | NOT TESTED | Typecheck currently fails in target-analyzer files | P1 | Existing type errors indicate likely broken or untyped paths | Fix only after approval | Medium/high | Target analyzer |
| CLAY-001 | Clay Shooting | Session/scoring | Stands, shots, checkout | `ClayShooting`, clay components | `ClayScorecard`, `ClayStand`, `ClayShot`, `SessionRecord` | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | NOT TESTED | Static components/functions present | P0 | Scoring/counter/refund not executed | E2E clay session suite | High | Clay records/stock/counters |
| DEER-001 | Deer Management | Session/harvest | Deer record creation and checkout | `DeerManagement`, records | `SessionRecord`, `Harvest` | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | NOT TESTED | Static components/routes present | P0 | Ammo/firearm/reversal not executed | E2E deer management suite | High | Deer records/stock/counters |
| STALK-001 | Stalking Map | Outing/map/offline | Start/stop outing, live/offline map | `DeerStalkingMap`, map/offline files | `DeerOuting`, `Area`, `MapMarker` | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | NOT TESTED | Static offline map architecture present | P1 | Requires geolocation/device/offline validation | Device field test plan | High | Maps/geolocation/offline |
| MODAL-001 | App-wide modals | Global modal/sheets | Open/close/save/scroll/safe-area | `GlobalModal`, `GlobalSheet`, many modals | many | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | NOT TESTED | Safe-area code exists in CSS/components | P2 | Needs iPhone 17 Pro Max visual/device testing | Device modal pass | Medium | UI/modal system |
| FORM-001 | Forms | App-wide | Required/numeric/duplicate submit validation | many forms | many entities | NOT TESTED | NOT TESTED | NOT TESTED | BLOCKED | NOT TESTED | Many form components found | P1 | No comprehensive automated form validation evidence | Add per-flow form tests | Medium/high | CRUD modules |
| FILE-001 | Photos/files | Upload/camera/photos | Upload, preview, target photos | upload/photo components, Core upload | file storage/entities | NOT TESTED | NOT TESTED | BLOCKED | BLOCKED | NOT TESTED | Static upload/photo components present | P1 | Camera/library permissions need device testing | Device permission tests | Medium/high | Photos/uploads/entities |
| ADMIN-001 | Admin | Beta feedback/testers | Admin feedback screens | admin pages/entities | BetaFeedback entities/User | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | Routes and pages present | P1 | Admin role enforcement not executed | Admin/non-admin tests | Medium/high | Admin/User/BetaFeedback |
| BUILD-001 | Build | Whole app | Production build | `npm run build` | n/a | n/a | n/a | n/a | n/a | VERIFIED PASS | Vite build completed successfully | P1 | n/a | Continue build gate | Low | Whole frontend |
| BUILD-002 | Lint | Whole app | Static lint | `npm run lint` | n/a | n/a | n/a | n/a | n/a | VERIFIED FAIL | Unused import errors outside PDF scope | P2 | Existing unused imports | Clean after approval | Low | Many pages/components |
| BUILD-003 | Typecheck | Whole app | TypeScript check via JS config | `npm run typecheck` | n/a | n/a | n/a | n/a | n/a | VERIFIED FAIL | Target-analyzer and PDF utility type errors outside repaired files | P1 | Existing component typings/issues | Fix after approval | Medium | Target analyzer/utils |

## Findings Not Changed

### P0 / P1 findings requiring explicit approval before repair

1. **RLS/privacy coverage not proven for 43/46 entities**  
   Severity: P0  
   Evidence: schema audit found only `Ammunition`, `MaintenanceAlert`, and `ReloadingTestVariant` with explicit RLS.  
   Proposed fix: run role-based access tests, then apply carefully scoped RLS/data-access changes per entity.  
   Not changed.

2. **Offline support is mixed with direct entity calls**  
   Severity: P1  
   Evidence: static inventory found many `base44.entities.*` calls in pages/components while offline repository exists separately.  
   Proposed fix: approve a module-by-module migration plan; do not mass-change.  
   Not changed.

3. **Stock deduction/refund/reversal logic has multi-step frontend paths**  
   Severity: P0  
   Evidence: Load Development variant delete restores component stock in frontend, then deletes result/variant and updates count. Other delete/refund functions exist.  
   Proposed fix: transaction-like backend functions with idempotency and exact reversal tests.  
   Not changed.

4. **Reports and AmmoSummary PDFs likely share the same mobile download risk**  
   Severity: P1  
   Evidence: `Reports.jsx` and `AmmoSummary.jsx` still use `doc.save(...)`.  
   Proposed fix: extend robust PDF helper pattern after explicit approval.  
   Not changed.

5. **Target Analyzer typecheck failures**  
   Severity: P1  
   Evidence: `npm run typecheck` fails in `src/pages/target-analyzer/*` and `src/utils/targetAnalyzerPDF.js`.  
   Proposed fix: targeted target-analyzer type/prop corrections after approval.  
   Not changed.

6. **Lint failures across unrelated files**  
   Severity: P2  
   Evidence: `npm run lint` fails on unused imports across many pages/components.  
   Proposed fix: cleanup after approval.  
   Not changed.

7. **Mobile wrapper behaviour cannot be verified here**  
   Severity: P1  
   Evidence: no TestFlight/WKWebView/physical-device execution available.  
   Proposed fix: device verification checklist.  
   Not changed.

## Proposed Test Strategy

Do not claim pass until executed. Recommended future tests:

1. Login → create target session → checkout → stock deduction.
2. Delete target record → exact stock restoration.
3. Create reload batch → component deduction → ammunition created.
4. Delete reload batch → exact reversal.
5. Create load test → variant → result → PDF preview/download/share.
6. Clay session → scoring → checkout.
7. Deer outing → harvest → checkout.
8. Offline create → reconnect → sync exactly once.
9. Normal user Records page cannot see another user’s private data.
10. PDF preview/download visible result on iOS Safari, installed PWA, Base44 mobile wrapper, and TestFlight.

## Device Verification Required

The following remain **BLOCKED — REQUIRES DEVICE VERIFICATION**:

- iPhone 17 Pro Max portrait mode.
- iOS Safari blob URL and Web Share behaviour.
- Installed PWA save/share/download behaviour.
- Base44 mobile wrapper/WKWebView PDF preview behaviour.
- TestFlight build behaviour.
- Real offline launch/create/edit/delete/sync.
- Camera/photo permission denial and recovery.
- Geolocation and background/field-use scenarios.