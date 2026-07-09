# Load Development V2 Change Plan

Date: 2026-07-09

## Authorised Scope

Milestone 1 only:

- Dynamic chronograph readings based on `ReloadingTestVariant.round_count`
- Backward compatibility with `velocity_1` ... `velocity_5`
- Shared statistics utility
- Dynamic PDF compatibility
- Paste readings with preview/confirmation
- No preview-flow changes
- No unrelated module changes

## Files and Dependency Impact

| File path | Component/function/entity | Current behaviour | Proposed behaviour | Schema impact | Migration impact | Backward compatibility | Regression risk | Affected callers | Test plan |
|---|---|---|---|---|---|---|---|---|---|
| `base44/entities/ReloadingTestResult.jsonc` | `ReloadingTestResult` entity | Stores fixed `velocity_1` to `velocity_5`; no dynamic readings | Add optional `velocity_readings` array of objects: `shot_number`, `velocity`, `included`; keep all legacy fields | Additive only; no removed fields | No destructive migration; old records remain valid | Legacy fields remain; new saves can dual-write first five fields | Medium: schema typo could break result saves | Result form, result display, PDF | Build; save payload test; old result normalization test |
| `src/utils/loadDevelopmentStatistics.js` | New shared utility | Velocity stats duplicated in `ResultFormModal`; variance currently divides by N | Centralize reading normalization, legacy adapter, mean, ES, population SD, sample SD, parsing, summary | None | Read-time compatibility adapter for old data | Reads old fixed fields when `velocity_readings` is absent | Low/medium: calculation convention changes for new recalculated saves | Result form, result displays, PDF | Focused utility tests A-O where possible |
| `src/components/load-development/ChronographReadingsEditor.jsx` | New focused component | Result modal renders exactly five inputs | Render editable rows from expected/readings; add/remove readings; include/exclude; paste preview before replacing | None | Old results passed in as normalized readings | Does not truncate old readings; blank expected rows allowed | Medium: modal usability on long strings | `ResultFormModal` only | Test 3/5/10/20 expected rows; add/remove; exclude; paste preview |
| `src/components/load-development/ResultFormModal.jsx` | Result editing/saving | Fixed five velocity inputs; manual calculate uses population SD over fixed fields | Use `variant.round_count` as default expected count; initialize from `velocity_readings` or legacy fields; save `velocity_readings`; dual-write legacy first five readings; calculate stats from included readings | Writes new field | New records write V2 shape; old records normalized on edit | Existing fields preserved; old data loads from fixed fields | Medium/high: result save path is core Load Development flow | `TestDetailPage` opens this modal | Acceptance tests A-L, O via utility/component logic and build |
| `src/components/load-development/TestDetailPage.jsx` | Result display in detail page | Displays fixed `velocity_1` ... `velocity_5` | Display normalized dynamic readings including excluded status | None | Read-time only | Old result display falls back to fixed fields | Low | Test detail result cards | Build; static grep; sample old/new result test |
| `src/components/load-development/TestViewModal.jsx` | Read-only modal result display | Displays fixed `velocity_1` ... `velocity_5` | Display normalized dynamic readings including excluded status | None | Read-time only | Old result modal still displays legacy readings | Low | Load Development list view modal | Build; sample old/new result test |
| `src/utils/loadTestPDF.js` | Load Development PDF generation | PDF prints fixed five velocity values only | PDF prints all normalized readings, marks excluded readings, old fields still export | None | Read-time compatibility only | Old PDF exports still include legacy velocities | Medium: PDF output formatting/page breaks | PDF preview/save actions | Sample PDF generation test with legacy and dynamic readings |
| `LOAD_DEVELOPMENT_STATISTICS.md` | Documentation | No explicit SD convention documented | Document formulas, sample SD display convention, missing/blank/excluded handling | None | None | Clarifies old/new behaviour | Low | Developer/user documentation | Review content |
| `LOAD_DEVELOPMENT_V2_MIGRATION_PLAN.md` | Migration documentation | No V2 migration plan | Document read compatibility first, no destructive migration, optional future migration | None | Documents safe path | Protects old data | Low | Future migration work | Review content |

## Confirmed Non-Changes

- No Target Shooting changes.
- No Clay Shooting changes.
- No Deer Management changes.
- No stalking/map/offline changes.
- No authentication changes.
- No navigation architecture changes.
- No RLS rule changes.
- No stock/inventory deduction changes.
- No mobile PDF preview architecture changes.
- No share/download fix regression intended.

## Milestone 1 Data Model Decision

Use an object array rather than a numeric-only array:

```json
"velocity_readings": [
  { "shot_number": 1, "velocity": 2648, "included": true },
  { "shot_number": 2, "velocity": 2780, "included": false }
]
```

Reason: this preserves excluded readings without deleting history and supports future source/notes metadata without changing the top-level model again.

## Statistics Convention

Milestone 1 will expose both population and sample SD in the utility, but the displayed/saved SD for newly calculated values will use **sample SD** when at least two included readings exist. This is documented in `LOAD_DEVELOPMENT_STATISTICS.md`.

## Backward Compatibility Strategy

1. If `velocity_readings` exists and has entries, normalize and use it.
2. Otherwise reconstruct readings from `velocity_1` ... `velocity_5`.
3. Editing an old result starts from reconstructed readings.
4. Saving writes `velocity_readings` and temporarily dual-writes the first five numeric readings into `velocity_1` ... `velocity_5`.
5. No legacy fields are deleted.
6. No automatic destructive migration runs.

## Test Plan

Milestone 1 acceptance tests:

- A: expected 3 readings from `round_count = 3`
- B: expected 5 readings from `round_count = 5`
- C: expected 10 readings from `round_count = 10`
- D: expected 20 readings from `round_count = 20`
- E: old `velocity_1` ... `velocity_5` result normalizes correctly
- F: editing old result preserves historical readings
- G: expected 5 / recorded 3 calculates from 3 included readings
- H: expected 5 / recorded 6 retains 6 and does not alter `variant.round_count`
- I: excluded reading retained but excluded from Avg/ES/SD
- J: paste 10 readings parses and requires confirmation
- K: blank fields ignored in statistics
- L: invalid text is reported and not silently included
- M: PDF exports dynamic readings and old five-field readings
- N: preview flow unchanged
- O: share cancellation behaviour remains no error/no false success

## Stop Rule

After Milestone 1 implementation:

- Stop.
- Provide exact files changed.
- Provide exact entities changed.
- Provide schema changes.
- Provide migration impact.
- Provide build result.
- Provide tests run.
- Provide regression result.
- Provide unresolved risks.
- Provide git diff summary.

Do not continue to Milestone 2 without approval.