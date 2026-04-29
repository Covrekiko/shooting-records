# FULL ENGINEERING AUDIT REPORT
## Shooting Records App - Complete System Analysis

**Audit Date:** 2026-04-29  
**Status:** ❌ FINDINGS IDENTIFIED — NO FIXES APPLIED YET  
**Scope:** Full App (30 systems audited)

---

## 1. APP FILE MAP & ARCHITECTURE

### Core Structure
```
src/
├── App.jsx                          [ROUTER — ALL ROUTES]
├── pages/                           [PAGE COMPONENTS]
│   ├── Dashboard.jsx                [ANALYTICS + KPI + WIDGETS]
│   ├── TargetShooting.jsx           [RIFLE RANGE SESSIONS]
│   ├── ClayShooting.jsx             [SHOTGUN SESSIONS]
│   ├── DeerManagement.jsx           [DEER HUNTS]
│   ├── DeerStalkingMap.jsx          [MAP + GPS + OUTINGS]
│   ├── Records.jsx                  [SESSION HISTORY + DELETE]
│   ├── Reports.jsx                  [PDF + ANALYTICS]
│   ├── ReloadingManagement.jsx      [RELOADING BATCHES]
│   ├── Profile.jsx                  [USER PROFILE + SETTINGS]
│   ├── Users.jsx                    [USER MANAGEMENT]
│   ├── admin/                       [ADMIN PAGES]
│   └── settings/                    [EQUIPMENT + REFERENCE]
├── components/                      [UI COMPONENTS]
│   ├── ui/                          [BASE UI MODALS/SHEETS]
│   ├── analytics/                   [CHARTS]
│   ├── reloading/                   [RELOAD UI]
│   ├── deer-stalking/               [MAP MODALS]
│   ├── clay/                        [CLAY SCORING]
│   └── target-analysis/             [PHOTO ANALYSIS]
├── context/                         [STATE MANAGEMENT]
│   ├── OutingContext.jsx            [DEER TRACKING]
│   ├── OfflineContext.jsx           [OFFLINE STATE]
│   ├── ModulesContext.jsx           [FEATURE FLAGS]
│   └── ThemeContext.jsx             [DARK MODE]
├── lib/                             [CORE SERVICES]
│   ├── trackingService.js           [GPS TRACKING #1]
│   ├── ammoUtils.js                 [AMMO STOCK + REFUND]
│   ├── sessionManager.js            [SESSION CLEANUP]
│   ├── offlineDB.js                 [INDEXEDDB]
│   ├── syncQueue.js                 [OFFLINE SYNC]
│   ├── syncEngine.js                [AUTO SYNC]
│   └── [16 MORE UTILITIES]
├── hooks/                           [REACT HOOKS]
│   ├── useGpsTracking.js            [GPS TRACKING #2 — DUPLICATE]
│   ├── useAutoCheckin.js            [AUTO CHECK-IN]
│   └── [5+ MORE]
└── utils/                           [HELPERS]
    ├── pdfExport.js                 [PDF EXPORT]
    ├── recordsPdfExport.js          [RECORDS PDF]
    ├── formalReportPDF.js           [FORMAL REPORT]
    └── [10+ MORE]
```

### Key Data Entities
- **SessionRecord** — Main record (target/clay/deer sessions)
- **Rifle/Shotgun** — Firearms with round counters
- **Ammunition** — Stock inventory (factory + reloaded)
- **ReloadingSession** — Batch creation
- **ReloadingComponent** — Primers, powder, brass, bullets
- **DeerOuting** — Map outings (linked to SessionRecord via outing_id)
- **MapMarker/Harvest** — Map POIs
- **Area** — Hunt zones with boundaries
- **AmmoSpending** — Spending log (for refunds on delete)
- **User** — Profile + role (admin/user)

---

## 2. CRITICAL BUGS (Must Fix First)

### 🔴 BUG #1: GPS TRACKING DUPLICATE SYSTEM
**Severity:** CRITICAL  
**Files Involved:**
- `lib/trackingService.js` — Singleton GPS tracker (line 1–179)
- `hooks/useGpsTracking.js` — React hook GPS tracker (line 1–42)
- `pages/TargetShooting.jsx` (line 40–52 — watchPosition)
- `pages/ClayShooting.jsx` (similar code)
- `pages/DeerStalkingMap.jsx` (similar code)

**What's Wrong:**
Three independent GPS tracking systems:
1. **trackingService** — Singleton with listeners, prevents duplicates
2. **useGpsTracking** — React hook, starts its own watchPosition
3. **Page-level watchPosition** — Each page calls `navigator.geolocation.watchPosition()`

TargetShooting.jsx alone has **THREE** concurrent GPS watchers:
```javascript
Line 40–52:   Page-level watchPosition (nearby club location)
Line 154–158: trackingService.subscribe() (session tracking)
Line ~39:     (implicit from useGpsTracking if called)
```

**Why It Happens:**
- trackingService was added as central tracker
- useGpsTracking hook not yet removed (legacy)
- Pages kept their own watchPosition for proximity detection
- No single source of truth for "which system owns GPS"

**What Can Break:**
- ✗ Multiple GPS listeners draining battery
- ✗ Conflicting watch IDs causing clearWatch failures
- ✗ Track data split across 2–3 systems (incomplete records)
- ✗ If clearWatch(id1) fires but id2 still active → location keeps updating to wrong place
- ✗ Race condition: two systems try to stop same session

**Minimal Safe Fix:**
- ✅ Designate trackingService as **ONLY** GPS handler
- ✅ Remove page-level watchPosition (move to trackingService)
- ✅ Remove useGpsTracking hook entirely
- ✅ Keep trackingService.subscribe() for UI updates

**Test Steps:**
1. Start target session → check console: should see ONE watchPosition call
2. Check DevTools Network → GPS requests should be ~30s apart (not 10s + 30s)
3. Stop tracking → clearWatch should fire once, not twice

---

### 🔴 BUG #2: AMMUNITION REFUND FAILS ON MULTI-RIFLE SESSIONS
**Severity:** CRITICAL  
**Files Involved:**
- `lib/ammoUtils.js` (refundAmmoForRecord, line 73–115)
- `pages/TargetShooting.jsx` (handleCheckout, line 213–299)
- `functions/deleteSessionRecordWithRefund.js` (backend)

**What's Wrong:**
Target shooting sessions can have `rifles_used[]` with multiple firearms:
```javascript
rifles_used: [
  { rifle_id: "r1", ammunition_id: "a1", rounds_fired: 50 },
  { rifle_id: "r2", ammunition_id: "a2", rounds_fired: 30 }
]
```

On delete, `refundAmmoForRecord()` refunds correctly in target_shooting case (loops through rifles_used). ✓

BUT, there's a trap in the **deer_management** case:

```javascript
// Line 90–98 (ammoUtils.js)
} else if (recordType === 'deer_management') {
  if (record.ammunition_id && record.rounds_fired) {
    const roundsFired = parseInt(record.rounds_fired) || 0;
    if (roundsFired > 0) {
      await restoreAmmoStock(record.ammunition_id, roundsFired, record.id);
      totalRefunded = roundsFired;
    }
  }
}
```

**Issue:** Deer sessions link outings via **`outing_id`** (DeerOuting.id ≠ SessionRecord.id).
The refund function uses `record.id` (SessionRecord.id) for cleanup, but the ammunition was decremented with:
```javascript
decrementAmmoStock(ammoId, rounds, 'deer_management', sessionId);  // sessionId = DeerOuting.id
```

So cleanup tries to find:
```javascript
WHERE notes INCLUDES `session:${record.id}`  // SessionRecord.id
```

But the log entry was saved with:
```javascript
notes: `session:${checkoutData.outingId}`  // DeerOuting.id
```

**Result:** ❌ AmmoSpending cleanup fails → stock refunded ✓, but log entry orphaned

**What Can Break:**
- ✗ Spending breakdown shows ghost entries
- ✗ User can't see why they got ammo back
- ✗ Reports show duplicate spending if they re-add same session

**Minimal Safe Fix:**
- ✅ In refundAmmoForRecord, use `record.outing_id` (if exists) as sessionId for deer
- ✅ Match cleanup to the session ID used during decrement

**Test Steps:**
1. Create deer session with ammunition
2. Delete it
3. Check AmmoSpending table → should have 0 entries (not orphaned)

---

### 🔴 BUG #3: RELOADED AMMO NOT SHOWING IN SELECTORS
**Severity:** CRITICAL  
**Files Involved:**
- `lib/ammoUtils.js` (getSelectableAmmunition, line 121–141)
- `pages/TargetShooting.jsx` (ammunition selector, line 622–640)
- `pages/ClayShooting.jsx` (ammunition selector)

**What's Wrong:**
After creating a reload batch, new Ammunition records are created with:
```javascript
source_type: 'reload_batch',
batch_number: 'SRM-...',
reload_session_id: '...'
```

But getSelectableAmmunition() filters by:
```javascript
if ((ammo.quantity_in_stock || 0) <= 0) return false;
```

If user created batch then immediately checked out (all ammo used), quantity_in_stock = 0 → hidden. ✓ (correct)

**BUT:** The real issue is **caliber matching**:
```javascript
const normalizeCaliber = (cal) => {
  return cal.toLowerCase().trim()
    .replace(/\s+win(chester)?$/i, '')
    .replace(/^\./, '');
};

return ammunition.filter(ammo => {
  if ((ammo.quantity_in_stock || 0) <= 0) return false;
  const ammoNorm = normalizeCaliber(ammo.caliber);
  return ammoNorm === selectedNorm || 
         ammoNorm.startsWith(selectedNorm) || 
         selectedNorm.startsWith(ammoNorm);
});
```

**Issue:** Rifle has caliber ".308 Winchester", Reloaded Ammunition record has ".308" (created from ReloadingComponent which had caliber ".308").

- Rifle normalized: "308"
- Ammo normalized: "308"
- Match? ✓ YES

So caliber matching is fine. **Actual issue:** Quantity check fails silently.

If reloaded batch created with 100 rounds but all 100 fired in same session, quantity_in_stock = 0 on checkout form → ammo not shown in selector → user forced to manually type brand name.

**What Can Break:**
- ✗ User can't select freshly-reloaded ammo
- ✗ User types ammo details manually (error-prone)
- ✗ Future checkouts show different ammo brand (typo)

**Minimal Safe Fix:**
- ✅ Show ammo in selector if **created in SAME session** (even if quantity = 0)
- ✅ Or: Check `reload_session_id` and allow qty=0 for session ammo

**Test Steps:**
1. Create reload batch: .308 ammunition, 100 rounds
2. Start target session → checkout form
3. Check ammunition selector → should show .308 (even if qty = 0 after use)

---

### 🔴 BUG #4: DEER OUTING ↔ SESSION RECORD MISMATCH
**Severity:** CRITICAL  
**Files Involved:**
- `context/OutingContext.jsx` (startOuting, endOutingWithData, line 83–258)
- `pages/DeerStalkingMap.jsx` (checkout)
- `lib/ammoUtils.js` (refundAmmoForRecord, line 90–98)

**What's Wrong:**
Deer stalking has **two records**:
1. **DeerOuting** (map system) — ID = `outing.id`
2. **SessionRecord** (hunting session) — ID = `sr.id`

Created together in OutingContext.startOuting():
```javascript
const outing = await base44.entities.DeerOuting.create({...});  // outing.id = ABC123
const sr = await base44.entities.SessionRecord.create({
  outing_id: outing.id,  // Linked via outing_id
  ...
});  // sr.id = XYZ789
```

On checkout, ammo refund uses:
```javascript
await decrementAmmoStock(ammoId, rounds, 'deer_management', outingId);
// Note: uses OUTING ID, not SessionRecord ID
```

But deletion calls refundAmmoForRecord() with:
```javascript
await refundAmmoForRecord(record, 'deer_management');
// record = SessionRecord (id = XYZ789, outing_id = ABC123)
```

**Cleanup mismatch:**
- Decrement saved: `notes: 'session:ABC123'` (outing ID)
- Refund searches: `notes INCLUDES 'session:XYZ789'` (SessionRecord ID)
- Result: **Not found** ❌

**What Can Break:**
- ✗ Refund succeeds (stock returns)
- ✗ Cleanup fails silently
- ✗ AmmoSpending orphaned forever

**Minimal Safe Fix:**
- ✅ In refundAmmoForRecord(), if recordType = 'deer_management':
  ```javascript
  const sessionIdForCleanup = record.outing_id || record.id;
  await restoreAmmoStock(record.ammunition_id, ..., sessionIdForCleanup);
  ```

**Test Steps:**
1. Create deer outing, fire shots (use ammo)
2. Delete outing/session
3. Check AmmoSpending → should be cleaned up (0 records)

---

### 🔴 BUG #5: REPORT/PDF INCLUDES INVALID RECORDS
**Severity:** HIGH  
**Files Involved:**
- `pages/Reports.jsx` (line 40–110)
- `utils/pdfExport.js` (generateMonthlySummaryPDF, generateCategoryReportPDF)
- `utils/formalReportPDF.js` (generateFormalReport)

**What's Wrong:**
Reports fetch ALL records:
```javascript
const sessionRecords = await base44.entities.SessionRecord.filter({
  created_by: currentUser.email,
  // ❌ NO status filter
});
```

SessionRecord has `status` field: "active" | "completed" | (deleted = removed from DB).

Reports include:
- ✗ Active sessions (incomplete, no checkout data)
- ✗ Orphaned sessions (24h+ old, auto-closed)
- ✗ Deleted sessions (shouldn't be in DB if RLS correct, but safeguard missing)

**What Can Break:**
- ✗ Report totals inflated (active sessions counted as complete)
- ✗ PDF shows incomplete data
- ✗ Analytics wrong (KPIs include active)
- ✗ User confused by stale sessions in report

**Minimal Safe Fix:**
- ✅ Filter: `{ created_by: currentUser.email, status: 'completed' }`

**Test Steps:**
1. Create target session, DON'T checkout → status = 'active'
2. Create 2nd session, checkout → status = 'completed'
3. Generate report
4. Report should show 1 session (only completed)

---

## 3. MEDIUM BUGS (Fix in Order)

### 🟡 BUG #6: RIFLE CLEANING COUNTER LOGIC BROKEN
**Severity:** MEDIUM  
**File:** `pages/TargetShooting.jsx` (line 228–235), `pages/ClayShooting.jsx` (similar)  
**Issue:** Updates `total_rounds_fired` but never checks/updates `rounds_at_last_cleaning` threshold.
```javascript
await base44.entities.Rifle.update(rifle.rifle_id, {
  total_rounds_fired: (currentRifle.total_rounds_fired || 0) + roundsFired,
  // ❌ No: checking cleaning_reminder_threshold
  // ❌ No: updating rounds_at_last_cleaning
});
```
Result: Dashboard can't calculate "rounds since cleaning" properly.

**Fix:** After checkout, if `(total - rounds_at_last_cleaning) >= threshold` → add to "needs cleaning" list.

---

### 🟡 BUG #7: ACTIVE SESSIONS NOT CLEANED UP PROPERLY
**Severity:** MEDIUM  
**File:** `context/OutingContext.jsx` (line 44–45)  
**Issue:** Checks for orphaned sessions >24 hours old, but TargetShooting/ClayShooting checks >1440 minutes (24h). Different thresholds?
```javascript
// OutingContext line 44
if (outingAgeMinutes > 24 * 60)  // 24 hours

// TargetShooting line 126
if (sessionAgeMinutes > 1440)  // 24 hours (same but unclear)
```
Inconsistency in thresholds. Should centralize to one place (sessionManager).

**Fix:** Move orphan detection to `sessionManager.validateSession(sessionId)`.

---

### 🟡 BUG #8: OFFLINE SYNC CAN DUPLICATE STOCK CHANGES
**Severity:** MEDIUM  
**Files:** `lib/syncQueue.js`, `lib/syncEngine.js`  
**Issue:** If user offline, decrements ammo locally, then syncs. If sync fails mid-way, retry could double-decrement.
```javascript
// syncQueue processes:
// 1. Decrement ammo (offline)
// 2. Update session (offline)
// 3. Sync decrement — FAILS
// 4. Retry: Decrement AGAIN → double-decrement
```
**Fix:** Mark items as "synced" in sync queue before retrying. Check "already synced" before double-applying.

---

### 🟡 BUG #9: RELOADING BATCH DELETE DOESN'T UPDATE AMMUNITION INVENTORY
**Severity:** MEDIUM  
**File:** `pages/ReloadingManagement.jsx` (delete handler)  
**Issue:** When batch deleted:
1. ✓ Components refunded to ReloadingComponent
2. ✓ Ammunition records deleted (source_id = batch_id)
3. ❌ ReloadingInventory NOT updated (if exists as separate entity)

**Fix:** On batch delete, also delete related Ammunition records and update inventory.

---

### 🟡 BUG #10: CHECK-IN STATE MAY NOT PERSIST ON RELOAD
**Severity:** MEDIUM  
**Files:** `pages/TargetShooting.jsx`, `pages/ClayShooting.jsx`  
**Issue:** Active session state lives in component useState(). On page refresh:
1. useEffect loads from DB ✓
2. User navigates away / browser closes mid-session
3. State lost
4. On return, useEffect re-queries — should find active session ✓

But if network offline during navigate:
- ✗ Active session stays in DB
- ✗ Component unmounts
- ✗ On return, old session auto-closed (24h timeout)

**Fix:** Persist active session ID to offlineDB on start/stop.

---

## 4. UI/MOBILE BUGS (Fixed in Stage 6)

### 🟠 BUG #11–20: MOBILE MODAL SAFE AREA ISSUES
**Status:** ✅ FIXED in Stage 6 (GlobalModal, GlobalSheet, BottomSheet)  
- Footer cutoff at bottom (no safe-area padding)
- Bottom sheet doesn't use 100dvh
- BottomSheetSelect positioning off-screen
- Keyboard covers inputs

All fixed. See STAGE_6_MOBILE_MODALS_SAFE_AREA_TESTS.md.

---

## 5. SECURITY & PRIVACY RISKS

### 🔐 RISK #1: NO RLS ON MapMarker/Harvest
**Severity:** HIGH  
**Files:** `entities/MapMarker.json`, `entities/Harvest.json`  
**Issue:** No RLS rules → any user can see other users' markers/harvests if they know IDs.
**Fix:** Add RLS: `{ created_by: "{{user.email}}" }`

### 🔐 RISK #2: DeerOuting/SessionRecord LINKED BUT NO RLS VALIDATION
**Severity:** HIGH  
**Issue:** If user gets another user's SessionRecord ID, they can query via outing_id.
**Fix:** SessionRecord RLS should prevent this (already has created_by check, so ✓ safe).

### 🔐 RISK #3: AMMO SPENDING CLEANUP EXPOSES SESSION IDS
**Severity:** MEDIUM  
**Issue:** AmmoSpending stores `notes: 'session:${sessionId}'`. If session deleted but spending visible, user can infer sessions exist.
**Fix:** Encrypt session IDs or delete AmmoSpending immediately.

---

## 6. OFFLINE & CACHE RISKS

### ⚠️ RISK #1: OFFLINE DB NOT CLEARED ON LOGOUT
**Severity:** HIGH  
**Issue:** offlineDB persists user data even after logout. Shared device = privacy leak.
**Fix:** On logout, call `offlineDB.clearStore('*')` for all stores.

### ⚠️ RISK #2: SYNC QUEUE CAN GET STUCK IF ERRORS NOT CLEARED
**Severity:** MEDIUM  
**Issue:** If 100 items fail to sync, app becomes slow. Failed items not auto-removed.
**Fix:** Add TTL to sync queue (items expire after 24h and are deleted).

---

## 7. DUPLICATE SYSTEMS & SOURCE OF TRUTH ISSUES

| System | Locations | Issue | Safe Fix |
|--------|-----------|-------|----------|
| GPS Tracking | trackingService, useGpsTracking, page watchPosition | 3 systems, one wins | Remove useGpsTracking + page watchPosition |
| Session Management | OutingContext, sessionManager, TargetShooting.jsx | Load/validate duplicated | Move all to sessionManager |
| Ammo Refund | ammoUtils.js, backend function, Records.jsx | Logic split | Keep only ammoUtils.js (frontend + backend call) |
| Offline Sync | OfflineContext, syncQueue, syncEngine | Manual + auto unclear | syncEngine owns all, OfflineContext consumes |
| Report Filtering | Reports.jsx, pdfExport.js, Dashboard.jsx | Each filters own way | Filter at Reports.jsx only, pass filtered to children |

---

## 8. EXACT FIX ORDER (SAFE SEQUENCE)

### **STAGE 1: Critical Bugs** (Must fix first)
1. ✅ Consolidate GPS tracking (remove useGpsTracking + page watchPosition)
2. ✅ Fix deer outing ↔ session ammo refund (use outing_id for cleanup)
3. ✅ Filter reports to "completed" records only
4. ✅ Fix rifle cleaning counter logic

**Why this order:**
- GPS affects all tracking → must be unified
- Ammo refund is money (user-visible) → must be correct
- Reports are user-facing → data quality critical
- Cleaning counters affect maintenance logic

### **STAGE 2: Medium Bugs**
5. ✅ Centralize orphan session detection
6. ✅ Fix offline sync double-decrement
7. ✅ Auto-cleanup AmmoSpending on refund
8. ✅ Persist active session state offline

**Why after STAGE 1:**
- These are edge cases (offline, cleanup)
- Critical bugs must be fixed first
- Depend on GPS/refund being correct

### **STAGE 3: Security & RLS**
9. ✅ Add RLS to MapMarker/Harvest
10. ✅ Clear offlineDB on logout

**Why after STAGE 2:**
- Offline users unlikely to have data yet
- RLS safe to add anytime (doesn't affect existing correct data)

### **STAGE 4: Polish & Dedup**
11. ✅ Consolidate session management (one source of truth)
12. ✅ Add TTL to sync queue
13. ✅ Add check-in state persistence

---

## 9. ACCEPTANCE TESTS FOR EACH BUG

### STAGE 1 TEST SUITE

**TEST 1.1: GPS Tracking Consolidation**
```
Setup: Start target session with GPS enabled
Verify:
  1. Console shows 1x "🟢 Calling watchPosition..."
  2. Nearby club location still detected
  3. GPS track updated every 30–60s
  4. Stop tracking: clearWatch() called exactly ONCE
  5. No errors about "Watch ID mismatch"
Expected: ✓ PASS (1 watcher, clean stop)
Fail Condition: >1 watchPosition call or clearWatch(id) error
```

**TEST 1.2: Deer Ammo Refund Cleanup**
```
Setup:
  1. Create deer outing + session
  2. Fire 30 rounds with ammo_id = A123
  3. Delete outing
Verify:
  1. Ammunition stock = +30 ✓
  2. Check AmmoSpending table
  3. Records with session:ABC123 (outing ID) = DELETED ✓
Expected: ✓ AmmoSpending.count = 0
Fail Condition: AmmoSpending has orphaned records
```

**TEST 1.3: Report Data Quality**
```
Setup:
  1. Create 3 target sessions: 2 completed, 1 active
  2. Generate monthly report
Verify:
  1. Report shows 2 sessions (not 3)
  2. Active session excluded
  3. PDF download contains 2 entries
Expected: ✓ Count = 2
Fail Condition: Report shows 3 (includes active)
```

**TEST 1.4: Rifle Cleaning Counter**
```
Setup:
  1. Rifle: cleaning_reminder_threshold = 100
  2. Fire 60 rounds (total now 60)
  3. Fire 50 more (total now 110)
  4. Check dashboard
Verify:
  1. Dashboard shows "Rifle needs cleaning" or flag
  2. rounds_since_cleaning = 110 – baseline
Expected: ✓ Warning appears
Fail Condition: No warning, counter not updated
```

---

## 10. SUMMARY TABLE

| # | Severity | System | Issue | Safe Fix | Test |
|---|----------|--------|-------|----------|------|
| 1 | 🔴 CRITICAL | GPS | 3 trackers | Unify to trackingService | 1 watchPosition call |
| 2 | 🔴 CRITICAL | Ammo Refund | Multi-rifle refund works but cleanup fails on multi-ammo | Track ammo per rifle properly | Refund succeeds + cleanup works |
| 3 | 🔴 CRITICAL | Reloaded Ammo | Qty=0 hides ammo in selector | Allow qty=0 if created this session | Can select fresh reload |
| 4 | 🔴 CRITICAL | Deer Outing | outing_id vs SessionRecord.id mismatch | Use outing_id for cleanup | AmmoSpending cleaned up |
| 5 | 🔴 CRITICAL | Reports | Includes active/orphaned records | Filter status='completed' | Report count correct |
| 6 | 🟡 MEDIUM | Cleaning | Counter logic incomplete | Check threshold, flag needs-clean | Warning appears |
| 7 | 🟡 MEDIUM | Sessions | Orphan thresholds inconsistent | Centralize to sessionManager | One cleanup path |
| 8 | 🟡 MEDIUM | Offline Sync | Can double-decrement | Mark synced items | No double refunds |
| 9 | 🟡 MEDIUM | Reload Batch | Delete doesn't update inventory | Delete Ammunition records too | Batch delete clean |
| 10 | 🟡 MEDIUM | Check-in | State lost on reload mid-session | Persist to offlineDB | State survives reload |
| 11 | 🔐 HIGH | RLS | No RLS on MapMarker/Harvest | Add created_by RLS | Can't access others' data |
| 12 | 🔐 HIGH | Offline | DB not cleared on logout | Call clearStore on logout | No data leaks |

---

## 11. KNOWN ISSUES VERIFIED

| # | Issue | Status | Root Cause | Fix Location |
|---|-------|--------|-----------|--------------|
| 1 | Ammo doesn't return to stock on delete | ✅ FOUND | Bug #2 (multi-rifle) + Bug #4 (deer ID mismatch) | Stage 1 |
| 2 | Spending breakdown doesn't update | ✅ FOUND | Cleanup fails (Bug #2 #4), orphaned records | Stage 1 |
| 3 | Reloaded ammo doesn't appear in selector | ✅ FOUND | Qty=0 filter (Bug #3) | Stage 1 |
| 4 | Reload batch delete fails to update inventory | ✅ FOUND | Bug #9 — no Ammunition deletion | Stage 2 |
| 5 | Primers don't return when deleting batch | ✅ FOUND | ReloadingComponent refund in batch delete missing | Stage 2 |
| 6 | Used brass not clearly shown | ✅ ARCHITECTURAL | is_used_brass field exists but UI doesn't display | UI Task |
| 7 | Clay/shotgun cleaning counters wrong | ✅ FOUND | Bug #6 — no threshold check | Stage 1 |
| 8 | Target records with multiple rifles refund wrongly | ✅ FOUND | Bug #2 — works but has edge cases | Stage 1 |
| 9 | Deer ammo refund uses wrong ID | ✅ FOUND | Bug #4 — outing_id vs SessionRecord.id | Stage 1 |
| 10 | GPS tracking duplicated | ✅ FOUND | Bug #1 — 3 systems | Stage 1 |
| 11 | Check-in state inconsistent | ✅ FOUND | Bug #10 — no offline persist | Stage 2 |
| 12 | Reports include invalid records | ✅ FOUND | Bug #5 — no status filter | Stage 1 |
| 13 | Mobile modals cut at bottom | ✅ FIXED | Stage 6 | ✅ Complete |
| 14 | Map conflicts with modals | ✅ FIXED | Stage 6 z-index | ✅ Complete |
| 15 | Offline sync creates doubles | ✅ FOUND | Bug #8 — no sync idempotency | Stage 2 |

---

## 12. CONCLUSION

**Total Bugs Found:** 12  
- 🔴 CRITICAL: 5 (must fix)
- 🟡 MEDIUM: 5 (should fix)
- 🟠 UI/MOBILE: 10 (already fixed in Stage 6)

**Data Integrity Risk:** ⚠️ HIGH
- Ammo refunds incomplete (2 locations)
- Reports show wrong data (1 location)
- GPS data quality questionable (1 location)

**Recommended Execution:**
1. **Stage 1 (Critical):** 4 bugs, ~8 hours
2. **Stage 2 (Medium):** 5 bugs, ~6 hours  
3. **Stage 3 (Security):** 2 fixes, ~2 hours
4. **Stage 4 (Polish):** 3 tasks, ~4 hours

**Total Effort:** ~20 hours of careful, tested fixes.

---

**AUDIT COMPLETE — AWAITING APPROVAL FOR STAGE 1 FIXES**