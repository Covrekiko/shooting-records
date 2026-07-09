# Full App Read-Only Inventory

Audit scope: current `main` at `2b2b654 File changes`.

Evidence standard: static repository inspection plus build-quality commands only. Runtime flows are marked `NOT TESTED` unless explicitly executed. Device/native checks are marked `BLOCKED`.

## Repository Totals

| Item | Count | Status |
|---|---:|---|
| Tracked files | 489 | VERIFIED PASS |
| React pages | 49 | VERIFIED PASS |
| React components | 203 | VERIFIED PASS |
| Base44 entities | 46 | VERIFIED PASS |
| Backend functions | 29 | VERIFIED PASS |
| Hooks | 8 | VERIFIED PASS |
| Context providers | 5 | VERIFIED PASS |
| Lib/util files | 58 | VERIFIED PASS |
| UI action handlers (`onClick`) | 648 | VERIFIED PASS |
| Form submit handlers (`onSubmit`) | 62 | VERIFIED PASS |
| Button elements | 584 | VERIFIED PASS |
| Direct frontend `base44.entities` references | 397 | VERIFIED PASS |
| `getRepository` references | 59 | VERIFIED PASS |
| Frontend `functions.invoke` references | 29 | VERIFIED PASS |

## App Shell / Providers

| Name | File | Purpose | Status | Reachability | Risk |
|---|---|---|---|---|---|
| App router | `src/App.jsx` | Defines routes and wrappers | VERIFIED PASS | Root app | ModuleGate routes wrap only selected modules; public/private split exists |
| AuthProvider | `src/lib/AuthContext.jsx` | Authentication state | NOT TESTED | Global | Runtime token expiry, stale cached user, deleted-user behaviour not executed |
| QueryClientProvider | `src/lib/query-client.js` | Query cache provider | NOT TESTED | Global | No end-to-end cache invalidation test executed |
| OfflineProvider | `src/context/OfflineContext.jsx` | Offline/sync state | NOT TESTED | Global | Direct entity calls bypass offline repository in many places |
| ModulesProvider | `src/context/ModulesContext.jsx` | Module enablement | NOT TESTED | Global | Module hiding is not server security |
| OutingProvider | `src/context/OutingContext.jsx` | Active deer outing state | NOT TESTED | Global | Uses direct Base44 calls and GPS updates |
| TabHistoryProvider | `src/context/TabHistoryContext.jsx` | Mobile tab/back history | NOT TESTED | Global | Back behaviour not runtime-tested |
| ThemeProvider | `src/context/ThemeContext.jsx` | Theme settings | NOT TESTED | Global | Mobile rendering not device-tested |
| ErrorBoundary | `src/components/ErrorBoundary.jsx` | App-level crash fallback | NOT TESTED | Global | Recovery path not executed |
| MobileTabBar | `src/components/MobileTabBar.jsx` | Bottom navigation | NOT TESTED | Mobile | Destination correctness not executed on device |
| Navigation | `src/components/Navigation.jsx` | Desktop/mobile top navigation | NOT TESTED | Global | Header back behaviour not executed on all routes |

## Routes Inventory

| Route | Page / Wrapper | Module / Gate | Status | Direct URL / Refresh | Known Risk |
|---|---|---|---|---|---|
| `/` | `Dashboard` | none | NOT TESTED | NOT TESTED | Dashboard imports have lint failures |
| `/target-shooting` | `TargetShooting` via `ModuleGate` | `target_shooting` | NOT TESTED | NOT TESTED | Large stock/session/offline flow unexecuted |
| `/target-analyzer` | `TargetShootingAnalyzer` via `ModuleGate` | `target_shooting` | NOT TESTED | NOT TESTED | Analyzer also has legacy sibling pages under `src/pages/target-analyzer` not routed here |
| `/clay-shooting` | `ClayShooting` via `ModuleGate` | `clay_shooting` | NOT TESTED | NOT TESTED | Gauge identity and voice input not executed |
| `/deer-management` | `DeerManagement` via `ModuleGate` | `deer_management` | NOT TESTED | NOT TESTED | Harvest/session linkage not executed |
| `/profile` | `Profile` | none | NOT TESTED | NOT TESTED | Role/module settings runtime not executed |
| `/profile/settings` | `ProfileSettings` | none | NOT TESTED | NOT TESTED | Account update paths not executed |
| `/profile/theme` | `AppTheme` | none | NOT TESTED | NOT TESTED | Theme persistence not executed |
| `/profile/modules` | `AppModules` | none | NOT TESTED | NOT TESTED | Module enable/disable runtime behaviour not executed |
| `/records` | `Records` | none | NOT TESTED | NOT TESTED | PDF/delete/refund flows not executed |
| `/goals` | `Goals` | none | NOT TESTED | NOT TESTED | Goal CRUD not executed |
| `/settings/rifles` | `settings/Rifles` | none | NOT TESTED | NOT TESTED | Linked-data deletion safety not executed |
| `/settings/shotguns` | `settings/Shotguns` | none | NOT TESTED | NOT TESTED | Linked-data deletion safety not executed |
| `/settings/clubs` | `settings/Clubs` | none | NOT TESTED | NOT TESTED | Location/map fields not executed |
| `/settings/locations` | `settings/Locations` | none | NOT TESTED | NOT TESTED | Location geodata not executed |
| `/settings/ammunition` | `settings/Ammunition` | none | NOT TESTED | NOT TESTED | Multiple ammo loaders exist |
| `/settings/ammunition-inventory` | `settings/AmmunitionInventory` | none | NOT TESTED | NOT TESTED | Factory/reloaded deletion linkage not fully executed |
| `/reports` | `Reports` | none | NOT TESTED | NOT TESTED | Report/PDF coverage is incomplete |
| `/admin/users` | `admin/Users` | UI/admin area | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | BLOCKED | Server enforcement must be tested with normal user |
| `/users` | `Users` | likely legacy user page | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | BLOCKED | Duplicate admin/user management path risk |
| `/deer-stalking` | `DeerStalkingMap` via `ModuleGate` | `stalk_map` | BLOCKED — REQUIRES DEVICE VERIFICATION | BLOCKED | GPS/map/offline/native required |
| `/deer-stalking-logs` | `DeerStalkingLogs` via `ModuleGate` | `stalk_map` | NOT TESTED | NOT TESTED | Broad list calls present |
| `/area-share` | `AreaShareAccept` via `ModuleGate` | `stalk_map` | NOT TESTED | NOT TESTED | Token share/privacy requires multi-user test |
| `/sunrise-sunset` | `SunriseSunsetTracker` | none | BLOCKED — REQUIRES DEVICE/LOCATION VERIFICATION | BLOCKED | Location/timezone correctness not verified |
| `/ammo-summary` | `AmmoSummary` | none | NOT TESTED | NOT TESTED | Armory counters depend on multiple entities |
| `/reloading` | `ReloadingManagement` via `ModuleGate` | `reloading` | NOT TESTED | NOT TESTED | Component deduction/reversal critical |
| `/load-development` | `LoadDevelopment` via `ModuleGate` | `reloading` | NOT TESTED | NOT TESTED | Dynamic chrono verified statically only; runtime flows not executed |
| `/load-comparison` | `LoadComparison` via `ModuleGate` | `reloading` | NOT TESTED | NOT TESTED | Ranking uses derived data; runtime not executed |
| `/scope-click-card` | `ScopeClickCard` via `ModuleGate` | `target_shooting` | NOT TESTED | NOT TESTED | Ballistic inputs and linked distance data untested |
| `/settings/bullet-reference` | `BulletReferenceDB` | none | NOT TESTED | NOT TESTED | Import/catalog paths not executed |
| `/settings/scope-reference` | `ScopeReferenceDB` | none | NOT TESTED | NOT TESTED | Reference data paths not executed |
| `/settings/reference-database` | `ReferenceDatabase` | none | NOT TESTED | NOT TESTED | Settings navigation not executed |
| `/qr-scanner` | `QRScanner` | none | BLOCKED — REQUIRES DEVICE CAMERA VERIFICATION | BLOCKED | Camera permission/native wrapper required |
| `/qr-item` | `QRItemDetails` | query-string path | NOT TESTED | NOT TESTED | Deep link with missing/invalid query not executed |
| `/beta-feedback` | `BetaFeedback` | none | NOT TESTED | NOT TESTED | Upload/comment/admin workflow not executed |
| `/admin/beta-testers` | `BetaTesters` | admin | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | BLOCKED | Server enforcement not verified |
| `/admin/beta-feedback` | `BetaFeedbackAdmin` | admin | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | BLOCKED | Server enforcement not verified |
| `/privacy-policy` | `PrivacyPolicy` | public special route | NOT TESTED | NOT TESTED | Public route isolation not executed |
| `/support` | `Support` | public special route | NOT TESTED | NOT TESTED | Public route isolation not executed |
| `*` | `PageNotFound` | fallback | NOT TESTED | NOT TESTED | Duplicate fallback exists for public/private route trees |

## Pages Present But Not Directly Routed In `App.jsx`

| Page | Path | Status | Risk |
|---|---|---|---|
| Equipment | `src/pages/Equipment.jsx` | VERIFIED PASS inventory only | Orphan/legacy page unless linked elsewhere |
| TargetAnalyzer | `src/pages/TargetAnalyzer.jsx` | VERIFIED PASS inventory only | Possible duplicate/legacy analyzer path |
| target-analyzer/AddGroup | `src/pages/target-analyzer/AddGroup.jsx` | VERIFIED PASS inventory only | Not directly routed in current App router |
| target-analyzer/AmmoComparison | `src/pages/target-analyzer/AmmoComparison.jsx` | VERIFIED PASS inventory only | Not directly routed in current App router |
| target-analyzer/AnalyzerReports | `src/pages/target-analyzer/AnalyzerReports.jsx` | VERIFIED PASS inventory only | Not directly routed in current App router |
| target-analyzer/NewTargetSession | `src/pages/target-analyzer/NewTargetSession.jsx` | VERIFIED PASS inventory only | Not directly routed in current App router |
| target-analyzer/RifleAccuracyHistory | `src/pages/target-analyzer/RifleAccuracyHistory.jsx` | VERIFIED PASS inventory only | Not directly routed in current App router |
| target-analyzer/SessionDetail | `src/pages/target-analyzer/SessionDetail.jsx` | VERIFIED PASS inventory only | Not directly routed in current App router |
| target-analyzer/SessionsList | `src/pages/target-analyzer/SessionsList.jsx` | VERIFIED PASS inventory only | Not directly routed in current App router |

## Component Inventory By Area

| Area | Representative Files | Status | Known Risk |
|---|---|---|---|
| Core navigation/layout | `Navigation`, `MobileTabBar`, `OfflineStatusBar`, `ModuleGate`, `ErrorBoundary` | NOT TESTED | Mobile/device behaviour not executed |
| Modal/sheet system | `GlobalModal`, `GlobalSheet`, `BottomSheet`, `AppModal`, `AppUnifiedModal`, `AppBottomSheet`, shadcn dialog/drawer/sheet | NOT TESTED | Multiple modal abstractions; safe-area consistency must be device-tested |
| Records | `RecordCard`, `RecordDetailModal`, `RecordsSection`, `ManualRecordModal`, `RecordsList`, `RecordsPagination` | NOT TESTED | Delete/refund/PDF pathways are high risk |
| Reloading | `ReloadingSessionForm`, `ReloadBatchForm`, `ComponentManager`, `AddComponentModal`, `BrassLifecycleManager`, `ReloadingStockInventory` | NOT TESTED | Multiple component stock paths and brass lifecycle paths |
| Load Development | `CreateTestModal`, `VariantFormModal`, `ResultFormModal`, `ChronographReadingsEditor`, `TestDetailPage`, `TestViewModal`, `ComparisonScoreCard` | NOT TESTED | Runtime chrono/PDF/UI not executed; SD provenance present but must be E2E tested |
| Target Analyzer | `TargetPhotoAnalyzer`, `ManualGroupForm`, `GroupCard`, `AIPhotoComparison`, `MobileScaleCalibrationSheet`, duplicated analyzer directories | NOT TESTED | Calculation duplication and mobile calibration risks |
| Clay | `ClayScorecard`, `ShotByShotEditor`, `StandFormWrapper`, `ClayCheckoutSummary`, `ClayAnalyticsDashboard`, `ScorecardShareButton` | NOT TESTED | Voice/microphone and gauge normalization require runtime/device tests |
| Deer/Stalking | `OutingModal`, `HarvestModal`, `AreaDrawer`, `AreaSelector`, `OfflineFieldMap`, `FloatingActionBar`, `POIModal`, `LiveClientMapModal` | BLOCKED — REQUIRES DEVICE VERIFICATION | GPS/background/offline/native interaction risks |
| Armory | `CleaningActionButton`, `CleaningLogPanel`, `CleaningStatusBadge`, `AmmoEditModal`, `AmmoStockWidget`, `RifleAmmoTracker`, `ShotgunCartridgeTracker` | NOT TESTED | Linked deletion and counter integrity untested |
| Maps | `GoogleMapsWrapper`, `LocationMap`, `BoundaryMapEditor`, `BoundaryMapViewer`, `GpsPathViewer`, `OfflineMapProvider`, `OfflineMapManager` | BLOCKED — REQUIRES DEVICE/NETWORK VERIFICATION | API key, offline tiles, geolocation, map rendering |
| QR | `QRLabelButton`, `QRScanner`, `QRItemDetails` | BLOCKED — REQUIRES DEVICE CAMERA / PRINT VERIFICATION | Camera and print windows not tested |
| Admin | `CreateUserForm`, admin pages, beta tester/admin feedback pages | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | UI hiding is not server enforcement |

## Entity Inventory

46 entities exist. Explicit RLS is present on only a small subset. Full RLS findings are in `FULL_APP_SECURITY_RLS_AUDIT.md`.

Entities include: `AmmoSpending`, `Ammunition`, `Area`, `AreaShare`, `AuditLog`, `BallisticProfile`, `BetaFeedbackComment`, `BetaFeedbackPost`, `BrassMovementLog`, `BulletReference`, `ClayScorecard`, `ClayShooting`, `ClayShot`, `ClayStand`, `CleaningHistory`, `Club`, `DeerLocation`, `DeerManagement`, `DeerOuting`, `Goal`, `Harvest`, `MaintenanceAlert`, `MapMarker`, `ReloadingBrassCatalog`, `ReloadingBulletCatalog`, `ReloadingComponent`, `ReloadingInventory`, `ReloadingPowderCatalog`, `ReloadingPrimerCatalog`, `ReloadingSession`, `ReloadingStock`, `ReloadingTest`, `ReloadingTestResult`, `ReloadingTestVariant`, `Rifle`, `ScopeDistanceData`, `ScopeProfile`, `ScopeReference`, `SessionRecord`, `SharedClientOutingLog`, `Shotgun`, `TargetGroup`, `TargetPhoto`, `TargetSession`, `TargetShooting`, `User`.

## Backend Function Inventory

29 backend functions exist: `analyzeTargetPhoto`, `analyzeTargetPhotoWithAI`, `attachWeatherToSessionRecord`, `auditRLSViolation`, `backfillReloadBatchAmmo`, `createAmmunitionForUser`, `createMaintenanceAlertsFromSession`, `createReloadBatchWithAmmunition`, `createUserWithProfile`, `debugSessionRecord`, `deleteAmmunitionForUser`, `deleteClaySessionStands`, `deleteMyAccount`, `deleteReloadedAmmunitionWithSessionCleanup`, `deleteSessionRecordWithRefund`, `detectBulletSplatter`, `enforceRLS`, `getGoogleMapsApiKey`, `listAmmunitionForUser`, `manageDataVersion`, `markFirearmCleanedForUser`, `repairPowderComponents`, `resetRifleCounters`, `restoreSessionStock`, `testBetaTesterFlow`, `testCreateUserFlow`, `updateAmmunitionForUser`, `updateUserRole`, `validateEquipmentDeletion`.

## Utilities / Services / Repositories

| Area | Files | Status | Risk |
|---|---|---|---|
| Offline repository | `src/lib/offlineEntityRepository.js`, `offlineDB.js`, `syncQueue.js`, `syncEngine.js`, `connectivityManager.js` | NOT TESTED | App still contains many direct Base44 calls |
| PDF utilities | `recordsPdfExport`, `professionalRecordsPdf`, `loadTestPDF`, `clayScorecardPDF`, `targetAnalyzerPDF`, `scopePdfExport`, `brassPdfExport`, `pdfGenerators` | NOT TESTED | Mobile/WebView PDF behaviour not app-wide verified |
| Stock/business logic | `ownedAmmunition.js`, `ammoUtils.js`, `reloadingDeleteUtils.js`, backend delete/create functions | NOT TESTED | Competing frontend/backend paths |
| Geolocation/GPS | `trackingService.js`, `sessionManager.js`, `useGeolocation.js`, `offlineFieldSessions.js` | BLOCKED — REQUIRES DEVICE VERIFICATION | Background/native behaviour unknown |
| Analytics | `analytics.js`, chart components, module analytics components | NOT TESTED | Some charts have lint-unused imports; runtime data correctness unknown |
| Permissions | `appPermissions.js`, `cameraPermissionHandler.js`, `AppPermissionsPrompt`, `AppPermissionsPanel` | BLOCKED — REQUIRES DEVICE/ROLE VERIFICATION | Browser/native permission edge cases not executed |

## Reachability Summary

| Category | Status | Notes |
|---|---|---|
| App routes in `App.jsx` | VERIFIED PASS inventory | 41 Route declarations including fallbacks |
| Direct route runtime behaviour | NOT TESTED | No browser navigation execution in this audit |
| Mobile tab destinations | NOT TESTED | Requires preview/device execution |
| Header back action | NOT TESTED | Requires route history execution |
| Admin route enforcement | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Multi-role execution not available in this audit |
| QR/camera/geolocation/native | BLOCKED — REQUIRES DEVICE VERIFICATION | Physical device/TestFlight required |