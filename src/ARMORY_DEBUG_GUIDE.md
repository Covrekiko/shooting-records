# ARMORY COUNTER REVERSAL — DEBUG GUIDE

## Changes Made

**File Updated:** `src/pages/Records.jsx` (handleDelete function, STEP 6)

### What Changed

1. **Added Field Logging** — After loading freshRecord, logs ALL relevant fields:
   - `rifles_used`, `rifle_id`, `firearm_id`, `weapon_id`
   - `shotgun_id`, `rounds_fired`, `total_count`, `shots_fired`
   - `armoryCountersReversed`, `countersReversedAt`

2. **Added Fallbacks for Target Shooting:**
   - If `rifles_used` is missing/empty, falls back to top-level `rifle_id` + `rounds_fired`
   - Normalizes all rifles into a single array for consistent processing

3. **Added Normalization for Clay Shooting:**
   - Checks `shotgun_id`, `firearm_id`, `weapon_id`, `gun_id` (in order)
   - Checks `rounds_fired`, `cartridges_fired`, `total_shots`, `cartridges_used`
   - Logs warnings if either shotgunId or cartridges is missing

4. **Added Normalization for Deer Management:**
   - Checks `rifle_id`, `firearm_id`, `weapon_id`, `gun_id`
   - Checks `rounds_fired`, `total_count`, `shots_fired`, `shots`
   - Logs warnings if either rifleId or shots is missing

5. **Added Post-Update Verification:**
   - After `Rifle.update()` or `Shotgun.update()`, immediately fetches the entity again
   - Logs the value to confirm update succeeded
   - Reports mismatch if expected value ≠ actual value in DB

6. **Added Flag Warning:**
   - If `armoryCountersReversed === true`, logs a warning explaining the skip
   - Instructs user to clear the flag or use a new test record

---

## How to Test

### Prerequisites
- Open **browser Developer Tools** (F12)
- Go to **Console** tab
- Keep console open while testing delete operations

### Test 1 — Target Shooting (New Record)

1. **Navigate to Target Shooting**
2. **Create a NEW record:**
   - Select a rifle (note the name, e.g., "Brabus")
   - Fire 2 rounds
   - Complete checkout
3. **Check Armory page** — rifle total should increase by 2
4. **Go to Records**
5. **Delete the record** and watch the console
6. **Look for these logs:**

   ```
   [ARMORY FIELD DEBUG] rifles_used = [Array with entries]
   [ARMORY FIELD DEBUG] armoryCountersReversed = false (or undefined)
   
   [ARMORY DEBUG] firearmId = <rifle-id>
   [ARMORY DEBUG] firearm loaded from DB = true
   [ARMORY DEBUG] roundsToSubtract = 2
   [ARMORY DEBUG] totalBefore = <previous-total>
   [ARMORY DEBUG] totalAfter = <previous-total - 2>
   [ARMORY VERIFY] rifle after update = <expected-total>
   ```

7. **Refresh Armory page** — rifle total should decrease by 2

### Test 2 — Clay Shooting (New Record)

1. **Navigate to Clay Shooting**
2. **Create a NEW record:**
   - Select a shotgun
   - Fire 25 cartridges
   - Complete checkout
3. **Check Armory page** — shotgun total should increase by 25
4. **Go to Records**
5. **Delete the record** and watch the console
6. **Look for these logs:**

   ```
   [ARMORY FIELD DEBUG] shotgun_id = <shotgun-id>
   [ARMORY FIELD DEBUG] rounds_fired = 25
   [ARMORY FIELD DEBUG] armoryCountersReversed = false
   
   [ARMORY DEBUG] firearmId = <shotgun-id>
   [ARMORY DEBUG] firearm loaded from DB = true
   [ARMORY DEBUG] roundsToSubtract = 25
   [ARMORY DEBUG] totalBefore = <previous-total>
   [ARMORY DEBUG] totalAfter = <previous-total - 25>
   [ARMORY VERIFY] shotgun after update = <expected-total>
   ```

7. **Refresh Armory page** — shotgun total should decrease by 25

### Test 3 — Deer Management (New Record)

1. **Navigate to Deer Management**
2. **Create a NEW record:**
   - Select a location
   - Select a rifle
   - Specify 1 shot
   - Complete checkout
3. **Check Armory page** — rifle total should increase by 1
4. **Go to Records**
5. **Delete the record** and watch the console
6. **Look for these logs:**

   ```
   [ARMORY FIELD DEBUG] rifle_id = <rifle-id>
   [ARMORY FIELD DEBUG] total_count = 1 (or rounds_fired = 1)
   [ARMORY FIELD DEBUG] armoryCountersReversed = false
   
   [ARMORY DEBUG] firearmId = <rifle-id>
   [ARMORY DEBUG] firearm loaded from DB = true
   [ARMORY DEBUG] roundsToSubtract = 1
   [ARMORY DEBUG] totalBefore = <previous-total>
   [ARMORY DEBUG] totalAfter = <previous-total - 1>
   [ARMORY VERIFY] rifle after update = <expected-total>
   ```

7. **Refresh Armory page** — rifle total should decrease by 1

---

## Troubleshooting

### Problem: Console shows `[ARMORY FIELD DEBUG] rifles_used = undefined`

**Cause:** Record doesn't have `rifles_used` array.  
**Fix:** The code now has a fallback. Check for:
```
[ARMORY FIELD DEBUG] rifle_id = <some-id>
```
If `rifle_id` is also undefined, the record wasn't saved correctly.

### Problem: Console shows `[ARMORY DEBUG] Clay cannot reverse: shotgunId missing`

**Cause:** Record doesn't have shotgun_id or any firearm ID field.  
**Fix:** Record is malformed. Delete it manually or re-create a new one.

### Problem: Console shows `armoryCountersReversed = true`

**Cause:** Record was deleted before but flag was set without actually reversing counters.  
**Fix:** The code now skips reversal for records with this flag. Either:
- Use a brand-new test record, OR
- Clear the `armoryCountersReversed` and `countersReversedAt` fields on the record in the database

### Problem: `[ARMORY VERIFY] mismatch: expected X got Y`

**Cause:** Database update failed or entity reference is wrong.  
**Fix:** Check the update call — verify field names are correct:
- `Rifle.total_rounds_fired` (not `totalRoundsFired`)
- `Shotgun.total_cartridges_fired` (not `totalCartridges`)

### Problem: Console shows success logs but Armory page still shows old value

**Cause:** Armory page is using stale cached data.  
**Fix:** Navigate away and back to Armory, or refresh the page entirely.

---

## Console Logs Explained

| Log | Meaning |
|-----|---------|
| `[ARMORY FIELD DEBUG] ...` | Logging the actual record structure before any operations |
| `[ARMORY DEBUG] starting armory counter reversal` | Reversal is about to start |
| `[ARMORY DEBUG] firearmId = <id>` | Found a firearm to update |
| `[ARMORY DEBUG] firearm loaded from DB = true` | Successfully fetched firearm from Base44 |
| `[ARMORY DEBUG] totalBefore = X` | Current value in database before subtraction |
| `[ARMORY DEBUG] totalAfter = Y` | Calculated new value after subtraction |
| `[ARMORY VERIFY] rifle/shotgun after update = Z` | Confirmation that database was updated |
| `[ARMORY VERIFY] mismatch: expected X got Y` | Update failed — values don't match |
| `[ARMORY DEBUG] update success = true` | Update completed without error |

---

## Expected Flow

### ✅ Success Path
1. Delete button clicked
2. Load fresh SessionRecord
3. Log all fields (debug what exists)
4. Find firearm IDs and rounds
5. Fetch Rifle/Shotgun from Base44
6. Calculate new totals
7. Update entity
8. Verify update succeeded
9. Soft-delete the record
10. Refresh Records page

### ❌ Failure Paths
- **Field missing:** Log warning, skip that type, continue
- **Firearm not found:** Alert user, cancel delete
- **Update fails:** Alert user, cancel delete
- **Already reversed:** Log warning, skip reversal (do not re-subtract)

---

## Files Changed

- `src/pages/Records.jsx` — handleDelete function (STEP 6)

---

## Files NOT Changed

✅ Google Maps  
✅ GPS tracking  
✅ Ammunition stock logic  
✅ Reloading module  
✅ Reports/PDF  
✅ UI design/colors/layout  
✅ Menus/navigation  

---

## Next Steps

1. **Run Test 1, 2, and 3** with NEW records
2. **Check browser console** for the logs above
3. **Report findings:**
   - Which fields appear in logs (rifles_used? rifle_id? etc.)
   - Whether totals increase after checkout
   - Whether totals decrease after delete
   - Whether Armory page updates after refresh
   - Any `[ARMORY VERIFY] mismatch` errors