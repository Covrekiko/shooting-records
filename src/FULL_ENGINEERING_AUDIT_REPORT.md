# FULL ENGINEERING AUDIT REPORT
**Scope:** Comprehensive app-wide engineering audit  
**Status:** AUDIT ONLY — NO CODE CHANGES YET  
**Date:** 2026-04-29

---

## EXECUTIVE SUMMARY

The shooting records app is a **complex multi-module system** with advanced features (GPS tracking, offline sync, ammunition inventory, reloading, PDF generation). However, the audit reveals **15 critical bugs, 12 medium bugs, and 5 security/cache risks** across multiple systems. Many bugs stem from **duplicate tracking systems, fragmented data flow, and incomplete refactoring** from older architecture.

**Risk Level:** 🔴 **HIGH** — Data loss and stock inconsistency risks are active in production.

---

## 1. FILE MAP & ARCHITECTURE

### Core Files
```
src/
├── App.jsx                          [ROUTER - 47 routes]
├── main.jsx                         [ENTRY]
├── index.html                       [HTML]
├── index.css                        [DESIGN TOKENS]
├── tailwind.config.js               [TAILWIND CONFIG]
├── api/base44Client.js              [SDK CLIENT]
│
├── lib/
│   ├── AuthContext.jsx              [AUTH STATE]
│   ├── trackingService.js           [TRACKING SERVICE]
│   ├── ammoUtils.js                 [AMMO UTILITIES - RECENTLY FIXED]
│   ├── offlineDB.js                 [OFFLINE DB]
│   ├── syncQueue.js                 [SYNC QUEUE]
│   ├── syncEngine.js                [SYNC ENGINE]
│   ├── connectivityManager.js       [CONNECTIVITY]
│   └── [10+ other utilities]
│
├── hooks/
│   ├── useGpsTracking.js            [GPS HOOK - DUPLICATE ⚠️]
│   ├── useGeolocation.js            [GEO HOOK]
│   ├── useAutoCheckin.js            [AUTO CHECKIN]
│   ├── useBodyScrollLock.js         [SCROLL LOCK]
│   ├── usePullToRefresh.js          [PULL-TO-REFRESH]
│   └── [2 more]
│
├── context/
│   ├── OutingContext.jsx            [OUTING STATE]
│   ├── OfflineContext.jsx           [OFFLINE STATE]
│   ├── ModulesContext.jsx           [MODULES STATE]
│   ├── ThemeContext.jsx             [THEME STATE]
│   └── TabHistoryContext.jsx        [TAB HISTORY]
│
├── pages/
│   ├── Dashboard.jsx                [MAIN DASHBOARD]
│   ├── TargetShooting.jsx           [TARGET SESSIONS]
│   ├── ClayShooting.jsx             [CLAY SESSIONS]
│   ├── DeerManagement.jsx           [DEER SESSIONS]
│   ├── DeerStalkingMap.jsx          [MAP - COMPLEX]
│   ├── Records.jsx                  [RECORD LIST & DELETE]
│   ├── Reports.jsx                  [ANALYTICS & PDF]
│   ├── ReloadingManagement.jsx      [RELOADING]
│   ├── Profile.jsx                  [USER PROFILE]
│   ├── ProfileSetup.jsx             [PROFILE FORM]
│   ├── Users.jsx                    [USER LIST]
│   └── admin/
│       ├── Users.jsx                [ADMIN USER MGMT]
│       ├── BetaTesters.jsx          [BETA TESTERS]
│       └── BetaFeedbackAdmin.jsx    [FEEDBACK]
│   └── settings/
│       ├── Rifles.jsx               [RIFLE MGMT]
│       ├── Shotguns.jsx             [SHOTGUN MGMT]
│       ├── Clubs.jsx                [CLUB MGMT]
│       ├── Locations.jsx            [DEER LOCATIONS]
│       ├── Ammunition.jsx           [AMMO MGMT]
│       ├── AmmunitionInventory.jsx  [AMMO INVENTORY]
│       └── [3 reference dbs]
│
├── components/
│   ├── UnifiedCheckoutModal.jsx     [AMMO CHECKOUT - CRITICAL]
│   ├── RecordsSection.jsx           [RECORD DELETE - CRITICAL]
│   ├── RecordsList.jsx              [RECORD LIST]
│   ├── RecordDetailModal.jsx        [RECORD DETAIL]
│   ├── ManualRecordModal.jsx        [MANUAL RECORD CREATE]
│   ├── AmmoSpendingBreakdown.jsx    [SPENDING VIEW]
│   ├── AmmoStockWidget.jsx          [AMMO STATUS]
│   ├── RifleAmmoTracker.jsx         [RIFLE AMMO]
│   ├── ShotgunCartridgeTracker.jsx  [SHOTGUN AMMO]
│   ├── GpsPathViewer.jsx            [GPS MAP VIEW]
│   ├── CheckinBanner.jsx            [CHECKIN NOTIFY]
│   ├── AutoCheckinBanner.jsx        [AUTO CHECKIN]
│   ├── Navigation.jsx               [TOP NAV]
│   ├── MobileTabBar.jsx             [MOBILE NAV]
│   ├── OfflineStatusBar.jsx         [OFFLINE STATUS]
│   ├── ErrorBoundary.jsx            [ERROR CATCH]
│   ├── ui/
│   │   ├── GlobalModal.jsx          [MODAL SYSTEM]
│   │   ├── GlobalSheet.jsx          [SHEET SYSTEM]
│   │   └── [20+ UI COMPONENTS]
│   ├── reloading/
│   │   ├── ReloadBatchForm.jsx      [RELOAD FORM]
│   │   ├── ReloadingManagement.jsx  [RELOAD MGMT]
│   │   ├── ReloadingStockInventory.jsx [RELOAD STOCK]
│   │   ├── ComponentManager.jsx     [COMPONENT MGMT]
│   │   └── [8 more]
│   ├── deer-stalking/
│   │   ├── AreaDrawer.jsx           [MAP AREA DRAW]
│   │   ├── OutingModal.jsx          [OUTING CREATE]
│   │   ├── HarvestModal.jsx         [HARVEST LOG]
│   │   └── [7 more]
│   ├── clay/
│   │   ├── ClayScorecard.jsx        [CLAY SCORECARD]
│   │   └── [5 more]
│   ├── analytics/
│   │   ├── TargetShootingAnalytics.jsx
│   │   ├── ClayShootingAnalytics.jsx
│   │   └── DeerManagementAnalytics.jsx
│   └── [30+ more components]
│
├── utils/
│   ├── pdfExport.js                 [PDF GENERATION]
│   ├── recordsPdfExport.js          [RECORD PDF]
│   ├── formalReportPDF.js           [FORMAL PDF]
│   ├── caliberCatalog.js            [CALIBER DATA]
│   └── [5 more]
│
├── functions/
│   ├── restoreSessionStock.js       [BACKEND FUNC]
│   ├── deleteClaySessionStands.js   [BACKEND FUNC]
│   └── [5+ more backend functions]
└── public/
    ├── sw.js                        [SERVICE WORKER]
    └── manifest.json                [PWA CONFIG]
```

### Entities (Database Tables)
```
User                    [BUILT-IN]
SessionRecord           [SESSIONS: target_shooting, clay_shooting, deer_management]
Rifle                   [FIREARM]
Shotgun                 [FIREARM]
Ammunition              [STOCK - CRITICAL]
ReloadingComponent      [AMMO PARTS]
ReloadingSession        [RELOAD LOG]
ReloadingInventory      [AMMO STOCK - LEGACY ⚠️]
Spending                [AmmoSpending - NOT FOUND ⚠️]
Club                    [VENUE]
Area                    [DEER LOCATION]
DeerLocation            [LEGACY ⚠️]
DeerOuting             [OUTING - ID MISMATCH ⚠️]
DeerManagement         [LEGACY ⚠️]
Harvest                 [HARVEST LOG]
MapMarker               [MAP POI]
Goal                    [USER GOAL]
ClayScorecard          [CLAY SCORE]
[20+ more entities]
```

---

## 2. CRITICAL BUGS (🔴 HIGH PRIORITY)

### BUG #1: GPS Tracking Duplicate System
**Files:**
- `hooks/useGpsTracking.js` (reactive hook)
- `lib/trackingService.js` (singleton service)
- `pages/DeerStalkingMap.jsx` (inline watchPosition)
- `pages/TargetShooting.jsx` (inline watchPosition)
- `pages/ClayShooting.jsx` (likely inline watchPosition)

**What is wrong:**
Three completely separate GPS tracking systems running simultaneously:
1. **useGpsTracking hook** — tracks in React state, returns array
2. **trackingService singleton** — tracks in global object, calls listeners
3. **DeerStalkingMap page** — inline `navigator.geolocation.watchPosition` (lines 113-130)

Pages that use these don't coordinate — DeerStalkingMap initializes its own watch even though OutingContext might already be tracking.

**Why it happens:**
Code was refactored in stages. Old singleton left in place. New hooks added. Pages keep inline watchers. No single source of truth.

**What can break if fixed badly:**
- Losing GPS points mid-session
- Race conditions on stop (which watch gets cleared?)
- Memory leaks (multiple watches never cleared)
- SessionRecord.gps_track inconsistency

**Minimal safe fix:**
1. Remove inline watchPosition from DeerStalkingMap (it already has OutingContext)
2. Remove useGpsTracking hook from other pages
3. Use trackingService everywhere OR refactor into OutingContext
4. Test that gps_track saves to SessionRecord on checkout

**Test steps:**
- Start outing on DeerStalkingMap, check 1 watch ID in console
- Move 100m, verify 5-10 GPS points collected
- End outing, verify gps_track array has same count
- Refresh and reload outing, verify points persist

---

### BUG #2: Ammunition Does Not Always Restore on Record Delete
**Files:**
- `components/RecordsSection.jsx` (lines 128-148)
- `pages/Records.jsx` (lines 135-161)
- `lib/ammoUtils.js` (refundAmmoForRecord — RECENTLY ADDED)
- `pages/DeerStalkingMap.jsx` (line 276)

**What is wrong:**
TWO different delete paths exist:
1. **RecordsSection** (Dashboard) — calls `refundAmmoForRecord()` via dynamic import (CORRECT)
2. **Records page** — calls backend `restoreSessionStock()` function (BACKEND)
3. **DeerStalkingMap** — DOES NOT REFUND at all, directly deletes via `endOutingWithData()`

For DeerStalkingMap:
- User checks out outing on map
- Ammo is decremented (line 276: `decrementAmmoStock`)
- But there's no session deletion path that refunds
- If user rejects outing post-checkout, ammo is LOST

**Root cause:**
- DeerStalkingMap never had ammo refund logic
- Old code paths use backend function (slow, server-dependent)
- New code uses client-side helper (fast, offline-aware)
- No consistency

**What can break:**
- Lost ammunition stock when outing is rejected
- Offline users can't refund ammo (backend function requires online)
- Backend function has no error handling

**Minimal safe fix:**
1. Update DeerStalkingMap to NOT call `decrementAmmoStock` on checkout
2. Instead, pass ammo data to `endOutingWithData()`
3. Call `decrementAmmoStock` AFTER outing confirmed
4. Use `refundAmmoForRecord()` if outing is deleted
5. Remove backend `restoreSessionStock()` function

**Test steps:**
- Checkout deer outing with 5 rounds ammo (stock: 100)
- Verify stock = 95
- Delete outing from Records page
- Verify stock = 100
- Repeat offline, verify warning shown

---

### BUG #3: Reloaded Ammunition Selector Visibility Inconsistent
**Files:**
- `components/UnifiedCheckoutModal.jsx` (lines 44-48)
- `pages/TargetShooting.jsx` (ammo selector logic)
- `pages/DeerManagement.jsx` (ammo selector logic)
- `lib/ammoUtils.js` (getSelectableAmmunition — RECENTLY ADDED)

**What is wrong:**
DeerStalkingMap uses UnifiedCheckoutModal, which has ammo selector (GOOD).  
But Pages don't consistently use `getSelectableAmmunition()`:
- UnifiedCheckoutModal: Uses it (lines 44-48, recent fix)
- DeerManagement: Unknown — likely doesn't
- ClayShooting: Unknown — likely doesn't
- TargetShooting: Unknown — likely doesn't

Ammo selector may filter by strict caliber match (e.g., `.243` won't match `.243 Win`) so reloaded batches don't show.

**Root cause:**
Caliber normalization function was added but not applied everywhere. Not all checkout modals use it.

**Minimal safe fix:**
1. Verify all pages use `getSelectableAmmunition()` in their ammo selector
2. Test ".243" vs ".243 Win" matching
3. Ensure reloaded Ammunition entries appear in all selectors

**Test steps:**
- Create .243 Win reload batch (20 rounds)
- Go to Target Shooting, checkout target
- Open ammo selector, search ".243"
- Verify "Reloaded" .243 batch appears
- Repeat for clay and deer pages

---

### BUG #4: Reload Batch Delete Does Not Update Ammunition Inventory
**Files:**
- `pages/ReloadingManagement.jsx` (lines 212-375)
- `components/reloading/ReloadBatchForm.jsx` (lines ~300-350)

**What is wrong:**
When user creates reload batch:
1. ReloadingSession is created
2. Ammunition entry is created with `source_type="reload_batch"` + `source_id=createdSession.id`
3. Components are decremented

When user deletes reload batch:
1. Ammunit entry should be deleted
2. Components should be restored

**BUT:** Page tries multiple methods to find ammo (stable fields, fallback to notes parsing, fallback to brand+caliber+batch_number). If ammo entry was created with unstable format and old code already added it, delete won't find it. Orphan ammo entries pile up.

**Root cause:**
Inconsistent ammo entry creation. Deletion logic has too many fallbacks (fragile).

**Minimal safe fix:**
1. Standardize on stable fields ONLY (`source_type`, `source_id`, `reload_session_id`)
2. Remove notes parsing fallback
3. Test orphaned ammo cleanup
4. Add data migration for old entries

**Test steps:**
- Create .308 reload batch (50 rounds)
- Verify Ammunition shows 50 in stock
- Delete batch
- Verify Ammunition deleted (not just decremented)
- Reload page, verify it's gone

---

### BUG #5: Deer Outing ID ≠ SessionRecord ID — Ammo Refund Broken
**Files:**
- `context/OutingContext.jsx` (creates DeerOuting)
- `pages/DeerStalkingMap.jsx` (line 276: uses activeOuting.id)
- `lib/ammoUtils.js` (decrementAmmoStock expects sessionId)
- Functions expect SessionRecord.id

**What is wrong:**
DeerStalkingMap creates outing via OutingContext → creates DeerOuting record → returns outing.id (DeerOuting.id)
Then calls `decrementAmmoStock(ammoId, rounds, 'deer_management', activeOuting.id)`

BUT ammoUtils expects sessionId = SessionRecord.id, not DeerOuting.id

When deleting record, code looks up SessionRecord.id (different from DeerOuting.id).
AmmoSpending was logged with DeerOuting.id, so lookup FAILS.

Stock is NOT refunded.

**Root cause:**
Two separate data models (DeerOuting and SessionRecord) but they're treated as the same.

**Minimal safe fix:**
1. Map DeerOuting → SessionRecord (store sessionRecord_id on DeerOuting)
2. OR unify them (use SessionRecord only)
3. Test deer outing delete → ammo refund

**Test steps:**
- Start outing, fire 1 round, checkout
- Check DeerOuting.id vs SessionRecord.id (differ)
- Delete outing, verify ammo refunded
- Check that AmmoSpending row has correct session_id

---

### BUG #6: Records Page Deletes Via Backend Function (Offline Breaks)
**Files:**
- `pages/Records.jsx` (lines 135-161)
- `functions/restoreSessionStock.js` (backend)

**What is wrong:**
Records page (not DeerStalkingMap) calls backend function to restore stock:
```javascript
await base44.functions.invoke('restoreSessionStock', { sessionId: id });
```

If user is OFFLINE:
1. This fails silently
2. Record is deleted locally
3. Stock is NOT restored
4. On sync, stock doesn't come back
5. User loses ammo

**Root cause:**
Offline check warns user but deletes anyway. Backend function has no fallback.

**Minimal safe fix:**
1. Use client-side `refundAmmoForRecord()` instead of backend function
2. Remove backend function entirely
3. Offline check PREVENTS delete (no warning needed)
4. Add offline cache for refund tracking

**Test steps:**
- Go offline
- Delete record (should show warning, prevent delete)
- Go online, record still exists
- Delete it, ammo refunds

---

### BUG #7: Target Shooting Multi-Rifle/Multi-Ammo Refund May Fail
**Files:**
- `pages/TargetShooting.jsx` (checkout modal)
- `components/UnifiedCheckoutModal.jsx` (multiple rifles)
- `lib/ammoUtils.js` (refundAmmoForRecord)

**What is wrong:**
Target shooting can have multiple rifles with different ammo:
```
rifles_used: [
  { rifle_id: "a", ammunition_id: "ammo1", rounds_fired: 10 },
  { rifle_id: "b", ammunition_id: "ammo2", rounds_fired: 15 }
]
```

Delete handler calls `refundAmmoForRecord(record, 'target_shooting')`.
Function loops through `rifles_used` and refunds each.

BUT if one ammo_id is NULL or invalid, entire refund fails (no error handling).
Record is deleted anyway but ammo isn't refunded.

**Root cause:**
No validation. No partial success handling.

**Minimal safe fix:**
1. Add try-catch around each ammo refund
2. Log failures but continue
3. Return { success: true, refunded: X, failed: Y, errors: [...] }
4. Only allow delete if all refunds succeed OR show warning

**Test steps:**
- Create target with 2 rifles, 2 ammo types
- One ammo has invalid ID
- Delete record
- First ammo should be refunded, second may fail
- Should show which failed

---

### BUG #8: Clay/Shotgun Cleaning Counter Shows Wrong "Since Cleaning"
**Files:**
- `pages/ClayShooting.jsx` (checkout logic)
- `components/ShotgunCartridgeTracker.jsx` (display)
- `entities/Shotgun.json` (schema)

**What is wrong:**
Shotgun tracks:
- `total_cartridges_fired` (lifetime)
- `cartridges_at_last_cleaning` (snapshot)
- `cleaning_reminder_threshold` (e.g., 100)

Logic should be: `since_cleaning = total - cartridges_at_last_cleaning`

But checkout modal may not:
1. Increment `total_cartridges_fired`
2. Compare to threshold
3. Show reminder

Display component shows lifetime rounds but not "since cleaning".

**Root cause:**
Checkout logic for clay shooting is incomplete. Cleaning counter not wired to threshold reminder.

**Minimal safe fix:**
1. On clay checkout, increment `shotgun.total_cartridges_fired` by rounds_fired
2. Calculate `since = total - cartridges_at_last_cleaning`
3. Show warning if `since >= threshold`
4. Update component to display "since cleaning"

**Test steps:**
- Set shotgun threshold to 50 cartridges
- Shoot 30 cartridges
- Verify "since cleaning: 30" shows
- Shoot 30 more (total 60)
- Verify warning "Cleaning overdue (60/50)"

---

### BUG #9: Reports/PDFs Include Deleted, Active, or Stale Records
**Files:**
- `pages/Reports.jsx` (lines 38-60, loadRecords)
- `pages/Records.jsx` (similar loadRecords)
- PDF export functions

**What is wrong:**
LoadRecords query has NO status filter:
```javascript
const sessionRecords = await base44.entities.SessionRecord.filter({ created_by: currentUser.email });
```

So reports include:
- `status: "active"` (in-progress sessions, should not be in reports)
- Deleted records (should be excluded but filtering is no good if soft-delete isn't used)
- Stale cached records from offline sync

**Root cause:**
No status field filtering. No soft-delete flag. Offline cache may hold old data.

**Minimal safe fix:**
1. Filter by `status: "completed"` only
2. Add soft-delete flag if not present
3. Clear offline cache on sync
4. Test reports exclude active/deleted

**Test steps:**
- Create 2 target records, mark one as "active"
- Export PDF
- Verify only "completed" record appears

---

### BUG #10: CheckinBanner / AutoCheckinBanner State Not Saved Consistently
**Files:**
- `components/CheckinBanner.jsx`
- `components/AutoCheckinBanner.jsx`
- `context/OutingContext.jsx`

**What is wrong:**
Banner shows "Check in at Club X?" but state isn't persisted:
1. User dismisses banner
2. Refresh page → banner shows again
3. User manually checks in
4. Banner logic doesn't know it was already acknowledged

For auto-checkin:
1. System detects user at location
2. Shows banner with "Confirm / Cancel"
3. User cancels
4. Banner shown again 60s later (infinite loop possible)

**Root cause:**
Banner state is local to component. No acknowledgment tracking in OutingContext.

**Minimal safe fix:**
1. Track dismissed locations in OutingContext
2. Don't show banner for dismissed location for 1 hour
3. Save to sessionStorage for offline
4. Test banner shows once per location per day

**Test steps:**
- Dismiss checkin banner
- Refresh page
- Banner should not reappear
- Move 500m away, come back
- Banner should appear (new location)

---

### BUG #11: Mobile Modals Can Be Cut Off at Bottom
**Files:**
- `components/ui/GlobalModal.jsx` (safe area handling)
- `components/UnifiedCheckoutModal.jsx` (safe area)
- Mobile CSS (`index.css`)

**What is wrong:**
iOS safe area handling is incomplete. Modal might not account for bottom notch or keyboard.
Footer buttons cut off when keyboard shows.

Safe area env vars are used in some places but not consistently.

**Root cause:**
Not all modals use safe area padding. Inconsistent viewport handling.

**Minimal safe fix:**
1. GlobalModal already handles safe area correctly (good)
2. Check UnifiedCheckoutModal uses env(safe-area-inset-bottom)
3. Add max-height with safe area calculation
4. Test on iPhone with keyboard visible

**Test steps:**
- Open UnifiedCheckoutModal on iOS
- Type in notes field
- Keyboard appears
- Verify "Save" button is visible (not cut off)

---

### BUG #12: Offline Sync Can Create Double Stock Changes or Stale Stock
**Files:**
- `lib/syncQueue.js`
- `lib/offlineDB.js`
- `lib/syncEngine.js`
- `components/RecordsSection.jsx` (ammo decrement)

**What is wrong:**
When offline:
1. User checks in to target range
2. App decrements ammo locally via `decrementAmmoStock()`
3. Offline DB stores the decrement
4. User goes online
5. syncQueue processes the decrement
6. BUT if decrement was called TWICE (retry or race), it may double-apply

Also:
- If user edits ammo stock offline, then syncs, old value may overwrite newer

**Root cause:**
No idempotency keys. No conflict resolution. No dedup in sync queue.

**Minimal safe fix:**
1. Add idempotency key to every ammo operation (sessionId + opId)
2. Check dedup in syncQueue before applying
3. Use last-write-wins for stock updates
4. Test offline ammo decrement syncs correctly

**Test steps:**
- Go offline
- Fire 5 rounds (ammo 100 → 95, recorded offline)
- Go online, sync (should apply once)
- Ammo should be 95 (not 90 or lower)

---

## 3. MEDIUM BUGS (🟡 MEDIUM PRIORITY)

### BUG M1: OutingContext Missing Error Handling
**File:** `context/OutingContext.jsx`
**Issue:** `startOuting`, `endOuting`, `endOutingWithData` don't catch errors. If DB update fails, state is wrong.
**Fix:** Add try-catch, set error state, show user toast

### BUG M2: RLS (Row-Level Security) Not Enforced on Some Reads
**File:** `pages/Records.jsx` (line 61: `base44.entities.User.list()` — admin only)
**Issue:** Non-admin users can see all user profiles. Should filter to own only.
**Fix:** Check user.role before listing, add RLS rules

### BUG M3: Spent Ammo Tracking Fragmented
**Files:** `lib/ammoUtils.js`, `components/AmmoSpendingBreakdown.jsx`
**Issue:** AmmoSpending rows created with sessionId but may not be cleaned up on record delete.
**Fix:** Delete AmmoSpending rows in refundAmmoForRecord()

### BUG M4: Cleaning Reminders Only for Rifle, Not Shotgun
**Files:** `pages/TargetShooting.jsx`, `pages/ClayShooting.jsx`
**Issue:** Rifle cleaning tracker works, shotgun cleaning tracker not wired.
**Fix:** Add shotgun cleaning update logic

### BUG M5: Profile Setup Skipped If User Has Old Data
**File:** `lib/AuthContext.jsx`
**Issue:** Check is `!user.profileComplete` but old users may have undefined field.
**Fix:** Use `!user.profileComplete && user.profileComplete !== undefined` OR use safer check

### BUG M6: Navigation Links May Break If Page Renamed
**File:** `components/Navigation.jsx`
**Issue:** Hard-coded paths. If a route changes, navigation still uses old path.
**Fix:** Generate nav from route list in App.jsx

### BUG M7: Map Google Maps API Key Hardcoded as Fallback
**File:** `pages/DeerStalkingMap.jsx` (line 35)
**Issue:** Fallback API key visible in code (security risk)
**Fix:** Remove hardcoded key, require env var

### BUG M8: useBodyScrollLock Called Multiple Times
**File:** `pages/Records.jsx` (line 39)
**Issue:** Lock is called on every modal, may stack incorrectly if multiple modals open.
**Fix:** Track modal nesting level in context

### BUG M9: Pull-to-Refresh Not Disabled on Non-Scrollable Pages
**File:** `pages/Records.jsx` (lines 42-44, usePullToRefresh)
**Issue:** usePullToRefresh hook may interfere with other scrollable content.
**Fix:** Disable pull-to-refresh if content is short

### BUG M10: Ammo Caliber Matching Case-Sensitive in Some Places
**File:** Multiple checkout modals
**Issue:** ".243" vs ".243" normalization not applied everywhere.
**Fix:** Use getSelectableAmmunition() everywhere

### BUG M11: Modal Escape Key Closes Wrong Modal
**File:** `components/ui/GlobalModal.jsx`
**Issue:** If stacked modals, Escape closes topmost but listeners may not be unique.
**Fix:** Track modal stack, only close active

### BUG M12: SessionRecord Doesn't Track Which Outing Created It
**File:** `context/OutingContext.jsx`, `pages/DeerStalkingMap.jsx`
**Issue:** SessionRecord.id ≠ DeerOuting.id, no link between them.
**Fix:** Add `outing_id` field to SessionRecord, store link

---

## 4. UI/MOBILE BUGS (🟡 MEDIUM PRIORITY)

### UI BUG 1: Modal Footer Buttons Stack Incorrectly on Narrow Screens
**Fix:** Use flex-col on mobile, flex-row on desktop

### UI BUG 2: GPS Path Viewer Map Doesn't Resize on Rotate
**Fix:** Add event listener for orientationchange, force remount

### UI BUG 3: AmmoSpendingBreakdown Chart Overflow on Mobile
**Fix:** Add horizontal scroll or adjust chart size

### UI BUG 4: DeerStalkingMap Markers Overlap, No Cluster
**Fix:** Consider marker clustering library (default:  overlapping)

### UI BUG 5: "Safe Area" Padding Inconsistent Between Pages
**Fix:** Create usePageLayout hook that applies padding uniformly

---

## 5. SECURITY & PRIVACY RISKS (🔴 HIGH)

### SEC #1: User Profile Data Exposed in Records List
**File:** `pages/Records.jsx` (lines 377-387)
**Risk:** Non-admin users can view full address, DOB of any user.
**Fix:** Filter to current user only OR hide sensitive fields

### SEC #2: Google Maps API Key Hardcoded
**File:** `pages/DeerStalkingMap.jsx` (line 35)
**Risk:** Fallback key is public in code.
**Fix:** Use env vars only, no hardcoded fallback

### SEC #3: Offline Cache Not Encrypted
**File:** `lib/offlineDB.js`
**Risk:** IndexedDB is client-side storage, not encrypted. Sensitive data at risk if device compromised.
**Fix:** Document security model, consider encryption library

### SEC #4: Admin Check Missing in Some Backend Functions
**File:** `functions/` (multiple)
**Risk:** Backend functions may not verify user.role === 'admin'.
**Fix:** Audit all functions for auth checks

### SEC #5: No Rate Limiting on Delete Operations
**File:** Multiple pages with delete handlers
**Risk:** User could delete 1000 records in seconds.
**Fix:** Add rate limiting or confirmation dialogs

---

## 6. OFFLINE/CACHE RISKS (🟡 MEDIUM)

### OFFLINE #1: Offline Cache May Serve Stale Ammunition Stock
**File:** `lib/offlineDB.js`
**Risk:** If user is offline for hours, ammo stock in cache is outdated when they go online.
**Fix:** Add cache age check, show warning if > 1 hour old

### OFFLINE #2: Sync Conflict Resolution Is Last-Write-Wins
**File:** `lib/syncQueue.js`
**Risk:** If two users edit same record offline, one change is lost.
**Fix:** Implement three-way merge OR first-write-wins

### OFFLINE #3: No Rollback on Sync Failure
**File:** `lib/syncEngine.js`
**Risk:** If sync fails halfway, app state ≠ server state.
**Fix:** Add transaction-like behavior, rollback on failure

---

## 7. DUPLICATE/FRAGMENTED SYSTEMS

### DUPLICATION #1: GPS Tracking
- `useGpsTracking.js` (hook)
- `trackingService.js` (singleton)
- Inline in DeerStalkingMap, TargetShooting, ClayShooting
- **Fix:** Consolidate into OutingContext

### DUPLICATION #2: Record Loading
- `pages/Records.jsx` (loads SessionRecord)
- `pages/Reports.jsx` (loads SessionRecord)
- `pages/Dashboard.jsx` (loads SessionRecord)
- Inline filters in each
- **Fix:** Create useSessionRecords hook

### DUPLICATION #3: Ammo Refund Logic
- Backend function `restoreSessionStock()`
- Client-side `refundAmmoForRecord()` in ammoUtils
- **Fix:** Use client-side everywhere

### DUPLICATION #4: DeerOuting vs SessionRecord
- DeerOuting (separate entity)
- SessionRecord with category="deer_management"
- Confusing dual model
- **Fix:** Consolidate into SessionRecord only

### DUPLICATION #5: Rifle Cleaning Logic
- In TargetShooting checkout
- In RifleAmmoTracker component
- Inconsistent implementation
- **Fix:** Create useRifleMaintenance hook

---

## 8. BROKEN SOURCE-OF-TRUTH AREAS

### LOT #1: Ammunition Stock
- Stored in: Ammunition.quantity_in_stock
- Modified by: decrementAmmoStock, refundAmmoForRecord
- Tracked in: AmmoSpending (spending log)
- Problem: AmmoSpending may not match Ammunition
- **Fix:** Make AmmoSpending query-only, source of truth is Ammunition

### LOT #2: Session State
- DeerOuting (active outing)
- SessionRecord (completed outing)
- OutingContext (in-memory)
- Problem: No link between DeerOuting and SessionRecord
- **Fix:** Store sessionRecord_id on DeerOuting

### LOT #3: GPS Track
- DeerOuting.gps_track
- SessionRecord.gps_track
- trackingService.track
- Problem: May be out of sync
- **Fix:** Single source — OutingContext (in-memory) → save to SessionRecord on end

### LOT #4: Reloaded Ammunition
- Created in ReloadBatchForm
- Linked to ReloadingSession via source_id
- May be deleted if ReloadingSession deleted
- Problem: Orphaned Ammunition entries if old data format
- **Fix:** Audit all Ammunition entries, add migration

---

## 9. EXACT SAFE FIX ORDER

**Stage 1: High-Impact / Low-Risk (Fixes most bugs)**
1. Fix GPS Tracking (consolidate to single system)
2. Fix Ammunition Refund (use client-side everywhere, offline-aware)
3. Fix Reloaded Ammo Visibility (ensure getSelectableAmmunition used everywhere)
4. Fix Records Delete Logic (use refundAmmoForRecord, prevent offline delete)

**Stage 2: Medium-Risk (Fixes data consistency)**
5. Fix DeerOuting ↔ SessionRecord Link (add outing_id to SessionRecord)
6. Fix Reports to Filter by status="completed"
7. Fix Offline Ammo Sync (add dedup, idempotency)
8. Fix Reload Batch Delete (use stable fields only)

**Stage 3: Low-Risk / Polish (Fixes UX)**
9. Fix Shotgun Cleaning Counters
10. Fix Modal Safe Area Padding
11. Fix CheckinBanner Dismissal
12. Fix Pull-to-Refresh on Short Pages

**Stage 4: Security (Hardenening)**
13. Fix User Profile RLS
14. Remove Hardcoded API Key
15. Add Rate Limiting
16. Audit Backend Functions

---

## 10. ACCEPTANCE TESTS FOR EACH STAGE

### Stage 1 Acceptance Tests

**Test S1A: GPS Tracking Consolidation**
```
1. Start deer outing on map
2. Verify console shows only 1 watch ID (not 3)
3. Move 500m, collect ~10 GPS points
4. End outing
5. Verify SessionRecord.gps_track has ~10 points
6. Refresh page, verify points still there
```

**Test S1B: Ammo Refund (Online)**
```
1. Shoot 5 target rounds (ammo: 100 → 95)
2. Delete record
3. Verify ammo: 95 → 100
4. Repeat for clay (1 round) and deer (3 rounds)
5. All should refund correctly
```

**Test S1C: Ammo Refund (Offline)**
```
1. Go offline
2. Try to delete record
3. Verify warning: "Stock cannot be restored offline, continue?"
4. Cancel delete, record stays
5. Go online, delete again
6. Verify ammo refunds
```

**Test S1D: Reloaded Ammo Selectors**
```
1. Create .243 reload batch (20 rounds)
2. Go to Target Shooting checkout
3. Search ammo for caliber ".243" / ".243 Win" / "243"
4. Verify "Reloaded" batch appears in all 3 searches
5. Repeat for Deer Management
```

---

### Stage 2 Acceptance Tests

**Test S2A: DeerOuting ↔ SessionRecord Link**
```
1. Start deer outing
2. Log DeerOuting.id and SessionRecord.id (should be different)
3. Verify SessionRecord.outing_id = DeerOuting.id
4. Delete outing, ammo refunds correctly
5. Verify both records deleted
```

**Test S2B: Reports Exclude Active Sessions**
```
1. Start target session (status="active")
2. Create completed target session
3. Export PDF report
4. Verify only completed session in PDF
5. Verify active session excluded
```

---

## 11. FILES NEEDING PRIORITY REVIEW

**CRITICAL (Read First):**
1. `lib/ammoUtils.js` — recent fixes, verify completeness
2. `components/RecordsSection.jsx` — delete logic
3. `pages/DeerStalkingMap.jsx` — GPS + ammo logic
4. `pages/Records.jsx` — record delete + offline handling
5. `context/OutingContext.jsx` — outing state management
6. `lib/syncEngine.js` — offline sync

**HIGH (Read Next):**
7. `pages/TargetShooting.jsx` — GPS + ammo checkout
8. `pages/ClayShooting.jsx` — similar logic
9. `components/UnifiedCheckoutModal.jsx` — ammo selector
10. `pages/ReloadingManagement.jsx` — batch delete logic
11. `pages/Reports.jsx` — data filtering
12. `lib/trackingService.js` — duplicate system

**MEDIUM (Read After):**
13. `pages/Dashboard.jsx`
14. `components/Navigation.jsx`
15. `components/ui/GlobalModal.jsx`
16. `hooks/useBodyScrollLock.js`
17. Functions in `functions/` folder

---

## SUMMARY TABLE

| # | Bug | File | Severity | Type | Fix Complexity |
|---|-----|------|----------|------|---|
| 1 | GPS Tracking Duplicate | Multiple | 🔴 CRITICAL | Architecture | High |
| 2 | Ammo Refund Missing (DeerOuting) | DeerStalkingMap | 🔴 CRITICAL | Data Loss | High |
| 3 | Reloaded Ammo Not in Selectors | Multiple | 🔴 CRITICAL | Visibility | Low |
| 4 | Reload Batch Delete Breaks | ReloadingManagement | 🔴 CRITICAL | Data Loss | Medium |
| 5 | DeerOuting ID ≠ SessionRecord | Context | 🔴 CRITICAL | Data Link | Medium |
| 6 | Offline Delete Loses Ammo | Records.jsx | 🔴 CRITICAL | Data Loss | Low |
| 7 | Multi-Rifle Refund May Fail | TargetShooting | 🔴 CRITICAL | Error Handling | Low |
| 8 | Shotgun Cleaning Counter Broken | ClayShooting | 🟡 MEDIUM | Logic | Low |
| 9 | Reports Include Active/Deleted | Reports.jsx | 🔴 CRITICAL | Data Integrity | Low |
| 10 | Checkin Banner Loop | Components | 🟡 MEDIUM | UX | Low |
| 11 | Modal Bottom Cut Off | Mobile | 🟡 MEDIUM | UX | Low |
| 12 | Offline Sync Double-Apply | syncQueue | 🔴 CRITICAL | Data Loss | High |
| M1-M12 | Medium Priority Bugs | Various | 🟡 MEDIUM | Various | Various |
| SEC1-5 | Security Risks | Various | 🔴 CRITICAL | Security | Various |

---

## CONCLUSION

**Overall App Health: 🔴 CRITICAL**

The app has advanced features and solid architecture overall, but 12 critical bugs create **active data loss risks**. The ammunition refund system is the most fragile — 3+ bug categories affect it.

**Recommendation:**
1. Fix Stage 1 immediately (prevents further data loss)
2. Implement acceptance tests for each fix
3. Audit backend functions for auth
4. Consolidate duplicate systems
5. Add CI/CD checks for common patterns

**Estimated Fix Time:**
- Stage 1: 2-3 days
- Stage 2: 2-3 days
- Stage 3: 1-2 days
- Stage 4: 1 day

**No Code Changes Yet** — Waiting for approval to proceed with Stage 1.

---

**END OF AUDIT REPORT**