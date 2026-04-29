# CLAY DELETE ARMORY REVERSAL TEST

## Changes Made

**File:** `src/pages/Records.jsx` (handleDelete function, STEP 6)

### What Changed

Added comprehensive logging around Armory reversal to identify why Clay Shooting delete is not reversing shotgun counters.

**Key additions:**
1. Log before entering STEP 6
2. Enhanced Clay section with detailed field extraction logging
3. Log completion of armory reversal
4. All logs use `[ARMORY DELETE DEBUG]` prefix for Clay

---

## Acceptance Test — CLAY SHOOTING

### Prerequisites

1. **Open browser Developer Tools** (F12)
2. **Go to Console tab**
3. **Keep console open during entire test**

### Test Steps

#### Step 1: Create New Clay Record

1. Navigate to **Clay Shooting**
2. Click "Start Session"
3. **Note Shotgun:** Beretta 690
4. **Record initial total in Armory:**
   - Go to **Armory page**
   - Find "Beretta 690"
   - Note current total (e.g., 20)
5. **Return to Clay Shooting**
6. Complete checkout with:
   - **10 cartridges fired**
7. **Verify Armory increased:**
   - Go to **Armory page**
   - Beretta 690 should now be **30** (20 + 10)
8. **Look at console:**
   ```
   [CLAY ARMORY DEBUG] cartridgesFired = 10
   [CLAY ARMORY DEBUG] before = 20
   [CLAY ARMORY DEBUG] after = 30
   [CLAY ARMORY DEBUG] verify = 30
   ```
   ✅ Checkout is working correctly

---

#### Step 2: Delete the Same Record

1. Navigate to **Records page**
2. Find the Clay record you just created
3. **Click delete button**
4. **Confirm delete**
5. **Watch the console** for these logs (in order):

   ```
   [DELETE DEBUG] record from UI, recordId: <record-id>
   [DELETE DEBUG] record category: clay_shooting
   [DELETE DEBUG] loading fresh SessionRecord
   [DELETE DEBUG] fresh SessionRecord: {...}
   [DELETE DEBUG] refund start
   [DELETE DEBUG] refund result = {success: true, refunded: 0}
   ```

   ✅ Ammo refund completes (even with refunded: 0)

   ```
   [DELETE DEBUG] ===== ENTERING STEP 6: ARMORY REVERSAL =====
   [DELETE DEBUG] ammoRefunded check passed, proceeding to armory reversal
   ```

   ✅ **CRITICAL:** These logs MUST appear, or STEP 6 is never reached

   ```
   [ARMORY FIELD DEBUG] full freshRecord = {...}
   [ARMORY FIELD DEBUG] category = clay_shooting
   [ARMORY FIELD DEBUG] shotgun_id = <shotgun-id>
   [ARMORY FIELD DEBUG] rounds_fired = 10
   [ARMORY FIELD DEBUG] cartridges_fired = (undefined)
   [ARMORY FIELD DEBUG] armoryCountersReversed = false (or undefined)
   ```

   ✅ Record structure is logged

   ```
   [ARMORY DELETE DEBUG] === CLAY SHOOTING REVERSAL ===
   [ARMORY DELETE DEBUG] checking shotgun_id, firearm_id, weapon_id, gun_id
   [ARMORY DELETE DEBUG] shotgun_id = <shotgun-id>
   [ARMORY DELETE DEBUG] firearm_id = (undefined)
   [ARMORY DELETE DEBUG] weapon_id = (undefined)
   [ARMORY DELETE DEBUG] gun_id = (undefined)
   [ARMORY DELETE DEBUG] resolved shotgunId = <shotgun-id>
   
   [ARMORY DELETE DEBUG] checking rounds_fired, cartridges_fired, total_shots, cartridges_used
   [ARMORY DELETE DEBUG] rounds_fired = 10
   [ARMORY DELETE DEBUG] cartridges_fired = (undefined)
   [ARMORY DELETE DEBUG] total_shots = (undefined)
   [ARMORY DELETE DEBUG] cartridges_used = (undefined)
   [ARMORY DELETE DEBUG] resolved cartridgesToSubtract = 10
   ```

   ✅ Clay shotgun fields are extracted correctly

   ```
   [ARMORY DEBUG] firearmId = <shotgun-id>
   [ARMORY DEBUG] fetching firearm from Base44
   [ARMORY DEBUG] firearm loaded from DB = true
   [ARMORY DEBUG] roundsToSubtract = 10
   [ARMORY DEBUG] totalBefore = 30
   [ARMORY DEBUG] totalAfter = 20
   [ARMORY VERIFY] shotgun after update = 20
   [ARMORY DEBUG] update success = true
   ```

   ✅ Shotgun counter reversed from 30 → 20

   ```
   [ARMORY DEBUG] all counters reversed successfully
   [DELETE DEBUG] ===== ARMORY REVERSAL COMPLETE =====
   ```

   ✅ Reversal completed successfully

   ```
   [DELETE DEBUG] attempting SessionRecord.update (soft delete): <record-id>
   [DELETE DEBUG] soft delete (update) response = success
   ```

   ✅ Record marked as deleted

6. **Refresh Armory page**
   - Beretta 690 should be back to **20**

---

## Expected Final State

| Step | Beretta 690 Total | Source |
|------|-------------------|--------|
| Initial | 20 | Armory page |
| After checkout (+10) | 30 | Armory page + console checkout logs |
| After delete (-10) | 20 | Armory page + console reversal logs |

---

## Troubleshooting

### Problem: Console shows NO `[DELETE DEBUG] ===== ENTERING STEP 6`

**Cause:** Delete function is exiting before STEP 6.

**Check:**
```
[DELETE DEBUG] fresh load failed: ...
```

**Fix:** Check error details and ensure record loads correctly.

---

### Problem: Console shows `[ARMORY DELETE DEBUG] FAIL: shotgunId missing`

**Cause:** `shotgun_id` field is not being set on the record.

**Check:**
```
[ARMORY DELETE DEBUG] shotgun_id = undefined
```

**Fix:** Ensure Clay checkout sets `shotgun_id` (not `firearm_id`, `weapon_id`, or `gun_id`).

---

### Problem: Console shows `cartridgesToSubtract = 0` or `undefined`

**Cause:** `rounds_fired` field is not being set during checkout.

**Check:**
```
[ARMORY DELETE DEBUG] rounds_fired = undefined
```

**Fix:** Ensure Clay checkout sets `rounds_fired` (not `cartridges_fired`, `total_shots`, or `cartridges_used`).

---

### Problem: Console shows `[ARMORY VERIFY] shotgun after update = 30` (not 20)

**Cause:** Database update failed or took too long to reflect.

**Check:**
```
[ARMORY VERIFY] mismatch: expected 20 got 30
```

**Fix:** Database may be slow. Wait a moment and refresh Armory page.

---

### Problem: Armory page still shows 30 after delete

**Check:** Did you refresh the page after delete? (F5 or full refresh)

**Fix:** Armory page may be showing cached data. Full refresh required.

---

## Final Report Template

When done, provide:

1. ✅ / ❌ **Checkout working?** (Does console show `verify = 30`?)
2. ✅ / ❌ **STEP 6 reached?** (Does console show `===== ENTERING STEP 6`?)
3. ✅ / ❌ **Clay fields extracted?** (Does console show `resolved shotgunId = <id>` and `resolved cartridgesToSubtract = 10`?)
4. ✅ / ❌ **Reversal succeeded?** (Does console show `[ARMORY VERIFY] shotgun after update = 20`?)
5. ✅ / ❌ **Armory reflects delete?** (Does Armory page show Beretta 690 back to 20 after refresh?)
6. **Any errors in console?** (Copy/paste if yes)
7. **Did refund show `refunded: 0`?** (Yes/No)

---

## Log Levels

| Log Prefix | Meaning |
|-----------|---------|
| `[DELETE DEBUG]` | General delete flow |
| `[ARMORY FIELD DEBUG]` | Record field structure |
| `[ARMORY DELETE DEBUG]` | Clay-specific reversal |
| `[ARMORY DEBUG]` | Firearm counter update |
| `[ARMORY VERIFY]` | Database verification |
| `[ARMORY VERIFY] mismatch` | ⚠️ Update failed |

---

## Files Changed

- `src/pages/Records.jsx` (handleDelete function only)

---

## Files NOT Changed

✅ Google Maps  
✅ GPS tracking  
✅ Clay checkout logic  
✅ Ammunition refund logic  
✅ Reloading module  
✅ Reports/PDF  
✅ UI design/colors/layout  
✅ Menus/navigation