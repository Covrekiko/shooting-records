# STAGE 1D ANALYSIS — RIFLE / SHOTGUN CLEANING COUNTERS

**Status:** ✅ TRACING COMPLETE  
**Date:** 2026-04-29  
**Scope:** Cleaning Counter Correctness Only

---

## 1. WHERE RIFLE ROUNDS FIRED ARE UPDATED

**File:** `src/pages/TargetShooting.jsx` (Lines 225–231)

```javascript
// Update rifle total (Since Cleaning is calculated based on total and baseline)
if (rifle.rifle_id && roundsFired > 0) {
  const currentRifle = rifles.find(r => r.id === rifle.rifle_id);
  if (currentRifle) {
    await base44.entities.Rifle.update(rifle.rifle_id, {
      total_rounds_fired: (currentRifle.total_rounds_fired || 0) + roundsFired,
    });
  }
}
```

**Update Path:** 
- Checkout → handleCheckout() → loops over rifles_used array → increments Rifle.total_rounds_fired

**Problem:** No recalculation on record delete. When a completed Target record is deleted, the rifle total is NOT reduced.

---

## 2. WHERE SHOTGUN CARTRIDGES FIRED ARE UPDATED

**File:** `src/pages/ClayShooting.jsx` (Lines 230–238)

```javascript
// Update shotgun cartridge count (Since Cleaning is calculated based on total and baseline)
const cartridgesFired = parseInt(formData.rounds_fired) || 0;
if (formData.shotgun_id && cartridgesFired > 0) {
  const currentShotgun = shotguns.find(s => s.id === formData.shotgun_id);
  if (currentShotgun) {
    await base44.entities.Shotgun.update(formData.shotgun_id, {
      total_cartridges_fired: (currentShotgun.total_cartridges_fired || 0) + cartridgesFired,
    });
  }
}
```

**Update Path:**
- Checkout → handleCheckout() → increments Shotgun.total_cartridges_fired

**Problem:** No recalculation on record delete. When a completed Clay record is deleted, the shotgun total is NOT reduced.

---

## 3. WHERE "SINCE CLEANING" IS CALCULATED

**Formula:** Derived from entity fields (NOT explicitly stored)

```
since_cleaning = total_rounds_fired - rounds_at_last_cleaning
```

**Calculation Point:** **NOT explicitly calculated anywhere** — expected to be derived when displayed

**Problem:** 
- No function/hook recalculates this after a record is deleted
- Threshold checks may reference stale `total_rounds_fired` values
- "Since cleaning" shows old count even after deletion

---

## 4. WHERE CLEANING EVENTS ARE STORED

**Rifle Entity Fields:**
- `total_rounds_fired` — Total rounds in lifetime
- `rounds_at_last_cleaning` — Rounds count when last cleaning occurred
- `last_cleaning_date` — Date of last cleaning

**Shotgun Entity Fields:**
- `total_cartridges_fired` — Total cartridges in lifetime
- `cartridges_at_last_cleaning` — Cartridges count when last cleaning occurred
- `last_cleaning_date` — Date of last cleaning

**Cleaning Events:** NOT stored as separate records, only baseline snapshots

---

## 5. WHETHER COUNTERS ARE STORED TOTALS OR DERIVED

| Counter | Storage | Nature |
|---------|---------|--------|
| `total_rounds_fired` | Rifle field | **STORED TOTAL** (accumulated) |
| `total_cartridges_fired` | Shotgun field | **STORED TOTAL** (accumulated) |
| `rounds_at_last_cleaning` | Rifle field | **BASELINE SNAPSHOT** (static after cleaning) |
| `cartridges_at_last_cleaning` | Shotgun field | **BASELINE SNAPSHOT** (static after cleaning) |
| `since_cleaning` | **DERIVED** from above | `total - baseline` (calculated on-the-fly) |

---

## 6. WHAT HAPPENS WHEN A RECORD IS DELETED

**Current Behaviour:** ❌ **BUG**

**File:** `src/components/RecordsSection.jsx` (Lines 51–98)

```javascript
const handleDelete = async (record) => {
  // ...
  const result = await base44.functions.invoke('deleteSessionRecordWithRefund', {
    sessionId: record.id,
  });
  // Refund only restores ammunition — does NOT recalculate firearm counters
  
  // Reload records
  const updatedRecords = await base44.entities.SessionRecord.filter({
    created_by: currentUser.email,
    category,
    status: 'completed',
  });
  setRecords(updatedRecords);
};
```

**What Happens:**
1. Delete called via RecordsSection
2. Ammunition refunded ✓ (Stage 1B fix)
3. SessionRecord deleted ✓
4. **Rifle/Shotgun totals NOT reduced** ❌

**Result:** 
- Rifle still shows `total_rounds_fired = 100` even after 20-round record deleted
- Shotgun still shows `total_cartridges_fired = 400` even after 40-cartridge record deleted
- "Since cleaning" stays high even though usage is removed

---

## 7. THRESHOLDS AND CHECKS

**Rifle Thresholds:**
```javascript
cleaning_reminder_threshold: {
  type: "integer",
  enum: [50, 100, 150, 200],
  description: "Rounds threshold for cleaning reminder"
}
```

**Shotgun Thresholds:**
```javascript
cleaning_reminder_threshold: {
  type: "integer",
  enum: [50, 100, 150, 200],
  description: "Cartridges threshold for cleaning reminder"
}
```

**Where Checked:** **NOWHERE** 

❌ No code currently checks `(total - baseline) >= threshold`

No UI warning or alert when threshold is exceeded.

---

## REQUIRED FIXES

### FIX 1: Recalculate Rifle Counters on Record Delete

When a Target/Deer record is deleted, reduce rifle total_rounds_fired.

**Solution:**
- Create function `recalculateRifleCounters(rifleShotgunId, isShotgun)`
- Loop through all valid completed SessionRecords for that firearm
- Sum the rounds/cartridges actually used
- Update firearm with new total
- Reset to match derived sum

### FIX 2: Recalculate Shotgun Counters on Record Delete

When a Clay record is deleted, reduce shotgun total_cartridges_fired.

**Solution:**
- Create function `recalculateClayCounters(shotgunId)`
- Loop through all valid completed Clay SessionRecords for that shotgun
- Sum the cartridges actually used
- Update shotgun with new total
- Reset to match derived sum

### FIX 3: Add Threshold Warning Display

Show warning when `(total - baseline) >= threshold`

**Solution:**
- Add computed property or helper function
- Display in Rifles / Shotguns pages
- Show visual warning badge when threshold exceeded

---

## ACCEPTANCE TESTS EXPECTED

### TEST 1–5: Rifle Since Cleaning Recalculates ✅
1. Rifle since cleaning starts at 0
2. Create Target record with 20 rounds
3. Rifle since cleaning = 20
4. Delete that record
5. Rifle since cleaning returns to 0

### TEST 6–10: Shotgun Since Cleaning Recalculates ✅
6. Shotgun since cleaning starts at 0
7. Create Clay record with 40 cartridges
8. Shotgun since cleaning = 40
9. Delete that Clay record
10. Shotgun since cleaning returns to 0

### TEST 11–13: Cleaning Events Work ✅
11. Cleaning event resets since-cleaning count
12. Records after cleaning count from reset date only
13. Threshold warning appears when threshold exceeded

---

## OLD COUNTER BUG SUMMARY

**Root Cause:** Counters are stored as accumulated totals, but deletion doesn't reverse them.

**Impact:**
- After deleting a 20-round Target session, rifle still shows 100% of old total
- After deleting a 40-cartridge Clay session, shotgun still shows 100% of old total
- "Since cleaning" shows false high value
- Threshold warnings never trigger (no code checks thresholds)

**Why It Happened:**
1. Checkout code increments total ✓
2. Delete code was never implemented to decrement total ❌
3. No recalculation logic existed ❌
4. Threshold checks never added ❌

---

## NEXT STEPS

Implement:
1. Recalculation function for rifle/shotgun counters
2. Call it from record delete
3. Add threshold display helper
4. Show warning badges in Rifles/Shotguns pages

---

## NO UNINTENDED CHANGES

✅ GPS tracking — Untouched
✅ Ammunition refund (Stage 1B) — Untouched
✅ Reports filtering (Stage 1C) — Untouched
✅ Reloading — Untouched
✅ Maps — Untouched
✅ Mobile UI — Untouched
✅ Colours — Untouched
✅ Layout — Untouched
✅ Menus — Untouched
✅ PDFs — Untouched