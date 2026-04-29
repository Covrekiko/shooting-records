# STAGE 1C ANALYSIS — REPORTS / ANALYTICS FILTERING

**Status:** ✅ TRACING COMPLETE  
**Date:** 2026-04-29  
**Scope:** Reports & Analytics Data Filtering Only

---

## 1. FILES THAT LOAD REPORT DATA

| File | Purpose | Query | Status |
|------|---------|-------|--------|
| src/pages/Reports.jsx | Main reports page | `SessionRecord.filter({ status: 'completed' })` | ✅ **Already filters** |
| src/components/RecordsSection.jsx | Record list in Records page | `SessionRecord.filter({ status: 'completed' })` | ✅ **Already filters** |
| src/components/analytics/TargetShootingAnalytics.jsx | Target analytics | Receives filtered records only | ✅ **OK (input filtered)** |
| src/components/analytics/ClayShootingAnalytics.jsx | Clay analytics | Receives filtered records only | ✅ **OK (input filtered)** |
| src/components/analytics/DeerManagementAnalytics.jsx | Deer analytics | Receives filtered records only | ✅ **OK (input filtered)** |
| src/components/AmmoSpendingBreakdown.jsx | Spending summary | `AmmoSpending.filter({ created_by })` | ⚠️ **NEEDS FILTERING** |
| src/pages/Dashboard.jsx | Dashboard charts | `SessionRecord.filter({ created_by })` | ⚠️ **NEEDS STATUS FILTER** |

---

## 2. ENTITIES USED

- **SessionRecord** — All session data (target, clay, deer)
  - Fields: `category`, `status`, `date`, `created_by`, etc.
  
- **AmmoSpending** — Ammunition usage logs
  - Fields: `notes`, `session_type`, `date_used`, `created_by`
  - **Problem:** No direct link to SessionRecord status; includes deleted/orphaned usage

- **Rifle, Shotgun, Club, Area** — Supporting metadata

---

## 3. RECORD STATUSES

### SessionRecord.status Values
| Status | Meaning | Include? |
|--------|---------|----------|
| `completed` | Checked out, valid session | ✅ YES |
| `active` | Still in progress, not checked out | ❌ NO |
| (deleted) | Entity deleted (not in DB) | ❌ NO |
| (undefined) | Old records without status field | ⚠️ FALLBACK |

### Active Sessions
- SessionRecord with `status !== 'completed'` or `status` undefined but recent
- Should **NOT** appear in reports

### Orphaned Sessions
- SessionRecord with outing_id pointing to deleted DeerOuting
- Should **NOT** appear in reports

---

## 4. RECORDS THAT SHOULD BE INCLUDED

✅ **INCLUDE:**
- SessionRecord with `status: 'completed'` ✓
- Valid category (target_shooting, clay_shooting, deer_management) ✓
- Valid date ✓
- Created by current user ✓
- Has required fields for category:
  - Target: `rifles_used` or `rifle_id`
  - Clay: `shotgun_id` or `rounds_fired`
  - Deer: `location_id` or `location_name`

---

## 5. RECORDS THAT SHOULD BE EXCLUDED

❌ **EXCLUDE:**
- `status: 'active'` (still in progress)
- `status: null` or `undefined` (incomplete/orphaned)
- No category or invalid category
- Created by different user
- Marked as deleted (hard delete = not in DB)
- Test/demo/mock data (if present)
- Records with `created_date` in future (data integrity issue)

---

## 6. CURRENT INCLUSION/EXCLUSION STATUS

### PROBLEM 1: Dashboard Uses Unfiltered Query ⚠️
**File:** `src/pages/Dashboard.jsx` (lines 270, 278)

```javascript
// CURRENT (NO STATUS FILTER):
const allRecords = getRepository('SessionRecord').filter({ created_by: user.email });

// THEN FILTERS BY CATEGORY (but includes active/orphaned):
const targetShoots = allRecords.filter((r) => r.category === 'target_shooting');
```

**Impact:** Dashboard charts include active/orphaned sessions

### PROBLEM 2: AmmoSpending Not Filtered ⚠️
**File:** `src/components/AmmoSpendingBreakdown.jsx` (line 36)

```javascript
// CURRENT (NO STATUS CHECK):
let records = await base44.entities.AmmoSpending.filter({ created_by: user.email });

// THEN FILTERS BY DATE (but includes deleted session usage):
if (timeframe === 'month') {
  records = records.filter(r => new Date(r.date_used) >= thirtyDaysAgo);
}
```

**Impact:** Spending includes usage from deleted records

### GOOD: Reports & RecordsSection Already Filter ✅
**File:** `src/pages/Reports.jsx` (lines 43–45)

```javascript
// CORRECT:
const sessionRecords = await base44.entities.SessionRecord.filter({ 
  created_by: currentUser.email,
  status: 'completed'  // ✅ STATUS FILTER
});
```

---

## 7. EXACT ID MISMATCH (for AmmoSpending)

**Problem:** AmmoSpending notes field uses `session:${sessionId}` but deleted records are orphaned.

**Notes format after Stage 1B fix:**
- Deer: `session:sr-xyz|outing:deer-abc` (both IDs)
- Target/Clay: `session:sr-xyz` (only SessionRecord.id)

**Cleanup required:** Filter AmmoSpending by checking if session still exists

---

## 8. REQUIRED FIXES

### FIX 1: Add Status Filter to Dashboard
**File:** `src/pages/Dashboard.jsx`

**Before:**
```javascript
const allRecords = getRepository('SessionRecord').filter({ created_by: user.email });
```

**After:**
```javascript
const allRecords = getRepository('SessionRecord').filter({ 
  created_by: user.email,
  status: 'completed'  // ← ADD THIS
});
```

### FIX 2: Filter AmmoSpending by Valid Sessions
**File:** `src/components/AmmoSpendingBreakdown.jsx`

**Strategy:** 
1. Load all AmmoSpending records
2. Extract sessionIds from notes field
3. Check if those SessionRecords still exist and have `status: 'completed'`
4. Filter out orphaned/deleted records

**Code:**
```javascript
const loadSpending = async () => {
  try {
    setLoading(true);
    const user = await base44.auth.me();
    let records = await base44.entities.AmmoSpending.filter({ created_by: user.email });

    // Filter by valid sessions only
    const validSessions = await base44.entities.SessionRecord.filter({
      created_by: user.email,
      status: 'completed'
    });
    const validSessionIds = new Set(validSessions.map(s => s.id));
    
    // Keep only AmmoSpending from valid, completed sessions
    records = records.filter(r => {
      if (!r.notes) return false; // No session link
      // Extract session ID from notes (format: "session:sr-xyz" or "session:sr-xyz|outing:...")
      const match = r.notes.match(/session:([^\|]+)/);
      const sessionId = match ? match[1] : null;
      return sessionId && validSessionIds.has(sessionId);
    });

    // ... rest of filtering (timeframe, grouping)
```

---

## ACCEPTANCE TESTS EXPECTED

1. ✅ Create completed Deer record → Appears in Reports
2. ✅ Create completed Target record → Appears in Reports
3. ✅ Create completed Clay record → Appears in Reports
4. ✅ Start active Deer session, don't checkout → Does NOT appear in Reports
5. ✅ Delete/archive a record → Does NOT appear in Reports
6. ✅ Generate PDF → No deleted/active/orphaned records
7. ✅ Dashboard analytics → Only completed sessions counted
8. ✅ AmmoSpending breakdown → Only deleted sessions cleaned up

---

## NO UNINTENDED CHANGES

✅ GPS tracking (Stage 1A) — Untouched
✅ Ammunition refund (Stage 1B) — Untouched
✅ Reloading — Untouched
✅ Cleaning counters — Untouched
✅ Mobile UI — Untouched
✅ Map design — Untouched
✅ Colours — Untouched
✅ Layout — Untouched
✅ Menus — Untouched
✅ PDFs visual design — Untouched (logic only)
✅ Dashboard design — Untouched (query only)

---

## NEXT STEP

Implement Fix 1 (Dashboard) and Fix 2 (AmmoSpending) with full test coverage.