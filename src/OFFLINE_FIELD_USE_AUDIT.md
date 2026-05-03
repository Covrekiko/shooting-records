# Offline Field Use Audit

Date: 2026-05-03

Scope: restore safe offline field check-in/check-out while keeping risky inventory maintenance blocked.

## Current offline queue found

The app already has a durable IndexedDB-backed sync queue:

- `lib/offlineDB.js` stores cached entities and `sync_queue`.
- `lib/offlineEntityRepository.js` can create/update/delete entities offline and queue them.
- `lib/syncQueue.js` processes queued entity actions when internet returns.
- `lib/syncEngine.js` auto-runs sync after reconnect.
- `context/OfflineContext.jsx` exposes online, syncing, pending and failed state.
- `components/OfflineStatusBar` and `components/MobileTabBar` show offline/pending sync state.

The queue already gives each action a transaction id. However, field check-out needs multi-entity changes: session record, ammo deduction, ammo spending log, rifle/shotgun counter update. Those are not safely covered by plain entity update unless handled as one field-sync mutation.

## Current blocked field flows

The previous safety pass blocked these field-use paths while offline:

- `pages/DeerManagement` checkout
- `pages/TargetShooting` checkout
- `pages/ClayShooting` checkout
- `components/UnifiedCheckoutModal.jsx` submit
- `pages/Records` manual record add/edit

Check-in flows still used direct `base44.entities.SessionRecord.create` / `DeerOuting.create`, so they could fail offline rather than saving a pending local check-in.

## Actions that can safely be queued now

With a field-specific queue action, these can be queued without schema changes:

- Create local active field session/check-in record.
- Update local field session to completed checkout.
- Store GPS track and local times in IndexedDB.
- Store cached rifle/shotgun/ammunition selections.
- Queue one field checkout mutation with a stable offline id.
- On reconnect, create/update the server session once.
- Apply ammunition deduction and armory counter increment once per queued checkout mutation.

## Actions that must remain blocked

These should remain blocked offline until a full conflict-safe stock sync system exists:

- Add/edit/delete ammunition inventory.
- Add/edit/delete reloading components.
- Add/edit/delete brass/components.
- Create/delete reload batch.
- Delete old records/refund stock.
- Delete ammunition/reloading sessions.
- Cleaning counter reset.
- Photo upload without upload queue.
- Reloading/brass lifecycle stock movement.

## Minimal fix plan

1. Add a small field-session helper that uses the existing IndexedDB stores and sync queue.
2. Extend `syncQueue` with one custom field-checkout mutation type.
3. Save offline check-ins locally for Deer, Target, and Clay.
4. Save offline checkouts locally and queue the stock/counter sync mutation.
5. Remove the too-strict offline checkout blocks from Deer, Target, Clay, and field manual record create.
6. Show clear success messages:
   - “Saved offline. This will sync when internet returns.”
   - “Checkout saved offline. Ammunition and armory updates will sync when internet returns.”
7. Show pending records with existing local flags plus a `Pending sync` badge where records are listed.
8. Keep inventory/reloading/deletion/photo upload blocks unchanged.

## Files to edit

- `lib/syncQueue.js`
- `lib/offlineFieldSessions.js` (new)
- `context/OutingContext.jsx`
- `pages/DeerManagement`
- `pages/TargetShooting`
- `pages/ClayShooting`
- `pages/Records`
- `components/RecordsSection`

## Files not to touch

- Entity schemas.
- Reloading/ammunition schema/model files.
- Brass lifecycle maths.
- Existing stock calculation functions except calling their current logic from queued sync.
- `App.jsx` routing.
- Auth redirect logic.
- `manifest.json`.
- `public/sw.js`.
- Base44 config/API client.
- Maps/GPS tracking logic internals.
- PDF files.
- Theme/icons.

## Map offline note

True offline map imagery is still not guaranteed. If map tiles or Google Maps scripts are unavailable, the app should show that imagery requires internet. GPS points can still be captured if the device location service is available.