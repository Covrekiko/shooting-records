# One App Record Display Audit

## Scope
Audited the live Base44 app code and the real GitHub repository at `https://github.com/Covrekiko/shooting-records` before making changes.

## App crash check
- Runtime logs show the app currently loads successfully.
- No active `useModules must be used within ModulesProvider` crash was present.
- `ModulesProvider` wraps the app in `App.jsx` and `useModules()` currently has a safe default fallback.
- `MobileTabBar` does not call `useModules`.

## Record card/detail components found
- `pages/Records` had its own inline `RecordCard`.
- `components/RecordsSection` had a separate simplified Recent Sessions card.
- `components/RecordDetailModal` is the shared compact detail modal used by `pages/Records`.
- `components/RecordsSection` had a separate `SessionReportModal` detail path.
- PDF preview/export uses `getRecordsPdfBlob` from `utils/recordsPdfExport.js` in both Records and Recent Sessions areas.

## Confirmed admin/user display split
The issue is not an intentional admin vs user component, but it behaves like one because different pages use different display logic:

- `pages/Records` uses a richer card and `RecordDetailModal`.
- Target/Clay/Deer pages render Recent Sessions through `components/RecordsSection`.
- `RecordsSection` had a simplified card branch, especially for target records.

## Why normal-user Recent Sessions showed only “a”
For target records, `RecordsSection` calculated a title from location fields only:

`record.location_name || record.place_name || 'Session'`

Then for non-clay/non-deer records it showed only:
- that title (for example `a`)
- date/time
- `by created_by`
- icons
- optional notes

It did not use the richer target fields already saved on the record, such as rifle, ammunition, rounds, distance, club, photos, etc.

## Is user card using a different component than admin?
- Dashboard currently has no Recent Sessions card in the active local code.
- The Records page and activity Recent Sessions areas used different card logic.
- Admin/global user-management pages are separate and were not copied into normal app screens.

## Is the save payload missing data?
Confirmed checkout payloads generally save the necessary fields:

- Target checkout saves category/status from the active record, checkout time, `rifles_used`, top-level `ammunition_id`, total `rounds_fired`, notes, photos, GPS track, and club name.
- Clay checkout saves shotgun, rounds, ammunition id/name, notes, photos, GPS track.
- Deer checkout saves species list, total count, rifle, ammunition, rounds, photos, notes, and GPS through `endOutingWithData`.

The primary confirmed problem was display logic, not the checkout save payload.

## Loader findings
- Normal Records and Recent Sessions loaders filter by `created_by: currentUser.email`, which is correct for user-owned data.
- `pages/Records` correctly avoids `User.list()` for normal users.
- Current app logic keeps normal dashboard/records user-scoped; admin user-management remains separate.

## Delete/refund logic
- `pages/Records` uses `deleteSessionRecordWithRefund`.
- Current `components/RecordsSection` also uses `deleteSessionRecordWithRefund`.
- This is already unified enough for normal user own-record deletion and stock restoration.

## PDF logic
- Both Records and Recent Sessions use `getRecordsPdfBlob`.
- Recent Sessions passes target groups/clay scorecard data when needed.

## Files to edit
- `components/RecordCard.jsx` — create one shared rich record card.
- `pages/Records` — use the shared card instead of inline-only logic.
- `components/RecordsSection` — use the shared card and `RecordDetailModal` instead of simplified card/session modal path.

## Files not to touch
- Entity schemas
- `App.jsx` routing/auth redirect
- Manifest/service worker/Base44 config
- Maps/GPS systems
- Theme/colors/layout system
- PDF generator internals
- Admin user-management pages except comparison only

## Confirmed root cause
The Recent Sessions UI used a separate simplified display path in `components/RecordsSection`, not the richer shared record display used elsewhere. A record with a weak location/title value such as `a` therefore rendered as only `a` plus metadata instead of a useful session summary.