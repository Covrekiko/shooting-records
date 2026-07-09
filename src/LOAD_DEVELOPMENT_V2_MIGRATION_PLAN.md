# Load Development V2 Migration Plan

## Principle

READ compatibility first. No destructive migration runs automatically.
Old data is normalized at read time; new data is written in V2 shape with
temporary dual-writing of legacy fields.

## Field-by-field

### velocity_1 ... velocity_5 (legacy)
- Kept in the `ReloadingTestResult` schema — not deleted.
- Read: `getVelocityReadings(result)` prefers `velocity_readings`; when
  absent, it reconstructs readings from `velocity_1...velocity_5`.
- Write (dual-write, documented and temporary): every save writes
  `velocity_readings` AND mirrors the first five saved readings back into
  `velocity_1...velocity_5` so any untouched legacy consumer keeps working.
- Removal: only after all consumers are proven to use the adapter and a
  verified background migration has populated `velocity_readings` on all
  historical records. Not scheduled in Milestone 1.

### velocity_readings (new)
- Array of `{ shot_number, velocity, included }`.
- Object entries chosen (over plain numbers) to support excluded readings
  without deleting history; the normalizer also accepts plain-number arrays.

### is_best
- Unchanged in Milestone 1. Existing selections remain visible everywhere.
- Future "My Preferred Load" (Milestone 4) must migrate `is_best` read-first
  (treat `is_best === true` as preferred until an `is_preferred` value exists).

### avg_velocity / es / sd
- Stored values untouched. Recalculation via the Calculate button now uses
  the shared utility (Sample SD) — see LOAD_DEVELOPMENT_STATISTICS.md.

### Old PDFs / old results
- PDF generation reads through `getVelocityReadings`, so legacy five-field
  results still export their velocity string. Already-exported PDF files are
  static and unaffected.

### Missing round_count
- Treated as expected 0; the editor still allows adding readings manually,
  and editing an old result always shows all reconstructed readings even if
  they exceed the expected count.

### Malformed / null / partial records
- The normalizer drops non-numeric, zero, and negative velocities from
  statistics but never mutates stored records.
- Editing then saving a record rewrites only that record with cleaned data;
  no bulk rewrite occurs.

## Optional Background Migration (NOT implemented)

If ever desired, a one-off script could copy legacy fields into
`velocity_readings` for records lacking it. This must not run until:
1. Read-time compatibility is verified in production.
2. A dry-run report of affected records is reviewed.
3. Explicit approval is given.