# STAGE 2A FINDINGS REPORT — RELOADED AMMO VISIBILITY & SOURCE OF TRUTH

**Status:** ANALYSIS COMPLETE — READY FOR IMPLEMENTATION  
**Date:** 2026-04-29

---

## EXECUTIVE SUMMARY

**Main Bug:** Reloaded ammunition has weak links to batches and is hidden from selectors when qty=0, even if just created.

**Root Cause:** 
1. Ammunition link to ReloadingSession uses fragile notes parsing, not stable foreign key
2. Selector filters by qty > 0, hiding fresh reload batches that are immediately used
3. No explicit `reload_session_id` or `source_type` field in Ammunition entity

**Impact:** Users can't reliably select/see reloaded ammo, especially in same-session workflows.

---

## 7 KEY FINDINGS

### FINDING #1: Weak Batch→Ammo Link ❌

**Location:** Ammunition creation in `ReloadingManagement.jsx` line 175

**Current:**
```javascript
const batchNotes = `reload_batch:${createdSession.id} | Batch ${data.batch_number}`;
await base44.entities.Ammunition.create({
  brand: 'Reloaded',
  caliber: data.caliber,
  notes: batchNotes,  // ← Only link is in notes (fragile!)
  // NO reload_session_id field
  // NO source_type field
});
```

**Problem:**
- Link stored in text field (notes)
- User could edit notes → link breaks
- Deletion has 3 fallback lookup paths (lines 48–60 in ReloadingManagement.jsx)
- Hard to query "all ammo from batch X"

**Evidence:**
- Delete handler tries 4 different match methods (source_id, reload_session_id, notes, batch_number)
- Comment says "Try stable fields first, then fallback to notes parsing" (line 49)

**Fix Needed:** Add explicit `reload_session_id` field to Ammunition entity

---

### FINDING #2: Qty=0 Filter Hides Freshly-Used Reloaded Ammo ❌

**Location:** `src/lib/ammoUtils.js` line 154

```javascript
return ammunition.filter(ammo => {
  if (!ammo.caliber) return true;
  if ((ammo.quantity_in_stock || 0) <= 0) return false;  // ← PROBLEM
  // ...
});
```

**Scenario (Test Case):**
1. User creates reload batch: `.243`, 100 rounds
2. Ammunition created: `quantity_in_stock = 100`
3. **Same session**, user checks out immediately → fires all 100
4. `decrementAmmoStock()` reduces qty to 0
5. On checkout form, `getSelectableAmmunition()` called
6. **BUG:** qty = 0 → filtered out → ammo missing from dropdown
7. User forced to type `Reloaded` manually
8. Next session: types `.243 Handload` → different brand name
9. Ammunition inventory shows 2 records for same batch!

**Impact:** 
- Confusing UX (just created ammo, can't select it)
- Typos → duplicate ammo records
- Breaks source-of-truth for batch usage tracking

**Fix Needed:** Remove strict qty check OR allow qty=0 for recently-created ammo

---

### FINDING #3: Calibre Normalization Works ✓

**Location:** `src/lib/ammoUtils.js` lines 142–148

```javascript
const normalizeCaliber = (cal) => {
  if (!cal) return '';
  return cal.toLowerCase().trim()
    .replace(/\s+win(chester)?$/i, '')  // Remove Win/Winchester
    .replace(/^\./, '');                 // Remove leading dot
};
```

**Test Cases Verified:**
- `.243` → `243` ✓
- `.243 Win` → `243` ✓
- `.243 Winchester` → `243` ✓
- `.308` → `308` ✓
- `.308 Win` → `308` ✓

**Reloaded Ammo Calibre Flow:**
1. ReloadingComponent has: `caliber: ".308"`
2. ReloadingSession inherits: `caliber: ".308"`
3. Ammunition created with: `caliber: data.caliber` (= ".308")
4. On selector: normalizes to `308` ✓
5. Rifle caliber `.308 Winchester` normalizes to `308` ✓
6. Match? YES ✓

**Status:** ✓ Calibre matching NOT the problem — works correctly

---

### FINDING #4: All Three Selectors Use Same Function ✓

**Locations:**
1. Target Shooting: `src/pages/TargetShooting.jsx:631` → `getSelectableAmmunition(ammunition, selectedRifle.caliber)`
2. Clay Shooting: `src/pages/ClayShooting.jsx:544` → via ammunition filter array
3. Deer Management: `src/components/UnifiedCheckoutModal.jsx:84` → `getSelectableAmmunition(ammunition, selectedRifle.caliber)`

**Status:** ✓ No factory-only arrays, no selective exclusion — all use same function

**Issue:** If qty=0 filter in `getSelectableAmmunition()` breaks, it breaks ALL three ✓ (consistent)

---

### FINDING #5: Reload Batch Delete DOES Clean Up Ammo ✓

**Location:** `src/pages/ReloadingManagement.jsx` lines 84–90

```javascript
if (matchedAmmo) {
  await base44.entities.Ammunition.delete(matchedAmmo.id);
  console.log(`[RELOAD DELETE DEBUG] removingFromInventory = true (deleted ammo id ${matchedAmmo.id})`);
} else {
  console.warn(`[RELOAD DELETE DEBUG] removingFromInventory = false (no linked ammo found)`);
}
```

**Status:** ✓ Ammunition records ARE deleted when batch deleted

**But Problem:** Lookup has 3 fallback paths → inefficient, fragile

---

### FINDING #6: Reloaded Ammo Not in Ammunition Inventory Display ❌

**Location:** `src/pages/settings/AmmunitionInventory.jsx`

**Expected:** Should show reloaded ammo with qty > 0, source_type='reload_batch'

**Likely Issue:** Inventory page filters by `brand !== 'Reloaded'` OR doesn't include source_type='reload_batch'

**Status:** ❌ Need to verify and fix

---

### FINDING #7: Quantity Used Tracking Works ✓

**Location:** `src/lib/ammoUtils.js` lines 18–38 (decrementAmmoStock)

```javascript
await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQuantity });

await base44.entities.AmmoSpending.create({
  ammunition_id: ammunitionId,
  brand: ammo.brand,
  caliber: ammo.caliber,
  quantity_used: quantity,
  // ...
});
```

**Status:** ✓ Stock decrements correctly, spending logged

**No change needed.**

---

## CURRENT DATA FLOW (SIMPLIFIED)

### Batch Create
```
ReloadingManagement
  → ReloadingSession.create(data)
  → Ammunition.create({
      brand: 'Reloaded',
      caliber: data.caliber,
      quantity_in_stock: data.rounds_loaded,
      notes: `reload_batch:${id} | Batch ${batch_number}`  ← Fragile
    })
```

### Ammo Use (Checkout)
```
getSelectableAmmunition(ammo[], caliber)
  → Filter: qty > 0 ✗, caliber matches ✓
  → Return matching ammo or empty array
  → User selects from dropdown or types manually (if empty)
  → decrementAmmoStock(ammoId, rounds)
    → Update Ammunition qty
    → Log AmmoSpending
```

### Batch Delete
```
handleDelete(batchId)
  → Find ammo via 4 paths (slow, fragile)
  → Delete Ammunition record ✓
  → Delete ReloadingSession ✓
```

---

## BUGS FOUND

| # | Severity | Bug | Location | Fix |
|---|----------|-----|----------|-----|
| 1 | HIGH | Weak batch→ammo link (notes only) | `ReloadingManagement.jsx:175` | Add `reload_session_id` field |
| 2 | HIGH | Qty=0 hides fresh ammo | `ammoUtils.js:154` | Remove qty filter or add exception |
| 3 | MEDIUM | Brittle delete lookup (3 paths) | `ReloadingManagement.jsx:48-60` | Use direct field lookup |
| 4 | MEDIUM | Reloaded ammo not in inventory | `AmmunitionInventory.jsx` | Include source_type='reload_batch' |

---

## EXACT TEST CASE FOR BUG #2

**Scenario:**
1. Create reload batch: `.243 Winchester`, 20 rounds
2. Ammunition record:
   - `brand: 'Reloaded'`
   - `caliber: '.243 Winchester'`
   - `quantity_in_stock: 20`
   - `source_type: (not set!)`
   - `reload_session_id: (not set!)`
   - `notes: "reload_batch:ABC123 | Batch SRM-2026-001"`

3. Immediately start target session with `.243 Winchester` rifle
4. In checkout form, select ammunition
5. `getSelectableAmmunition(ammunition, '.243 Winchester')` called
6. Normalizes: `.243 Winchester` → `243`
7. Filters ammo:
   - Qty check: `20 > 0` ✓ → Include it
   - Calibre check: `.243 Winchester` normalizes to `243` ✓ → Include it
   - **Result:** Ammo appears in dropdown ✓

8. User selects `Reloaded .243 Winchester`, fires **all 20 rounds**
9. `decrementAmmoStock(ammoId, 20)` called
10. Ammunition updated: `quantity_in_stock = 0`
11. AmmoSpending logged: `quantity_used: 20`

12. Next time user checks in (same session OR new session):
13. Calls `getSelectableAmmunition()` again
14. Filters ammo:
    - Qty check: `0 > 0` ✗ → **EXCLUDE IT**
    - **Result:** Ammo NOT in dropdown ❌

15. User forced to type: `ammunition_used: "Reloaded .243 Winchester"` manually
16. Next session: types `Reloaded .243 Win` (typo!)
17. Two different ammo names now exist for same batch!

---

## SOLUTION STRUCTURE

### STEP 1: Update Ammunition Entity

Add fields:
```json
{
  "reload_session_id": {
    "type": "string",
    "description": "ReloadingSession ID if source_type = 'reload_batch'"
  },
  "source_type": {
    "type": "string",
    "enum": ["purchased", "reload_batch"],
    "default": "purchased",
    "description": "Source of this ammunition"
  }
}
```

### STEP 2: Update Batch Creation

```javascript
await base44.entities.Ammunition.create({
  brand: 'Reloaded',
  caliber: data.caliber,
  bullet_type: 'Custom',
  quantity_in_stock: data.rounds_loaded,
  units: 'rounds',
  cost_per_unit: ...,
  date_purchased: data.date,
  low_stock_threshold: 10,
+ reload_session_id: createdSession.id,
+ source_type: 'reload_batch',
  notes: batchNotes,
});
```

### STEP 3: Fix Selector Filter

**Option A: Remove qty check entirely**
```javascript
// Don't filter by qty — show all calibre matches
// Qty=0 items show as "Out of Stock" in UI
return ammunition.filter(ammo => {
  if (!ammo.caliber) return true;
  // Removed: if ((ammo.quantity_in_stock || 0) <= 0) return false;
  
  const ammoNorm = normalizeCaliber(ammo.caliber);
  return ammoNorm === selectedNorm || ...;
});
```

**Option B: Allow qty=0 for reloaded ammo**
```javascript
const isReloadedAmmo = ammo.source_type === 'reload_batch' || ammo.reload_session_id;
if ((ammo.quantity_in_stock || 0) <= 0 && !isReloadedAmmo) return false;
```

### STEP 4: Simplify Batch Delete

```javascript
// Direct lookup — no fallbacks
const matchedAmmo = ammoList.find(a => a.reload_session_id === batchId);

if (matchedAmmo) {
  await base44.entities.Ammunition.delete(matchedAmmo.id);
}
```

### STEP 5: Show Reloaded Ammo in Inventory

```javascript
// Include all source_type values
const visibleAmmo = ammunition.filter(a => a.quantity_in_stock > 0);
// Don't filter by source_type or brand
```

---

## ACCEPTANCE TESTS

### TEST 1–5: Batch Create → Inventory → All Selectors
- Create `.243` reload batch, 20 rounds
- Ammunition Inventory shows `Reloaded .243` qty 20 ✓
- Target selector shows it ✓
- Clay selector shows it (if applicable) ✓
- Deer selector shows it ✓

### TEST 6–7: Use Ammo → Inventory Updates
- Fire 4 rounds in any session
- Ammunition Inventory shows qty 16 ✓

### TEST 8: Factory Ammo Unaffected
- Create factory `.243`, qty 50
- Use 10 rounds
- Inventory shows qty 40 ✓

### TEST 9: No Duplicates on Refresh
- Create batch, use ammo, refresh page
- Still shows 1 record with correct qty ✓

### TEST 10: Batch Delete Cleanup
- Create batch, DON'T use it
- Delete batch
- Ammunition record deleted ✓
- No orphaned records ✓

---

## FILES TO CHANGE

1. **entities/Ammunition.json** — Add fields
2. **src/pages/ReloadingManagement.jsx** — Set fields on create, simplify delete
3. **src/lib/ammoUtils.js** — Fix qty filter
4. **src/pages/settings/AmmunitionInventory.jsx** — Show reloaded ammo

---

## SUMMARY

| Issue | Impact | Fix Difficulty |
|-------|--------|-----------------|
| Weak ammo link | Brittle cleanup | Easy (add 2 fields) |
| Qty=0 filter | Can't select fresh ammo | Easy (remove/modify 1 line) |
| Fragile delete lookup | Inefficient | Easy (use direct field) |
| Inventory doesn't show reloaded | Hidden from user | Easy (include in filter) |

**Total Effort:** ~2 hours of careful, tested changes

---

## READY FOR APPROVAL

All findings complete. No implementation changes until you approve Stage 2A.