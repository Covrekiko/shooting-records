# Full Offline Audit

Date: 2026-05-03  
Scope: Offline architecture audit only, plus confirmed bottom-tab onboarding visibility bug.  
Database lock: No entity schemas, Reloading/Ammunition schemas, stock model, brass lifecycle maths, stock restore/refund logic, entity fields, or entity relationships were changed.

## Files inspected

### GitHub repository
- `https://github.com/Covrekiko/shooting-records`
- GitHub tree inspected through `https://api.github.com/repos/Covrekiko/shooting-records/git/trees/main?recursive=1`
- Raw GitHub files inspected:
  - `public/sw.js`
  - `src/components/MobileTabBar.jsx`

### Local app files inspected
- `App.jsx` from existing context only; not changed
- `main.jsx`
- `lib/AuthContext.jsx`
- `pages/ProfileSetup`
- `components/MobileTabBar`
- `context/OfflineContext.jsx`
- `lib/offlineDB.js`
- `lib/syncQueue.js`
- `lib/syncEngine.js`
- `lib/offlineSupport.js`
- `lib/offlineEntityRepository.js`
- `lib/connectivityManager.js`
- `lib/sessionManager.js`
- `components/OfflineStatusBar`
- `context/OutingContext.jsx`
- `pages/TargetShooting`
- `pages/ClayShooting`
- `pages/DeerManagement`
- `pages/DeerStalkingMap`
- `components/deer-stalking/OutingModal`
- `components/deer-stalking/MapClickHandler`
- `components/GoogleMapsWrapper`
- `components/LocationMap`
- `pages/AmmoSummary`
- `pages/ReloadingManagement`

## 1. Current offline system found

The app already has an offline-first layer built around:

- `OfflineProvider` in `context/OfflineContext.jsx`
- `connectivityManager` in `lib/connectivityManager.js`
- `offlineDB` in `lib/offlineDB.js`
- `syncQueue` in `lib/syncQueue.js`
- `syncEngine` in `lib/syncEngine.js`
- `offlineEntityRepository` in `lib/offlineEntityRepository.js`
- Service worker registration in `main.jsx`
- Service worker implementation in `public/sw.js`

The architecture supports:

- Local IndexedDB storage for selected entities
- A durable sync queue for offline create/update/delete actions
- Online/offline state tracking
- Pending sync count
- Sync retry when internet returns
- A visible offline/sync status bar

However, the app does not consistently use the offline repository everywhere. Many important pages still call `base44.entities.*` directly, which means those pages may fail or become read-only/broken offline even though the lower-level offline infrastructure exists.

## 2. Service worker status

Service worker registration exists in `main.jsx`:

- Registers `/sw.js`
- Uses `SKIP_WAITING`
- Reloads once after controller change

`public/sw.js` provides:

- App shell caching for `/` and `/manifest.json`
- Network-first navigation fallback to cached root shell
- Cache-first static assets
- External GET resources cache-first
- API requests intentionally network-only

This is a reasonable app-shell strategy, but it does not cache Base44 API responses. Data offline is handled separately through IndexedDB.

## 3. IndexedDB / localStorage / cache usage

### IndexedDB

`lib/offlineDB.js` creates `ShootingRecordsOfflineDB`, version `4`, with stores:

- `user_profile`
- `sessions`
- `rifles`
- `shotguns`
- `clubs`
- `locations`
- `ammunition`
- `areas`
- `map_markers`
- `harvests`
- `deer_outings`
- `reloading_sessions`
- `reloading_components`
- `reloading_stock`
- `reloading_inventory`
- `cleaning_history`
- `ammo_spending`
- `sync_queue`
- `meta`

### Cache API

`public/sw.js` uses Cache Storage for:

- App shell
- JS/CSS/static assets
- Some external GET resources

### localStorage/sessionStorage

Observed usage includes:

- Cached auth/profile handling indirectly via offline DB
- Active session helper using `sessionStorage`
- Permission prompt storage recently added via per-user localStorage keys
- Camera permission session flags

## 4. What data is cached

`preCacheUserData(userEmail)` caches:

- `SessionRecord`
- `Rifle`
- `Shotgun`
- `Club`
- `Area`
- `Ammunition`
- `MapMarker`
- `Harvest`
- `ReloadingComponent`
- `ReloadingSession`
- `CleaningHistory`
- `DeerOuting`
- `AmmoSpending`
- `ReloadingInventory`

The entity store map also supports:

- `ReloadingStock`

Important limitation: data is only useful offline where the UI actually reads through `getRepository(...)` or otherwise explicitly reads from `offlineDB`. Several pages still call `base44.entities.*` directly.

## 5. What actions queue offline

The generic offline queue supports:

- Entity create
- Entity update
- Entity delete

This is implemented in `lib/offlineEntityRepository.js` and `lib/syncQueue.js`.

Offline mutations queue only when code uses:

```js
getRepository('EntityName').create(...)
getRepository('EntityName').update(...)
getRepository('EntityName').delete(...)
```

If a page calls `base44.entities.EntityName.create/update/delete` directly while offline, it will not automatically queue through this system.

## 6. What syncs back online

`syncEngine` subscribes to connectivity changes and runs queued actions when online returns.

Sync behaviour found:

- Pending entries are processed in timestamp order
- Create/update/delete are sent to the Base44 entity SDK
- Create replaces local temp ID with the server record after sync
- Delete treats 404 as already synced
- Retry count exists
- Failed/conflict states exist
- Pending count is shown in the app shell/mobile bottom bar

Important limitation: transaction IDs are added to payloads, but there is no confirmed server-side idempotency enforcement in schemas/functions for all entities. This reduces but does not fully guarantee duplicate prevention.

## 7. What currently works offline

### App shell

Likely works after first successful online load because:

- Service worker caches root shell and static assets
- Navigation falls back to cached `/`

### Cached dashboard

Partially works. Dashboard uses `getRepository(...)` for `SessionRecord`, `Rifle`, `Shotgun`, `Club`, and `Area`, so cached records and dashboard stats can load offline after precache.

### Cached records

Partially works. `pages/Records` uses offline-aware repositories according to the inspected project summary, so cached records should be visible offline.

### Offline status UI

Works. `OfflineStatusBar` and `MobileTabBar` show offline/sync/pending states.

### Generic entity offline queue

Works for pages/components that use `getRepository(...)`.

### GPS sensor

Device GPS can work offline if the OS/device can provide location. GPS itself does not require internet, but accuracy and initial lock may depend on device/network conditions.

## 8. What does not work offline / confirmed gaps

### Direct Base44 calls bypass queue/cache

Confirmed direct Base44 SDK calls remain in key pages:

- `TargetShooting`
- `ClayShooting`
- `DeerManagement`
- `DeerStalkingMap`
- `OutingContext`
- `AmmoSummary`
- `ReloadingManagement`
- Some map/POI/harvest flows
- Some armory/reloading flows

Those paths may fail offline because they do not consistently use `getRepository(...)`.

### Target/Clay/Deer check-in/out offline

Not guaranteed.

- Check-in currently creates records directly through `base44.entities.SessionRecord.create` in several places.
- Deer outing creates `DeerOuting` and `SessionRecord` directly in `OutingContext`.
- Checkout updates firearms/ammunition/session records directly.
- If offline, these calls can fail instead of queueing safely.

### Ammunition / Reloading / Armory offline writes

Not currently safe to claim full offline write support.

Reasons:

- Stock, counters, reloading lifecycle, and refund logic are sensitive multi-record operations.
- Several flows use direct entity calls or backend functions.
- Offline queue is generic entity-level and does not guarantee conflict-safe stock/counter maths.
- Recent security fixes intentionally route sensitive stock/reloading writes through backend functions, which cannot run offline.

Safe current claim: cached stock may be viewable where cached reads are used, but offline stock/reloading writes should be treated as not safely supported unless a dedicated conflict-safe offline stock ledger is designed and approved.

### Photo upload offline

Not supported as full offline upload.

- Photo flows call `UploadFile` integration directly.
- Offline photo capture may produce a local file, but upload requires network.
- There is no confirmed durable local photo queue for later upload.

### Backend functions offline

Not available offline. Any flow depending on backend functions requires internet.

## 9. Map/offline limitation

Current Google Maps implementation cannot guarantee full offline map tiles. GPS/location records can be saved offline if the app flow supports local storage, but map imagery may require internet unless an offline map tile system is added.

Details:

- `DeerStalkingMap` loads Google Maps JavaScript from `https://maps.googleapis.com/...`.
- If the script is not already loaded/cached, the map cannot initialize offline.
- Google map tiles are network resources and are not guaranteed available offline.
- Browser cache may show some previously viewed tiles, but this is not reliable or controllable.
- `LocationMap` uses OpenStreetMap raster tiles through Leaflet; these also require internet unless tiles happen to be browser-cached.

Current offline map answer:

- Are maps currently usable offline? Not reliably.
- Are only cached tiles visible? Yes, at best only previously cached tiles may appear.
- Can user still save GPS points without map tiles? Device GPS can still provide coordinates, but current save flows often call online APIs directly, so persistence is not guaranteed unless routed through local offline storage.
- What is needed for real offline maps? A dedicated offline map tile system using predownloaded/packaged tiles or a platform-native offline map solution, plus UI fallback when tiles are unavailable.

## 10. GPS offline support

The GPS tracking core in `lib/trackingService.js` uses `navigator.geolocation.watchPosition`, which can work without internet if device GPS is available.

Limitations:

- Tracking points are held in memory while tracking.
- Some check-in/check-out flows only persist GPS after successful online database updates.
- If offline checkout fails, tracking intentionally remains active so the user can retry, but the session may not be safely persisted to the offline queue.
- Active outing is cached in `offlineDB.meta.active_outing`, but full start/end syncing is not consistently offline-safe.

## 11. Required minimal fixes identified

Do not implement these until approved, because they touch important offline/business flows.

### Minimal offline fix plan

1. Standardize read paths for safe, simple screens
   - Convert read-only/list screens to `getRepository(...)` where not already used.
   - Candidate areas: armory read screens, map marker lists, area lists, reloading history read-only display.

2. Add explicit offline read-only messaging for unsafe stock flows
   - Ammunition, Reloading, Armory counter, and stock-changing screens should show clear read-only/offline messaging unless conflict-safe offline writes are implemented.
   - Do not queue stock/reloading writes through generic entity sync without a proper stock movement ledger.

3. Make session check-in/out offline-safe separately
   - For Target/Clay/Deer, create a dedicated offline session draft/check-in queue.
   - Persist GPS/time locally immediately.
   - Sync once online, with duplicate prevention and server-side reconciliation.

4. Photos
   - Either disable photo upload offline with a clear message, or create a durable local photo queue and upload after reconnect.

5. Maps
   - Add a graceful offline map fallback message.
   - Keep GPS coordinate capture available even if map tiles fail.
   - For true offline maps, add a dedicated offline tile/native map solution after approval.

6. Sync conflict handling
   - Add visible conflict/error review for failed queue entries.
   - Confirm or implement server-side idempotency if duplicate prevention is required.

## 12. Files that must not be touched without explicit approval

Per database/protected rules, avoid changes to:

- Entity schemas in `entities/`
- Reloading/Ammunition database schemas
- Global stock model
- Brass lifecycle maths
- Stock restore/refund logic
- Entity relationships
- Auth redirect logic in `App.jsx` / `AuthContext`
- `manifest.json`
- `public/sw.js` unless specifically approving service worker changes
- Base44 config/API client
- Maps/GPS tracking logic unless fixing a confirmed GPS/map offline bug
- PDF generation files
- Reloading/ammunition stock logic
- Records delete/refund logic

## Bottom bar onboarding bug finding

The bottom tab bar was rendered globally from the app shell even when `AuthenticatedApp` returned `ProfileSetup` for users with `profileComplete !== true`.

Minimal safe fix:

- Gate `MobileTabBar` itself so it renders only when:
  - user is authenticated
  - auth loading is complete
  - `user.profileComplete === true`
  - current route is not public support/privacy
  - current route is not `/deer-stalking` where the map already hides the tab bar

This works for:

- Admin users with completed setup
- Existing normal users with completed setup
- Brand-new normal users before setup completion, because the bar stays hidden until profile setup saves successfully

## Files changed by this request

- `components/MobileTabBar`
- `FULL_OFFLINE_AUDIT.md`

## Files not changed

- No entity schemas changed
- No Reloading/Ammunition database files changed
- No stock/refund/brass lifecycle files changed
- No auth redirect logic changed
- No `App.jsx` route logic changed
- No `manifest.json` changed
- No `public/sw.js` changed
- No map/GPS tracking logic changed
- No PDF files changed
- No records delete/refund logic changed