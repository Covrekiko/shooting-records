# Offline Stalking Map Audit

## Repository inspected
- GitHub repository: https://github.com/Covrekiko/shooting-records
- Current app files inspected locally after checking the repository listing.

## Current map provider
- Stalking Map currently uses Google Maps via `@react-google-maps/api` in `pages/DeerStalkingMap`.
- Google Maps script is loaded dynamically from `maps.googleapis.com`.
- Existing map drawing uses Google `Marker`, `Polyline`, and `InfoWindow` components.

## Current offline cache support
- IndexedDB cache already exists in `lib/offlineDB.js`.
- Offline repository support exists in `lib/offlineEntityRepository.js`.
- Existing local stores include `areas`, `map_markers`, `harvests`, `deer_outings`, and `sessions`.
- Existing sync queue supports queued entity create/update/delete and field checkout side effects.

## What works offline now
- GPS can work offline if the device location service is available.
- Offline entity storage infrastructure exists.
- Deer outing check-in/check-out has partial offline repository support through `OutingContext`.
- GPS tracking service already prevents duplicate watchPosition loops.

## What fails offline now
- Stalking Map waits for Google Maps to load and can show a blocking map-imagery message offline.
- Google base tiles/imagery are not reliably available offline.
- Stalking markers, harvests, and areas were loaded directly from Base44 instead of the offline repository, so offline cache use was incomplete.
- Adding POIs/harvest markers on the Stalking Map used direct online entity calls.
- Stalking checkout still blocked offline in the page.

## True offline tiles with current provider
- Google Maps web tiles cannot be treated as reliable offline map tiles in this app.
- The safe first version should not claim offline Google imagery.

## Recommended strategy
- First version: offline fallback field map.
- Render cached boundaries, POIs/high seats, harvest/cull markers, GPS position, and active trail on a plain offline field map when offline or when Google Maps fails.
- Use existing IndexedDB/offline repository and existing GPS tracking service.
- Do not add duplicate GPS watchers.
- Future optional version: explicit “Download Offline Map” tile cache using a provider that permits tile caching.

## Files to edit
- `pages/DeerStalkingMap`
- `components/deer-stalking/OfflineFieldMap.jsx`
- `OFFLINE_STALKING_MAP_AUDIT.md`

## Files not to touch
- Reloading/Ammunition schemas, stock model, brass lifecycle, stock refund/restore logic.
- `App.jsx` routing/auth redirect logic.
- Manifest and service worker.
- Base44 config.
- PDFs.
- Unrelated pages/theme/icons/design systems.

## Acceptance tests
1. Open Stalking Map offline after one online visit: page opens, no crash, fallback field map visible.
2. Saved boundaries/high seats/POIs show offline from cache.
3. Offline check-in saves locally with pending sync.
4. Offline check-out saves locally and queues ammo/armory effects when needed.
5. Offline add POI saves locally and appears immediately.
6. Returning online syncs pending records once through the existing sync queue.
7. If Google Maps fails to load, fallback field map still renders cached data and GPS.