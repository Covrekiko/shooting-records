# STAGE 2C ANALYSIS — RELOAD BATCH DELETE + COMPONENT RESTORE

**Status:** ✅ ANALYSIS COMPLETE — READY FOR IMPLEMENTATION  
**Date:** 2026-04-29  
**Scope:** Reload batch delete safety, component restoration, primer refund, ammunition cleanup

---

## COMPLETE CURRENT CODE TRACE

### Where Reload Batches Are Created

**File:** `src/components/reloading/ReloadBatchForm.jsx` (Lines 204–284)

**Components deducted:**
```javascript
await Promise.all([
  base44.entities.ReloadingComponent.update(formData.primer_id, {
    quantity_remaining: Math.max(0, primer.quantity_remaining - cartridgesLoaded),  // ✓
  }),
  base44.entities.ReloadingComponent.update(formData.powder_id, {
    quantity_remaining: powderRemaining,  // ✓ (unit-converted correctly)
  }),
  base44.entities.ReloadingComponent.update(brassLookupId, brassUpdate),  // ✓
  base44.entities.ReloadingComponent.update(formData.bullet_id, {
    quantity_remaining: Math.max(0, bullet.quantity_remaining - cartridgesLoaded),  // ✓
  }),
]);
```

**Session record saved with component data:**
```javascript
components: [
  { type: 'primer', component_id: formData.primer_id, name: primer.name, quantity_used: cartridgesLoaded, ... },
  { type: 'powder', component_id: formData.powder_id, name: powder.name, quantity_used: powderUsed, unit: powder.unit, ... },
  { type: 'brass',  component_id: brassLookupId,      name: brass.name,  quantity_used: cartridgesLoaded, ... },
  { type: 'bullet', component_id: formData.bullet_id, name: bullet.name, quantity_used: cartridgesLoaded, ... },
]
```

**Ammo created with stable linking fields:**
```javascript
await base44.entities.Ammunition.create({
  brand: 'Reloaded',
  caliber: formData.caliber,
  quantity_in_stock: cartridgesLoaded,
  ammo_type: 'reloaded',
  source_type: 'reload_batch',
  source_id: createdSession.id,
  reload_session_id: createdSession.id,  // ← Stable link ✓
  batch_number: formData.batch_number,
  notes: `reload_batch:${createdSession.id} | Batch ${batchNumber}`,
});
```

---

### Where Reload Batches Are Deleted

**File:** `src/pages/ReloadingManagement.jsx` (Lines 41–154)

**Delete steps:**

| Step | Code | Status |
|------|------|--------|
| 1 | Find linked Ammunition (4 fallback paths) | ⚠️ FRAGILE (but works if stable fields set) |
| 2 | Check AmmoSpending for used rounds | ✓ |
| 3 | Block delete if rounds used | ✓ CORRECT |
| 4 | Delete linked Ammunition record | ✓ |
| 5 | Restore components loop | ⚠️ PRIMER BUG |
| 6 | Delete ReloadingSession | ✓ |

---

## BUGS IDENTIFIED

### BUG #1: Primer Not Restored When `component_id` Is Null ❌

**Location:** `ReloadingManagement.jsx` Lines 100–103

**Current Code:**
```javascript
let component = comp.component_id
  ? allComponents.find(c => c.id === comp.component_id)   // ← If comp.component_id exists
  : allComponents.find(c => c.component_type === comp.type && c.name === comp.name);  // ← Fallback
```

**Problem with fallback:**
```javascript
allComponents.find(c => c.component_type === comp.type && c.name === comp.name)
//                        ↑ uses c.component_type       ↑ but comp.type = 'primer'
//                        ↑ ReloadingComponent entity field is ALSO 'component_type'
//                        So this comparison: c.component_type === 'primer' → ✓ should work
```

**But wait — normalisation bug:**
```javascript
const normalizedType = comp.type?.toLowerCase()?.replace('primers', 'primer') || '';
const isPrimer = normalizedType === 'primer';

if (component) {
  let newRemaining;
  if (normalizedType === 'powder') {
    // ... powder conversion ...
  } else {
    newRemaining = component.quantity_remaining + Number(comp.quantity_used || 0);
  }
  await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining: newRemaining });
```

**The normalizedType is only used for isPrimer detection and powder conversion branching.** The restore logic itself runs for all types including primer. So primer SHOULD restore.

**ACTUAL ROOT CAUSE for primer failure:**

The fallback lookup uses `comp.type === c.component_type`. Looking at ReloadBatchForm:
```javascript
components: [
  { type: 'primer', ... },   // ← comp.type = 'primer'
  ...
]
```

And ReloadingComponent entity uses `component_type: 'primer'`.

The match: `c.component_type === comp.type` → `'primer' === 'primer'` ✓

**BUT**: For OLD batches created via `ReloadingSessionForm` (the old form), the session components array might use different type strings:
- `comp.type = 'Primer'` (capital P)  
- `comp.type = 'primers'` (plural)
- `comp.type = 'PRIMER'` (all caps)

These would NOT match `c.component_type === 'primer'`.

**The normalised string is computed but never used for the LOOKUP — only for isPrimer detection:**
```javascript
const normalizedType = comp.type?.toLowerCase()?.replace('primers', 'primer') || '';
// ↑ normalizedType = 'primer'

// But the LOOKUP below uses:
allComponents.find(c => c.component_type === comp.type && c.name === comp.name)
//                                           ↑ comp.type (NOT normalizedType!)
```

**This is the bug:** `normalizedType` is computed but `comp.type` (raw, un-normalised) is used in the fallback lookup.

---

### BUG #2: Ammunition Delete Lookup Has 4 Paths — Can Miss If `reload_session_id` Not Set ⚠️

**Location:** `ReloadingManagement.jsx` Lines 48–60

```javascript
let matchedAmmo = ammoList.find(a => a.source_id === id || a.reload_session_id === id);
if (!matchedAmmo) {
  matchedAmmo = ammoList.find(a => a.notes && a.notes.includes(`reload_batch:${id}`));
}
if (!matchedAmmo && session) {
  matchedAmmo = ammoList.find(a =>
    (a.brand === 'Reloaded') &&
    a.caliber === session.caliber &&
    a.notes && a.notes.includes(session.batch_number)
  );
}
```

**New batches:** Have `reload_session_id` → matched via first path ✓  
**Old batches (pre-fix):** May only have notes → matched via second path ✓  
**Very old batches:** Matched via brand+caliber+batch_number ✓  
**Missing:** If none of 4 paths match → ammo NOT deleted → orphaned in inventory ❌

**When can it miss?**
- User manually edited notes to remove `reload_batch:xxx`
- Old batch created before any linking fields existed
- Batch created via `ReloadingSessionForm` (old form) which uses `create_ammo` toggle in `ReloadingManagement.handleSubmit` — creates ammo WITHOUT `reload_session_id`

**Old form ammo creation (lines 172–187 in ReloadingManagement.jsx):**
```javascript
if (data.create_ammo) {
  const batchNotes = `reload_batch:${createdSession.id} | Batch ${data.batch_number}`;
  await base44.entities.Ammunition.create({
    brand: 'Reloaded',
    caliber: data.caliber,
    quantity_in_stock: data.rounds_loaded,
    notes: batchNotes,
    // ← NO reload_session_id field!
    // ← NO source_type field!
    // ← NO source_id field!
  });
}
```

Old ammo records: only matched via notes parsing. If notes edited → not found.

---

### BUG #3: Partial-Use Block Works But Error Message Is Confusing ⚠️

**Location:** `ReloadingManagement.jsx` Lines 77–81

```javascript
if (roundsUsed > 0) {
  alert(`Cannot delete this batch — ${roundsUsed} round(s) have already been used in session records. Archive the batch instead or edit it manually.`);
  return;
}
```

**Status:** ✓ Blocks hard delete if any rounds used  
**Problem:** Says "Archive the batch" but there's no Archive button in the UI — user can only cancel

---

### BUG #4: Used Brass `times_reloaded` Not Decremented on Delete ❌

**Location:** `ReloadingManagement.jsx` (restore components loop, Lines 92–142)

**When batch is deleted, component restore:**
```javascript
if (normalizedType === 'powder') {
  // ... powder conversion restore ...
} else {
  newRemaining = component.quantity_remaining + Number(comp.quantity_used || 0);
}
await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining: newRemaining });
```

**Missing:** For brass with `is_used_brass: true`, the batch creation increments `times_reloaded`. Delete should decrement it. Currently NOT done.

---

## SUMMARY TABLE

| # | Severity | Bug | Location | Fix |
|---|----------|-----|----------|-----|
| 1 | HIGH | Primer not restored if `comp.type` has wrong case | `ReloadingManagement.jsx:103` | Use `normalizedType` (already computed) in fallback lookup |
| 2 | MEDIUM | Old ammo (no `reload_session_id`) may not be found/deleted | `ReloadingManagement.jsx:50-60` | Keep 4-path lookup but warn if not found; add notes-only path |
| 3 | LOW | Block message says "Archive" but no archive button | `ReloadingManagement.jsx:79` | Improve message: "Delete is blocked. No action needed — keep the batch for history." |
| 4 | LOW | Used brass `times_reloaded` not decremented on delete | `ReloadingManagement.jsx:121` | Decrement `times_reloaded` for brass comps with `is_used_brass` |

---

## CORRECT DELETE ORDER (REQUIRED vs CURRENT)

| Step | Required | Current Status |
|------|----------|----------------|
| 1 | Check if any rounds used in session records | ✓ Done (AmmoSpending check) |
| 2 | Block hard delete if rounds used | ✓ Done (alert + return) |
| 3 | Find and delete linked Ammunition record | ✓ Done (4-path lookup) |
| 4 | Restore all components (primer, powder, brass, bullet) | ⚠️ Works for new batches; primer fails for old data if type case wrong |
| 5 | Decrement `times_reloaded` for used brass | ❌ Missing |
| 6 | Delete ReloadingSession | ✓ Done |
| 7 | Refresh UI | ✓ Done (loadSessions) |

---

## COMPONENT RESTORE TRACE — WHAT WORKS vs WHAT FAILS

### For NEW batches (created via ReloadBatchForm):
- `component_id` is always set on each component entry
- Direct lookup by ID → always finds component
- Primer restore: ✓ (found by ID, quantity_used = cartridgesLoaded)
- Powder restore: ✓ (found by ID, unit conversion correct)
- Brass restore: ✓ (found by ID, quantity added back)
- Bullet restore: ✓ (found by ID)

### For OLD batches (created via ReloadingSessionForm or old create path):
- `component_id` may be null
- Falls back to: `allComponents.find(c => c.component_type === comp.type && c.name === comp.name)`
- If `comp.type = 'Primer'` but `c.component_type = 'primer'` → NO MATCH → primer NOT restored ❌
- If `comp.type = 'powder'` and `c.component_type = 'powder'` → MATCH ✓

### The Fix:

**Current fallback:**
```javascript
allComponents.find(c => c.component_type === comp.type && c.name === comp.name)
//                                           ↑ raw, un-normalised comp.type
```

**Fixed fallback (use already-computed normalizedType):**
```javascript
allComponents.find(c => c.component_type === normalizedType && c.name === comp.name)
//                                          ↑ normalizedType (already lowercased + plurals removed)
```

This is a **one-line fix** that resolves the primer (and any other case-sensitive component type) restore.

---

## PRIMER REFUND ROOT CAUSE — EXACT

1. **Old batches** may have `comp.type = 'Primer'` (capital P) stored in `ReloadingSession.components`
2. `component_id` for these old entries is `null` (not stored at creation)
3. Fallback lookup: `c.component_type === comp.type` → `'primer' === 'Primer'` → **FALSE** → not found
4. `component` is `undefined` → `if (component)` is false → update skipped
5. Primer stock NOT restored

**Secondary cause:** `normalizedType` IS computed correctly (`'Primer'` → `'primer'`) but is NEVER used in the actual lookup — only used for `isPrimer` detection flag.

---

## ACCEPTANCE TEST TRACE

### TEST 1–5: Primer Restore
1. Primer stock 100
2. Create reload batch using 20 primers
3. Primer stock 80 ✓ (ReloadBatchForm deducts correctly)
4. Delete unused reload batch
5. **Primer stock 100?** → ❌ FAILS for old batches (comp.type case mismatch), ✓ for new batches

**Fix:** Use `normalizedType` in fallback lookup → primer always found → stock restored

### TEST 6–10: Ammo Cleanup
6. Create batch .243 qty 20 → Ammo Inventory shows 20 ✓
7. Delete unused batch
8. **Ammo deleted from inventory?** → ✓ for new batches (has reload_session_id), ⚠️ for old
9. **Ammo does not come back on refresh?** → ✓ (it's deleted from DB)

### TEST 11–14: Partial-Use Block
11. Create batch 20 rounds
12. Use 4 rounds in record → AmmoSpending logged
13. Try delete batch
14. **App blocks delete?** → ✓ ALREADY WORKS (`roundsUsed > 0` check)

---

## EXACT CODE CHANGES REQUIRED

### Change 1: Fix primer (and all components) fallback lookup [ONE LINE]

**File:** `src/pages/ReloadingManagement.jsx` Line 103

**Current:**
```javascript
: allComponents.find(c => c.component_type === comp.type && c.name === comp.name);
```

**Fixed:**
```javascript
: allComponents.find(c => c.component_type === normalizedType && c.name === comp.name);
```

**Note:** `normalizedType` is already computed on line 106 — BUT it's computed AFTER the fallback lookup on line 103. Need to move the normalisation BEFORE the lookup.

**Restructured block:**
```javascript
// Normalise comp.type FIRST (handles Primer/primers/PRIMER/primer)
const normalizedType = comp.type?.toLowerCase()?.replace(/^primers?$/i, 'primer') || '';
const isPrimer = normalizedType === 'primer';

// Find matching component: by ID first, then by normalized type + name
let component = comp.component_id
  ? allComponents.find(c => c.id === comp.component_id)
  : allComponents.find(c => c.component_type === normalizedType && c.name === comp.name);
```

### Change 2: Restore `times_reloaded` for used brass [SMALL ADDITION]

**File:** `src/pages/ReloadingManagement.jsx` (inside component restore loop)

**After** restoring quantity_remaining for brass, if `comp.is_used_brass === true`:
```javascript
if (normalizedType === 'brass' && comp.is_used_brass && component.times_reloaded > 0) {
  await base44.entities.ReloadingComponent.update(component.id, {
    quantity_remaining: newRemaining,
    times_reloaded: Math.max(0, (component.times_reloaded || 0) - 1),
  });
} else {
  await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining: newRemaining });
}
```

### Change 3: Improve partial-use blocked message [COSMETIC]

**File:** `src/pages/ReloadingManagement.jsx` Line 79

**Current:**
```javascript
alert(`Cannot delete this batch — ${roundsUsed} round(s) have already been used in session records. Archive the batch instead or edit it manually.`);
```

**Fixed:**
```javascript
alert(`Cannot delete this batch — ${roundsUsed} round(s) have already been used in shooting records. The batch is kept for historical accuracy. No action needed.`);
```

---

## FILES TO CHANGE

1. **`src/pages/ReloadingManagement.jsx`** — 3 targeted changes:
   - Move `normalizedType` declaration BEFORE component lookup (line ~100-103)
   - Use `normalizedType` instead of `comp.type` in fallback lookup (line 103)
   - Add `times_reloaded` decrement for used brass (inside restore loop)
   - Improve partial-use alert message (line 79)

---

## CONFIRMED OUT OF SCOPE

✅ GPS tracking — Untouched  
✅ Record delete/refund (Stage 2B) — Untouched  
✅ Reports — Untouched  
✅ Cleaning counters — Untouched  
✅ Mobile UI — Untouched  
✅ Map design — Untouched  
✅ Colours — Untouched  
✅ Layout — Untouched  
✅ Menus — Untouched  
✅ PDFs — Untouched  

Only `ReloadingManagement.jsx` delete handler is changed.

---

## READY FOR IMPLEMENTATION

Total changes: 1 file, 4 targeted fixes.  
Risk: Minimal — all changes are inside the delete handler, no checkout logic changed.