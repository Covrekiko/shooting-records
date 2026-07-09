# Full App Offline and Sync Audit

Read-only audit only. No offline logic, repository code, sync code, service worker, or direct entity calls were changed.

## Executive Summary

The app has a developed offline architecture: IndexedDB, an offline repository abstraction, sync queue, sync engine, connectivity manager, service worker, offline map support, and offline UI status. However static scanning shows many direct `base44.entities` calls remain in pages and contexts. This means offline behaviour is likely inconsistent by module. None of the required offline scenarios were executed during this audit.

## Offline Architecture Inventory

| Area | Files | Purpose | Status | Risk |
|---|---|---|---|---|
| IndexedDB/cache | `src/lib/offlineDB.js` | Local persistence | NOT TESTED | Schema migration/persistence not executed |
| Entity repository | `src/lib/offlineEntityRepository.js` | Offline-aware CRUD wrapper | NOT TESTED | Only used in some areas |
| Sync queue | `src/lib/syncQueue.js` | Durable mutation queue | NOT TESTED | TTL/retry/idempotency not executed |
| Sync engine | `src/lib/syncEngine.js` | Precache/user/offline sync orchestration | NOT TESTED | Stale cache/token behaviour untested |
| Connectivity | `src/lib/connectivityManager.js` | Online/offline detection | NOT TESTED | Known risk from previous audit: ping target may not prove API health |
| Offline provider | `src/context/OfflineContext.jsx` | UI/app sync state | NOT TESTED | Global status may not match module behaviour |
| Service worker | `public/sw.js` | PWA asset/offline support | NOT TESTED | Cache update/offline launch not executed |
| Offline field map | `src/components/maps/OfflineMapProvider.jsx`, `OfflineMapManager.jsx`, `offlineMapStore.js`, `offlineMapConfig.js` | Offline map areas/tiles | BLOCKED — REQUIRES DEVICE/MAP VERIFICATION | PMTiles/map rendering/storage not executed |
| Field sessions | `src/lib/offlineFieldSessions.js`, `sessionManager.js`, `trackingService.js` | Field/GPS persistence | BLOCKED — REQUIRES DEVICE VERIFICATION | Background GPS/native lifecycle not executed |

## Static Usage Counts

| Pattern | Count | Status | Meaning |
|---|---:|---|---|
| Direct frontend `base44.entities` references | 397 | VERIFIED PASS inventory | Large bypass surface for offline repository |
| `getRepository` references | 59 | VERIFIED PASS inventory | Offline wrapper exists but is not universal |
| Frontend backend function invokes | 29 | VERIFIED PASS inventory | Some operations centralized in backend |

## Direct Base44 Calls Bypassing Offline Layer

Examples observed:

- `src/context/OutingContext.jsx`
- `src/pages/Equipment.jsx`
- `src/pages/ScopeClickCard.jsx`
- `src/pages/Reports.jsx`
- `src/pages/Goals.jsx`
- `src/pages/DeerStalkingLogs.jsx`
- `src/pages/AmmoSummary.jsx`
- `src/pages/AreaShareAccept.jsx`

Status: `VERIFIED PASS` inventory only. Runtime offline effect: `NOT TESTED`.

## Offline Scenario Matrix

| Scenario | Expected | Status | Blocker / Risk |
|---|---|---|---|
| Start online → lose internet → create → edit → delete → reconnect | Exactly one synced final state | BLOCKED | Requires controlled network and sync observation |
| Launch already offline → create records → close app → reopen offline | Local records persist | BLOCKED | Requires device/browser storage execution |
| Remain offline 48 hours → reconnect | Expired queue handling documented and safe | BLOCKED | Long-duration test required |
| Same record changed on second device → reconnect | Conflict detected/resolved without silent overwrite | BLOCKED | Requires two devices/users/sessions |
| Tap sync twice | No duplicate mutation | BLOCKED | Runtime sync queue execution required |
| Partial sync failure | Failed item retries/dead-letter visible | BLOCKED | Fault injection required |
| Offline map open after cache | Map renders without network | BLOCKED — REQUIRES DEVICE/MAP VERIFICATION | Map tile/cache verification |
| Offline GPS tracking | Points persist and sync later | BLOCKED — REQUIRES DEVICE VERIFICATION | Background GPS/native lifecycle |

## Module Offline Readiness Assessment

| Module | Offline Intent | Static Evidence | Status | Risk |
|---|---|---|---|---|
| Target Shooting | Intended offline support | Some repository/offline structures exist | NOT TESTED | Direct calls may bypass queue |
| Clay Shooting | Intended offline support unclear | Direct and component paths exist | NOT TESTED | Checkout stock sync unproven |
| Deer Management | Field/offline relevant | Context and direct Base44 calls present | BLOCKED | GPS/session sync unproven |
| Stalking Map | Strong offline field need | Offline map components exist | BLOCKED — REQUIRES DEVICE/MAP VERIFICATION | Tile/cache/conflict unproven |
| Armory/Ammunition | Should support offline inventory | Direct calls and functions | NOT TESTED | Stock edits offline risky |
| Reloading | Should work offline for inventory | Mixed direct/backend paths | NOT TESTED | Multi-entity mutations offline risky |
| Load Development | Should support range offline use | Direct entity paths in module | NOT TESTED | Results/photos/PDF offline unproven |
| Reports/PDF | Offline useful | PDF generated client-side in places | NOT TESTED | Source data/cache completeness unknown |
| Admin | Online-only likely acceptable | Direct/backend functions | NOT TESTED | Offline not required but not documented |

## Sync Queue Risks

| Risk | Status | Impact |
|---|---|---|
| Mutation replay duplicates create/update/delete | BLOCKED | Stock/counter duplication |
| Temporary ID reconciliation fails | BLOCKED | Orphan child records |
| Delete replay after server-side delete | BLOCKED | Error loops or double refund |
| Queue TTL expires user data | BLOCKED | Data loss if user stays offline too long |
| Conflict resolution silently overwrites remote changes | BLOCKED | Data loss |
| Connectivity reports online when API unavailable | NOT TESTED | Sync attempts fail repeatedly |
| Token expiry during offline period | NOT TESTED | Sync blocked after reconnect |
| Mixed direct call and offline repository on same record | NOT TESTED | Local cache/server divergence |

## Offline UI Status

| UI | File | Status | Risk |
|---|---|---|---|
| Offline status bar | `OfflineStatusBar.jsx` | NOT TESTED | May not reflect per-module pending mutations |
| Pull-to-refresh indicator | `PullToRefreshIndicator.jsx` | NOT TESTED | Refresh while offline not executed |
| Mobile nav connectivity dot | `Navigation.jsx` | NOT TESTED | Indicator state not verified |
| Offline map manager | `OfflineMapManager.jsx` | BLOCKED | Storage limits/native behaviour |

## Required Offline Test Plan

P0/P1 test requirements:

1. One entity CRUD through repository while offline.
2. Same CRUD through every major page to identify direct-call failures.
3. Offline target session checkout and later sync.
4. Offline reload batch create and later sync.
5. Offline field outing with GPS track and later sync.
6. Offline photo capture/upload handling.
7. Sync duplicate-tap/parallel queue run.
8. Conflict with second device.
9. Queue TTL expiry after 48 hours.
10. App launch with no network and no cached profile.

## Overall Offline Status

`BLOCKED` for true offline proof. Static architecture exists, but direct Base44 calls remain widespread and runtime sync correctness is unproven.