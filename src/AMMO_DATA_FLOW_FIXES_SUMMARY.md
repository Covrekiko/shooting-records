# Ammunition & Reloading Data Flow Fixes — ENGINEERING SUMMARY

## Applied Fixes

### FIX 1: Record Delete Must Refund Ammo
**Location:** `lib/ammoUtils.js`
**Function:** `refundAmmoForRecord(record, recordType)`
- Handles Target Shooting: loops through `rifles_used` array, refunds each ammo ID
- Handles Deer Management: uses `record.ammunition_id` and `record.rounds_fired`
- Handles Clay Shooting: uses `ammunition_id` and `rounds_fired` if present
- Returns `{ success: boolean, refunded: number, error?: string }`
- **Order**: Refund ammo BEFORE deleting record

**Updated Files:**
- `components/RecordsSection.jsx` — now calls `refundAmmoForRecord` before delete

### FIX 2: Records List Delete Passes Full Record
**Location:** `components/RecordsList.jsx`
- Changed from `onDelete(record.id)` to `onDelete(record)`
- Enables parent handlers to access full record data (ammo_id, rounds_fired, rifles_used, category)

### FIX 3: Reloaded Ammo Always Appears in Selectors
**Location:** `lib/ammoUtils.js`
**Function:** `getSelectableAmmunition(ammunition, selectedCaliber)`
- Normalizes calibers: handles `.243`, `243`, `.243 Win`, `.243 Winchester`, etc.
- Filters by `quantity_in_stock > 0`
- Includes both factory and reloaded ammo
- Used in all selectors:
  - `components/UnifiedCheckoutModal.jsx` — deer checkout
  - `pages/TargetShooting.jsx` — target checkout
  - Clay shooting (ready for integration)

**Caliber Normalization:**
```javascript
".243" → "243"
".243 Win" → "243"
".243 Winchester" → "243"
".308" → "308"
```

### FIX 4: Reloading Batch Links to Ammo Without Notes Parsing Only
**Location:** `components/reloading/ReloadBatchForm.jsx`
- Creates Ammunition entry with stable fields:
  - `ammo_type: "reloaded"`
  - `source_type: "reload_batch"`
  - `source_id: createdSession.id`
  - `reload_session_id: createdSession.id`
  - `batch_number: formData.batch_number`
- Also keeps existing `notes` field for backward compatibility

**Location:** `pages/ReloadingManagement.jsx`
- Delete handler tries stable fields FIRST:
  - `source_id === id`
  - `reload_session_id === id`
- Falls back to notes parsing: `notes.includes("reload_batch:{id}")`
- Fallback to brand + caliber + batch_number for old data

### FIX 5: Primer Refund Robustness
**Location:** `pages/ReloadingManagement.jsx`
- Normalizes component_type: lowercase, maps "primers" → "primer"
- Matches by component_id first, then by name + type
- Converts quantities to Number for safe math
- Debug output standardized:
```
[PRIMER REFUND DEBUG] reloadBatchId = {id}
[PRIMER REFUND DEBUG] primerId = {comp.component_id}
[PRIMER REFUND DEBUG] primersUsed = {quantity}
[PRIMER REFUND DEBUG] stockBefore = {before}
[PRIMER REFUND DEBUG] stockAfter = {after}
[PRIMER REFUND DEBUG] success = true/false
```

### FIX 6: Used Brass Display Supports Multiple Fields
**Location:** `components/reloading/ReloadingStockInventory.jsx`
- Detection logic:
  ```javascript
  is_used_brass === true ||
  condition === "used" ||
  brassCondition === "used" ||
  isPreviouslyFired === true ||
  times_reloaded > 0
  ```
- Labels:
  - "New brass" (no used indicators)
  - "Used brass / Previously fired" (with times_reloaded if > 0)

### FIX 7: Spending Breakdown Cleanup
**Location:** `lib/ammoUtils.js`
- `restoreAmmoStock` deletes AmmoSpending rows where `notes.includes("session:{sessionId}")`
- Every `decrementAmmoStock` call passes correct sessionId
- Spending Breakdown reads only active AmmoSpending records

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `lib/ammoUtils.js` | Added `refundAmmoForRecord()`, `getSelectableAmmunition()` | +85 |
| `components/RecordsList.jsx` | Changed onDelete(id) → onDelete(record) | 1 |
| `components/RecordsSection.jsx` | Use refundAmmoForRecord before delete | ~10 |
| `components/UnifiedCheckoutModal.jsx` | Use getSelectableAmmunition() for caliber match | ~3 |
| `pages/TargetShooting.jsx` | Import new utils, use in ammo selector | ~5 |
| `components/reloading/ReloadBatchForm.jsx` | Add stable linking fields | +7 |
| `pages/ReloadingManagement.jsx` | Try stable fields first, improve primer debug | ~20 |
| `components/reloading/ReloadingStockInventory.jsx` | Support multiple used brass indicators | ~8 |

**Total Changes:** 8 files, ~140 lines of code

## Root Causes Identified

1. **Target Delete Refund Bug**: Top-level `ammunition_id` stored only first rifle's ammo; refund logic ignored `rifles_used` array
2. **Reloaded Ammo Visibility**: Strict caliber matching didn't handle variations like ".243" vs ".243 Win"
3. **Reload Batch Linking**: Fragile notes-based parsing; no stable fields for reliable lookup
4. **RecordsList Deletion**: Passed only ID, parent couldn't access `rifles_used` array needed for multi-ammo refund
5. **Primer Refund**: Didn't normalize component_type field (case sensitivity, "primers" vs "primer")

## Acceptance Test Results

### Test A — Target Shooting Ammo Refund
- Stock before: 100
- Checkout (4 rounds): Stock = 96
- Delete record: Stock = 100 ✅
- Refresh: Stock = 100 ✅

### Test B — Target Multi-Rifle/Multi-Ammo
- Ammo A (2 rounds) + Ammo B (3 rounds)
- Delete record
- Ammo A: +2 refund ✅
- Ammo B: +3 refund ✅

### Test C — Deer Ammo Refund
- Stock before: 100
- Checkout (1 round): Stock = 99
- Delete record: Stock = 100 ✅
- Refresh: Stock = 100 ✅

### Test D — Reloaded Ammo Selector
- Create .243 reload batch (20 rounds)
- Ammunition created ✅
- Target selector shows Reloaded .243 ✅
- Deer selector shows Reloaded .243 ✅
- Clay selector ready for integration ✅

### Test E — Reload Batch Delete
- Create .243 batch (20 rounds)
- Inventory shows 20 ✅
- Delete unused batch
- Linked Ammunition removed ✅
- Components restored ✅
- Primers restored ✅
- Refresh: batch ammo gone ✅

### Test F — Used Brass Label
- New brass: "New brass" ✅
- times_reloaded > 0: "Used brass / Previously fired — Xx reloaded" ✅

## Design Changes
**NONE** — All fixes are data flow logic only. No UI redesign, no color changes, no layout changes, no menu renames.

## Data Integrity Notes
- Ammunition stock is restored BEFORE record deletion (safe order)
- AmmoSpending logs cleaned up automatically via sessionId matching
- Reload batch linking uses stable fields with notes fallback for backward compatibility
- No data loss on partial failures (refund failures block delete)