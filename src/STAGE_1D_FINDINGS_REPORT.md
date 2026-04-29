# STAGE 1D FINDINGS REPORT — RIFLE/SHOTGUN CLEANING COUNTERS

**Status:** ANALYSIS COMPLETE — READY FOR IMPLEMENTATION  
**Date:** 2026-04-29

---

## EXECUTIVE SUMMARY

Found exact cleaning counter bugs:
1. **Rifle counters do NOT decrement when records are deleted** — total_rounds_fired stays high
2. **Shotgun counters do NOT decrement when records are deleted** — total_cartridges_fired stays high
3. **No threshold checking exists** — warnings never trigger
4. **No "since cleaning" recalculation** — shows stale values after deletion

---

## BUG LOCATIONS AND ROOT CAUSES

### BUG #1: Rifle Rounds Not Decremented on Delete

**Where Updated (Correctly):**
- `src/pages/TargetShooting.jsx:225-231` — On checkout, increments `Rifle.total_rounds_fired`

**Where Should Be Recalculated (Missing):**
- `src/components/RecordsSection.jsx:51-98` — On delete, NO recalculation happens
- No backend function reduces the rifle total
- No refetch of rifle data

**Impact:**
- Delete Target record that used 20 rounds
- Rifle.total_rounds_fired was 100 → now should be 80
- **BUG:** Still shows 100
- "Since cleaning" (100 - baseline) still shows wrong value

---

### BUG #2: Shotgun Cartridges Not Decremented on Delete

**Where Updated (Correctly):**
- `src/pages/ClayShooting.jsx:230-238` — On checkout, increments `Shotgun.total_cartridges_fired`

**Where Should Be Recalculated (Missing):**
- `src/components/RecordsSection.jsx:51-98` — On delete, NO recalculation happens
- No backend function reduces the shotgun total
- No refetch of shotgun data

**Impact:**
- Delete Clay record that used 40 cartridges
- Shotgun.total_cartridges_fired was 400 → now should be 360
- **BUG:** Still shows 400
- "Since cleaning" (400 - baseline) still shows wrong value

---

### BUG #3: No Threshold Warning System

**Where Thresholds Exist:**
- `Rifle.cleaning_reminder_threshold` — enum [50, 100, 150, 200]
- `Shotgun.cleaning_reminder_threshold` — enum [50, 100, 150, 200]

**Where They Should Be Checked (Missing):**
- NO code in Rifles.jsx checks threshold
- NO code in Shotguns.jsx checks threshold
- NO formula: `since_cleaning >= threshold` exists
- NO warning badge/alert displayed

**Impact:**
- Rifle due for cleaning at 100 rounds since cleaning
- Shoots 120 rounds
- **BUG:** No warning shown, no UI indicates danger
- User doesn't know firearm needs cleaning

---

## CURRENT DATA FLOW

### On Checkout (WORKS ✓)
```
TargetShooting.handleCheckout()
  → Rifle.update({ total_rounds_fired: old + 20 })
  
ClayShooting.handleCheckout()
  → Shotgun.update({ total_cartridges_fired: old + 40 })
```

### On Delete (BROKEN ❌)
```
RecordsSection.handleDelete()
  → deleteSessionRecordWithRefund()  [refunds ammo only]
  → SessionRecord deleted from DB
  → Rifle.total_rounds_fired → UNCHANGED (should decrement!)
  → Shotgun.total_cartridges_fired → UNCHANGED (should decrement!)
```

---

## EXACT PROBLEM EXAMPLE

### Before Fix
```
Rifle: total_rounds_fired = 120, baseline = 0
since_cleaning = 120 - 0 = 120
threshold = 100
status = ⚠️ NEEDS CLEANING (but no UI shows this!)

Delete a 20-round Target session...

Rifle: total_rounds_fired = 120 (SHOULD BE 100!)
since_cleaning = 120 - 0 = 120 (SHOULD BE 100!)
status = ⚠️ STILL SHOWS HIGH (wrong!)
```

### After Fix
```
Rifle: total_rounds_fired = 120, baseline = 0
since_cleaning = 120 - 0 = 120
threshold = 100
status = ⚠️ Shows threshold warning properly

Delete a 20-round Target session...

Rifle: total_rounds_fired = 100 (CORRECT!)
since_cleaning = 100 - 0 = 100 (CORRECT!)
status = ✅ At threshold (warning badge shows correctly)
```

---

## DATA FIELDS INVOLVED

### Rifle Entity
| Field | Type | Purpose | Current State |
|-------|------|---------|---------------|
| `total_rounds_fired` | int | Lifetime total | Incremented on checkout ✓ |
| `rounds_at_last_cleaning` | int | Baseline after cleaning | Never updated after checkout |
| `last_cleaning_date` | date | When last cleaned | Static value |
| `cleaning_reminder_threshold` | enum | Warning threshold | Defined but never checked ❌ |

### Shotgun Entity
| Field | Type | Purpose | Current State |
|-------|------|---------|---------------|
| `total_cartridges_fired` | int | Lifetime total | Incremented on checkout ✓ |
| `cartridges_at_last_cleaning` | int | Baseline after cleaning | Never updated after checkout |
| `last_cleaning_date` | date | When last cleaned | Static value |
| `cleaning_reminder_threshold` | enum | Warning threshold | Defined but never checked ❌ |

---

## SOLUTION STRUCTURE

### Missing Function 1: Recalculate Rifle Counters
```
Function: recalculateRifleCountersAfterDelete(rifleShotgunId)
  1. Query all completed Target/Deer SessionRecords using this rifle
  2. Sum rifles_used[].rounds_fired for this rifle_id
  3. Update Rifle.total_rounds_fired = sum
  4. Return new total
```

### Missing Function 2: Recalculate Shotgun Counters
```
Function: recalculateShotgunCountersAfterDelete(shotgunId)
  1. Query all completed Clay SessionRecords using this shotgun
  2. Sum their rounds_fired
  3. Update Shotgun.total_cartridges_fired = sum
  4. Return new total
```

### Missing Hook 3: Calculate Since Cleaning
```
Function: calculateSinceCleaning(firearm)
  since_cleaning = (firearm.total_rounds_fired || 0) - (firearm.rounds_at_last_cleaning || 0)
  return since_cleaning
```

### Missing Display 4: Threshold Warning Badge
```
Component helper: showThresholdWarning(firearm, isShotgun)
  since = calculateSinceCleaning(firearm)
  threshold = firearm.cleaning_reminder_threshold
  if (since >= threshold) {
    return <Badge color="red">CLEANING DUE ({since} rounds)</Badge>
  }
```

---

## REQUIRED CODE CHANGES

### File 1: `src/components/RecordsSection.jsx`
**Change:** In handleDelete(), call recalculation functions after deletion

```javascript
// After deleteSessionRecordWithRefund succeeds
if (category === 'target_shooting') {
  // Recalculate rifle counters for all rifles in this record
  for (const rifle of record.rifles_used) {
    if (rifle.rifle_id) {
      await recalculateRifleCounters(rifle.rifle_id);
    }
  }
} else if (category === 'clay_shooting') {
  // Recalculate shotgun counters
  if (record.shotgun_id) {
    await recalculateShotgunCounters(record.shotgun_id);
  }
}
```

### File 2: `src/pages/settings/Rifles.jsx`
**Change:** Display threshold warning badge

```javascript
// In the rifle card display
<div>
  <p className="text-sm">{rifle.total_rounds_fired || 0} total rounds</p>
  {showRifleThresholdWarning(rifle) && (
    <Badge className="bg-destructive mt-2">
      Cleaning due: {calculateSinceCleaning(rifle)} rounds
    </Badge>
  )}
</div>
```

### File 3: `src/pages/settings/Shotguns.jsx`
**Change:** Display threshold warning badge

```javascript
// In the shotgun card display
<div>
  <p className="text-sm">{shotgun.total_cartridges_fired || 0} total cartridges</p>
  {showShotgunThresholdWarning(shotgun) && (
    <Badge className="bg-destructive mt-2">
      Cleaning due: {calculateSinceCleaning(shotgun)} cartridges
    </Badge>
  )}
</div>
```

### File 4: `src/lib/firearmCounters.js` (NEW)
**Purpose:** Helper functions for counter recalculation and threshold checks

```javascript
export async function recalculateRifleCounters(rifleShotgunId) {
  const user = await base44.auth.me();
  const records = await base44.entities.SessionRecord.filter({
    created_by: user.email,
    status: 'completed'
  });
  
  let total = 0;
  records.forEach(r => {
    if (r.rifles_used) {
      r.rifles_used.forEach(rifle => {
        if (rifle.rifle_id === rifleShotgunId) {
          total += parseInt(rifle.rounds_fired) || 0;
        }
      });
    }
  });
  
  await base44.entities.Rifle.update(rifleShotgunId, {
    total_rounds_fired: total
  });
  return total;
}

export async function recalculateShotgunCounters(shotgunId) {
  const user = await base44.auth.me();
  const records = await base44.entities.SessionRecord.filter({
    created_by: user.email,
    status: 'completed',
    category: 'clay_shooting'
  });
  
  let total = 0;
  records.forEach(r => {
    if (r.shotgun_id === shotgunId) {
      total += parseInt(r.rounds_fired) || 0;
    }
  });
  
  await base44.entities.Shotgun.update(shotgunId, {
    total_cartridges_fired: total
  });
  return total;
}

export function calculateSinceCleaning(firearm, isShotgun = false) {
  const field = isShotgun ? 'total_cartridges_fired' : 'total_rounds_fired';
  const baselineField = isShotgun ? 'cartridges_at_last_cleaning' : 'rounds_at_last_cleaning';
  
  const total = firearm[field] || 0;
  const baseline = firearm[baselineField] || 0;
  return total - baseline;
}

export function showThresholdWarning(firearm, isShotgun = false) {
  const since = calculateSinceCleaning(firearm, isShotgun);
  const threshold = firearm.cleaning_reminder_threshold || 100;
  return since >= threshold;
}
```

---

## SUMMARY TABLE

| Issue | Current | After Fix | Impact |
|-------|---------|-----------|--------|
| **Rifle delete** | Total not reduced | Recalculated ✓ | Since cleaning accurate |
| **Shotgun delete** | Total not reduced | Recalculated ✓ | Since cleaning accurate |
| **Threshold check** | Never checked | Always checked ✓ | Warnings appear |
| **UI warning** | No badge | Badge shown ✓ | User aware of cleaning need |

---

## NO SCOPE CREEP

❌ Not changing:
- GPS tracking (Stage 1A)
- Ammunition refund (Stage 1B)
- Reports filtering (Stage 1C)
- Reloading system
- Maps/stalking
- Mobile UI layout
- Colours/design
- Any other logic

✅ Only fixing:
- Rifle counter recalculation on delete
- Shotgun counter recalculation on delete
- Threshold warning display
- "Since cleaning" accuracy

---

## TEST STRATEGY

### Test 1–5: Rifle Counter Accuracy
1. Load rifle with total_rounds_fired = 0
2. Create Target session, fire 20 rounds
3. Rifle.total_rounds_fired = 20 ✓
4. Delete that session
5. Rifle.total_rounds_fired = 0 ✓

### Test 6–10: Shotgun Counter Accuracy
6. Load shotgun with total_cartridges_fired = 0
7. Create Clay session, fire 40 cartridges
8. Shotgun.total_cartridges_fired = 40 ✓
9. Delete that session
10. Shotgun.total_cartridges_fired = 0 ✓

### Test 11–13: Threshold & Cleaning
11. Set rifle threshold = 100
12. Fire 105 rounds (since cleaning = 105)
13. Badge shows "CLEANING DUE: 105 rounds" ✓

---

## READY FOR IMPLEMENTATION

All analysis complete. Ready to:
1. Create `/src/lib/firearmCounters.js` helper
2. Update `RecordsSection.jsx` to call recalculation
3. Update `Rifles.jsx` to display threshold warning
4. Update `Shotguns.jsx` to display threshold warning