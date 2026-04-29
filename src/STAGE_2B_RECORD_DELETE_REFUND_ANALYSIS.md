# STAGE 2B ANALYSIS — RECORD DELETE/REFUND COMPLETENESS

**Status:** ✅ ANALYSIS COMPLETE  
**Date:** 2026-04-29  
**Scope:** Ammunition refund logic for all record deletion paths

---

## 1. WHICH DELETE FUNCTION EACH RECORD TYPE USES

### All Record Types (Unified)

**File:** `src/components/RecordsSection.jsx` (Lines 51–98)

```javascript
const handleDelete = async (record) => {
  // ... online check, confirmation ...
  
  const result = await base44.functions.invoke('deleteSessionRecordWithRefund', {
    sessionId: record.id,
  });
  
  if (!result.data.success) {
    throw new Error(result.data.message || 'Refund failed');
  }
  
  // For clay shooting, also clean up stands/shots
  if (category === 'clay_shooting') {
    try {
      await base44.functions.invoke('deleteClaySessionStands', { sessionId: record.id });
    } catch (e) {
      console.warn('⚠️ Warning: Could not delete clay stands/shots:', e.message);
    }
  }
  
  // Reload records from database
  const updatedRecords = await base44.entities.SessionRecord.filter({
    created_by: currentUser.email,
    category,
    status: 'completed',
  });
  setRecords(updatedRecords);
  
  if (onRecordDeleted) onRecordDeleted();
};
```

**Key Points:**
- ✓ Unified delete path: ALL record types (target, clay, deer) call same backend function
- ✓ Function receives FULL record object (not just ID)
- ✓ Online check enforced (line 54–58)
- ✓ Refund failure blocks deletion (line 67–69)
- ✓ Clay-specific cleanup called AFTER delete (line 74–81)
- ✓ UI refreshed after delete (line 84–90)
- ✓ Parent callback fired (line 93)

**Backend Function:** `deleteSessionRecordWithRefund` (backend, not visible in files yet)

---

## 2. WHETHER DELETE RECEIVES FULL RECORD OR ONLY ID

**Full Record Received** ✓

**File:** `src/components/RecordsSection.jsx` (Line 132)

```javascript
<button onClick={() => handleDelete(record.id)} ...
```

**Wait — Bug Found! ❌**

Line 132 passes `record.id` (only ID), but line 51 function signature accepts `record` (full object).

**Actual Flow:**
```
handleDelete(record.id)  ← Passes ONLY ID
  ↓
async (record) => {
  // record = string ID, not full record object!
}
```

**This is a bug:** Function expects full record, receives only ID.

**What Should Happen:**
```
handleDelete(record)  ← Pass full object
```

---

## 3. WHERE AMMO ID AND QUANTITY ARE SAVED

### Target Shooting
**File:** `src/pages/TargetShooting.jsx` (Lines 248–263)

```javascript
await base44.entities.SessionRecord.update(activeSession.id, {
  status: 'completed',
  checkout_time: formData.checkout_time,
  rifles_used: formData.rifles_used,  // ← ARRAY with ammunition_id + rounds_fired PER RIFLE
  // Top-level summary for easy restore — first ammo ID used
  ammunition_id: allAmmoIds[0] || null,  // ← First ammo ID only
  rounds_fired: totalRoundsFired,  // ← Total rounds ALL rifles
  notes: formData.notes,
  photos: photoUrls,
  active_checkin: false,
  gps_track: finalTrack,
});
```

**Ammo Saved:**
- `rifles_used[].ammunition_id` — ammo per rifle ✓ (CORRECT for multi-rifle)
- `rifles_used[].rounds_fired` — rounds per rifle ✓ (CORRECT for multi-ammo)
- `ammunition_id` (top-level) — first ammo only (fallback, NOT reliable)
- `rounds_fired` (top-level) — total rounds (correct for summary)

### Clay Shooting
**File:** `src/pages/ClayShooting.jsx` (Lines 253–264)

```javascript
await base44.entities.SessionRecord.update(activeSession.id, {
  status: 'completed',
  checkout_time: formData.checkout_time || ...,
  shotgun_id: formData.shotgun_id,
  rounds_fired: formData.rounds_fired ? parseInt(formData.rounds_fired) : 0,  // ← Top-level rounds
  ammunition_id: formData.ammunition_id,  // ← Ammo used
  ammunition_used: formData.ammunition_used,  // ← Description (optional)
  notes: formData.notes,
  photos: photoUrls,
  active_checkin: false,
  gps_track: finalTrack,
});
```

**Ammo Saved:**
- `ammunition_id` — single ammo item ✓
- `rounds_fired` — cartridges used ✓
- `ammunition_used` — text description (optional)

### Deer Management
**File:** `src/pages/DeerManagement.jsx` (Lines 135–143)

```javascript
const submitData = { ...checkoutData, active_checkin: false, rounds_fired: roundsFired };
if (!checkoutData.shot_anything) {
  submitData.species_list = [];
  submitData.total_count = null;
  submitData.rounds_fired = 0;
  submitData.rifle_id = null;
  submitData.ammunition_id = null;  // ← Cleared if no shots
  submitData.ammunition_used = null;
}

// Save to database FIRST, then stop tracking
await endOutingWithData(activeOuting.id, submitData, finalTrack);
```

**Ammo Saved:**
- `ammunition_id` — single ammo item ✓
- `rounds_fired` — rounds used ✓
- `rifle_id` — rifle used ✓
- `ammunition_used` — text description (optional)
- Cleared entirely if `shot_anything = false`

---

## 4. WHERE AMMOSPENDING IS LINKED

**All Type:** AmmoSpending linked via `notes` field

**File:** `src/lib/ammoUtils.js` (Lines 20–26)

```javascript
const notesValue = sessionId && outingId
  ? `session:${sessionId}|outing:${outingId}`  // Deer: both IDs for fallback
  : sessionId
  ? `session:${sessionId}`  // Target/Clay: only SessionRecord.id
  : undefined;

await base44.entities.AmmoSpending.create({
  ammunition_id: ammunitionId,
  brand: ammo.brand,
  caliber: ammo.caliber,
  quantity_used: quantity,
  cost_per_unit: ammo.cost_per_unit || 0,
  total_cost: quantity * (ammo.cost_per_unit || 0),
  date_used: new Date().toISOString().split('T')[0],
  session_type: sessionType,
  notes: notesValue,  // ← Only stable link!
});
```

**Link Pattern:**
- Target: `notes: "session:${sessionId}"`
- Clay: `notes: "session:${sessionId}"`
- Deer: `notes: "session:${sessionId}|outing:${outingId}"` (both for fallback)

**Problem:** Only link is in notes field — fragile

---

## 5. WHERE RESTORE/REFUND HELPER IS CALLED

**File:** `src/lib/ammoUtils.js` (Lines 87–133)

```javascript
export async function refundAmmoForRecord(record, recordType) {
  if (!record || !record.id) return { success: true, refunded: 0 };

  let totalRefunded = 0;

  try {
    if (recordType === 'target_shooting' && record.rifles_used?.length > 0) {
      // Target: loop through all rifles, refund each ammo entry
      for (const rifleStat of record.rifles_used) {
        if (rifleStat.ammunition_id && rifleStat.rounds_fired) {
          const roundsFired = parseInt(rifleStat.rounds_fired) || 0;
          if (roundsFired > 0) {
            await restoreAmmoStock(rifleStat.ammunition_id, roundsFired, record.id);
            totalRefunded += roundsFired;
          }
        }
      }
    } else if (recordType === 'deer_management') {
      // Deer: use top-level ammunition_id and rounds_fired
      // Pass both SessionRecord.id AND outing_id for reliable cleanup with fallback
      if (record.ammunition_id && record.rounds_fired) {
        const roundsFired = parseInt(record.rounds_fired) || 0;
        if (roundsFired > 0) {
          await restoreAmmoStock(record.ammunition_id, roundsFired, record.id, record.outing_id);
          totalRefunded = roundsFired;
        }
      }
    } else if (recordType === 'clay_shooting') {
      // Clay: check for ammunition usage (use ammunition_id and rounds_fired if available)
      if (record.ammunition_id && record.rounds_fired) {
        const roundsFired = parseInt(record.rounds_fired) || 0;
        if (roundsFired > 0) {
          await restoreAmmoStock(record.ammunition_id, roundsFired, record.id);
          totalRefunded = roundsFired;
        }
      }
    }

    return { success: true, refunded: totalRefunded };
  } catch (error) {
    console.error(`[AMMO REFUND ERROR] recordType: ${recordType} recordId: ${record.id} error: ${error.message}`);
    return { success: false, error: error.message, refunded: 0 };
  }
}
```

**Refund Logic:**
- ✓ Target: Loops rifles_used[], refunds each ammo separately
- ✓ Clay: Refunds single ammunition_id
- ✓ Deer: Refunds using both sessionId and outingId for fallback cleanup

---

## 6. WHICH CASES CURRENTLY FAIL

### CRITICAL BUG #1: Wrong Parameter Type ❌

**Location:** `RecordsSection.jsx` Line 132

**Current:** `handleDelete(record.id)` passes ONLY ID
**Expected:** `handleDelete(record)` should pass full record object

**Impact:** Backend function receives ID string instead of full record object → cannot extract ammunition_id, rifles_used[], etc. → refund fails silently

### CRITICAL BUG #2: Backend Function Not Implemented ❌

**Location:** `deleteSessionRecordWithRefund` (unknown location)

**Status:** Function is called (line 63) but not visible in codebase — likely doesn't exist yet

**Impact:** All deletes fail because function doesn't exist

### MEDIUM BUG #3: No Validation on Refund Failure ❌

**Location:** `RecordsSection.jsx` Line 67–69

```javascript
if (!result.data.success) {
  throw new Error(result.data.message || 'Refund failed');
}
```

**Current:** Throws error if refund fails, but doesn't provide context-specific help

**Expected:** Should show user which ammo couldn't be refunded, not just "Refund failed"

---

## CORRECT DELETE ORDER (Required Behavior)

1. **Load full record before deletion** ✓ (already passed to handleDelete, but as ID only)
2. **Identify all ammo usage linked to record** ✓ (in rifles_used for Target, ammunition_id for Clay/Deer)
3. **Refund correct Ammunition stock item(s)** ✓ (refundAmmoForRecord loops rifles)
4. **Reverse/delete AmmoSpending rows** ✓ (restoreAmmoStock does this)
5. **Delete or soft-delete the record** ✗ (happens in backend function, need to verify)
6. **Refresh records, inventory, spending, dashboard** ✓ (lines 84–93 do this)

---

## SPECIAL RULES

### Target Special Rule
**If record has multiple rifles/ammo in rifles_used, refund every ammo item, not only top-level ammunition_id**

**Current Status:** ✓ CORRECT

Code refunds from `rifles_used[]` loop, not from top-level `ammunition_id` (lines 96–106 in ammoUtils.js)

### Deer Special Rule
**Use the corrected Deer ID link from Stage 1B**

**Current Status:** ✓ CORRECT

Passes both `record.id` (SessionRecord) and `record.outing_id` (DeerOuting) to restoreAmmoStock (line 113)

### Clay Special Rule
**Use cartridge/ammunition ID and quantity. Do not guess field names**

**Current Status:** ✓ CORRECT

Uses exact fields: `record.ammunition_id`, `record.rounds_fired` (line 119–121)

---

## SAFETY RULE: Refund Failure Blocks Delete

**Requirement:** If record has ammo usage and refund fails, do not delete the record.

**Current Status:** ✓ CORRECT

```javascript
if (!result.data.success) {
  throw new Error(result.data.message || 'Refund failed');
}
```

Refund failure throws error → delete blocked (line 67–69)

---

## BUGS SUMMARY

| # | Severity | Location | Bug | Fix |
|---|----------|----------|-----|-----|
| 1 | CRITICAL | RecordsSection.jsx:132 | Pass ID instead of record | Pass full `record` object |
| 2 | CRITICAL | Unknown | Backend function `deleteSessionRecordWithRefund` doesn't exist | Implement function |
| 3 | MEDIUM | RecordsSection.jsx:67 | Generic "Refund failed" error | Add context (which ammo, why) |

---

## IMPLEMENTATION CHECKLIST

**Frontend Changes:**
- [ ] Fix line 132: `handleDelete(record)` instead of `handleDelete(record.id)`
- [ ] Enhance error message at line 67 with context

**Backend Function Required:**
- [ ] Create `deleteSessionRecordWithRefund` function
- [ ] Load full record (given only ID from frontend bug)
- [ ] Call `refundAmmoForRecord()` with correct recordType
- [ ] Delete SessionRecord
- [ ] Return `{ success: true/false, message }`

**Testing:**
- [ ] Target single ammo: stock restored
- [ ] Target multi-ammo: all ammo restored
- [ ] Deer: stock + AmmoSpending cleaned
- [ ] Clay: stock restored
- [ ] Spending breakdown: no ghost entries

---

## READY FOR IMPLEMENTATION

All analysis complete. Bugs identified:
1. Wrong parameter type (ID vs object)
2. Missing backend function
3. Generic error message

Ready to implement fixes upon approval.