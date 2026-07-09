# Load Development SD Consistency Plan — Milestone 1.5

## Scope

This plan is limited to Load Development standard deviation (SD) consistency. It does not introduce charts, an Analysis tab, rankings UI, stock changes, RLS changes, offline changes, or destructive data migration.

## Current Verified Convention

The application convention for newly calculated Load Development SD is:

- **Sample Standard Deviation**
- Formula: `sqrt(sum((x - mean)^2) / (N - 1))`
- Minimum valid included readings: **2**
- Rounding: **1 decimal place**
- Excluded readings: retained and displayed, but not used in Avg / ES / SD
- Blank readings: ignored
- Invalid readings: rejected from calculation; not silently included
- One valid reading: SD is unavailable/null, never zero

## Why Sample SD (N - 1)

Load development chronograph strings are normally a sample of a larger performance population, not the entire population of every possible round. Sample SD is the professional default for estimating dispersion from a limited shot sample and avoids understating variability compared with population SD.

## Current SD Path Matrix

| File | Function / Area | Reads SD | Calculates SD | Formula | Writes SD | Uses stored value | Uses readings | Historical risk | Analytics risk |
|---|---:|---:|---:|---|---:|---:|---:|---|---|
| `src/utils/loadDevelopmentStatistics.js` | `calculateSampleSD` | No | Yes | N - 1 | No | No | Yes | None | Authoritative formula |
| `src/utils/loadDevelopmentStatistics.js` | `calculatePopulationSD` | No | Yes | N | No | No | No | Potential confusion if reused | Must not be used for app SD convention |
| `src/utils/loadDevelopmentStatistics.js` | `summarizeReadings` | No | Yes | N - 1 | No | No | Yes | None | Safe calculated SD source |
| `src/utils/loadDevelopmentStatistics.js` | `getVelocityReadings` | No | No | n/a | No | No | Yes | Reconstructs legacy fields safely | Required for historical reproducibility |
| `src/components/load-development/ResultFormModal.jsx` | `calcVelocityStats` | No | Yes via `summarizeReadings` | N - 1 | Updates form state | No | Yes | Safe when Calculate is used | Safe calculated source |
| `src/components/load-development/ResultFormModal.jsx` | `handleSubmit` | Yes, through form state | No | n/a | Yes | Yes | Yes | Can preserve historical/manual values | Needs provenance |
| `src/components/load-development/ResultFormModal.jsx` | SD input | Yes | No | n/a | Yes | Yes | No direct | Manual override can be mixed with calculated SD | Needs explicit source |
| `src/components/load-development/TestDetailPage.jsx` | Result summary and detail cards | Yes | No | n/a | No | Yes | Yes for readings display | Historical/manual SD shown as plain SD | Should not feed analytics without provenance |
| `src/components/load-development/TestViewModal.jsx` | Result summary and detail cards | Yes | No | n/a | No | Yes | Yes for readings display | Historical/manual SD shown as plain SD | Should not feed analytics without provenance |
| `src/utils/loadTestPDF.js` | Results rows | Yes | No | n/a | No | Yes for velocities | Historical/manual SD shown as plain SD | Must label source |
| `src/lib/loadComparison.js` | `buildComparisonRows` | Yes | No | n/a | No | No before Milestone 1.5 | Mixed historical/manual/calculated values can be ranked together | Must use calculated comparable SD only |
| `src/lib/loadComparison.js` | `scoreConsistency` | Receives SD | No | n/a | No | No | Depends on caller | Must not receive mixed SD silently |
| `src/pages/LoadComparison.jsx` | Displays comparison rows | Indirect | No | n/a | No | No | Receives row output only | Depends on `buildComparisonRows` safety |

## Data Shape Implications

### V2 results with `velocity_readings`

If at least two valid included readings exist, Sample SD can be reproduced exactly from readings. This is the preferred source for analytics and future comparison.

### Legacy results with only `velocity_1...velocity_5`

If at least two valid legacy readings exist, Sample SD can also be reproduced from the legacy fields via the adapter. These are safe for calculated Sample SD analytics because the readings are reproducible even if stored `sd` was originally population SD.

### Stored SD with no valid readings

If no valid readings exist, the stored `sd` must be preserved as historical/manual. It must not be silently overwritten or treated as Sample SD.

### One-reading results

One valid reading cannot produce Sample SD. SD must remain null/unavailable unless a stored historical/manual value already exists, and that value must be marked non-comparable.

### Excluded readings

Excluded readings are retained for audit/display but omitted from Avg, ES, and SD calculation.

### Manual SD

The existing field is manually editable. Without provenance, manual values cannot be distinguished from old historical stored values. The smallest additive model change is to add `sd_source` and `sd_formula`.

## Historical Data Policy

No destructive rewrite is performed.

1. Viewing or opening a historical record must not overwrite `sd`.
2. If valid V2 readings exist, analytics should calculate Sample SD from included readings.
3. If only legacy velocity fields exist, analytics should calculate Sample SD from reconstructed legacy readings.
4. If no reproducible readings exist, stored SD is preserved but treated as historical/manual and not equivalent to calculated Sample SD.
5. Existing historical stored values are not recalculated in bulk.
6. Saving a record may write explicit provenance for future values, but no read-only view writes data.

## Provenance Categories

- `calculated_sample`: reproducible Sample SD from readings, formula N - 1, comparable.
- `historical_stored`: stored SD without reproducible Sample SD provenance, preserved for record accuracy, not comparable as calculated Sample SD.
- `manually_entered`: user-entered override, preserved and labelled, not comparable as calculated Sample SD unless future product rules explicitly allow it.
- `unknown`: no usable SD.

## Manual SD Field Recommendation

### Option A — Calculated read-only when readings exist

Pros: Strongest data integrity. Cons: More disruptive; removes current manual correction workflow.

### Option B — Keep manual override but explicitly label Manual Override

Pros: Minimal change; preserves user workflow; makes provenance explicit. Cons: Manual and historical values still require analytics safeguards.

### Option C — Store both calculated and manual SD

Pros: Cleanest long-term model. Cons: Larger schema/model change and broader UI work.

### Recommended Milestone 1.5 Approach

Use **Option B now**, with the smallest additive schema support:

- Add `sd_source`
- Add `sd_formula`
- Keep `sd` as the displayed/stored value for backward compatibility
- Calculate reproducible Sample SD from readings for analytics rather than trusting stored `sd`
- Do not rewrite historical records

A future milestone can consider Option C if detailed audit/history UX is needed.

## Future Analytics Safety Rule

Future analytics must not silently rank mixed SD conventions together.

For each result, first derive an SD assessment:

- Does it have at least two valid included readings? If yes, use calculated Sample SD and label as `calculated_sample`.
- Does it have only stored SD? If yes, label as `historical_stored` or `manually_entered` and treat as non-comparable to calculated Sample SD.
- Does it have one valid reading? SD is unavailable/null unless a stored value exists; stored value is non-comparable.
- Does it have no readings and no stored value? SD is unknown.

Future labels should be explicit:

- `Lowest Calculated SD` for reproducible Sample SD values.
- `Lowest Recorded SD` only if it intentionally includes historical/manual stored values and discloses that mixture.

## Acceptance Test Mapping

A. New V2 5 readings: `summarizeReadings` returns Sample SD N - 1.

B. V2 excluded reading: excluded value is not used.

C. Legacy `velocity_1...velocity_5`: adapter reconstructs readings; Sample SD can be reproduced.

D. Stored SD without readings: preserved and classified as historical/manual, not recalculated.

E. One valid reading: calculated SD is null/unavailable.

F. Two valid readings: Sample SD calculated with N - 1.

G. Manual SD: kept as override, provenance documented and written on save when edited.

H. Opening historical record: read-only display does not write or overwrite anything.

I. PDF: SD is labelled with source; historical/manual SD is not labelled as calculated Sample SD.

J. Future analytics: shared SD assessment distinguishes comparable calculated Sample SD from historical/manual/unknown values.