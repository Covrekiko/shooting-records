# Load Development Statistics Convention

Authoritative implementation: `src/utils/loadDevelopmentStatistics.js`.
All Load Development consumers (result form, displays, PDF) must use this utility.

## Valid Reading

A velocity is valid only if it is a finite number greater than 0.
Blank fields, non-numeric text, zero, and negative values are never valid
readings and are never used in statistics.

## Included vs Excluded

Each reading carries `included` (default `true`). Excluded readings are
retained in stored data and displayed with an excluded marker, but are NOT
used in Average, ES, or SD. Exclusion is always a manual user choice — the
app never auto-excludes an "outlier".

## Formulas

Let `v` = the set of valid, included readings; `N` = its size.

- Mean (Average): `sum(v) / N`
- Extreme Spread (ES): `max(v) - min(v)`
- Population SD: `sqrt( sum((x - mean)^2) / N )`
- Sample SD: `sqrt( sum((x - mean)^2) / (N - 1) )` — undefined for N < 2

## Displayed SD Convention

The application displays and saves **Sample SD (N-1)** for newly calculated
values. Sample SD requires at least 2 included readings; with fewer, SD is
not calculated (shown blank).

Historical note: the previous implementation used Population SD (÷N). Old
saved SD values are not rewritten. Recalculating an old result via the
Calculate button will produce the Sample SD value.

No compatibility claim is made with any specific chronograph brand
(Garmin, LabRadar, MagnetoSpeed, FX Radar, etc.) — their formula behaviour
has not been verified against real device output.

## Rounding

- Average: rounded to nearest whole fps
- ES: rounded to nearest whole fps
- SD: rounded to 1 decimal place

Rounding is applied only at save/display; intermediate calculation uses
full precision.

## Missing / Malformed Values

- Blank rows: ignored in statistics (test K)
- Invalid text: highlighted in the UI, never silently included (test L)
- Recorded count may differ from a variant's expected `round_count`;
  statistics always use the actual valid included readings (tests G, H)

## Paste Parsing

`parsePastedVelocities` accepts newline, comma, semicolon, or whitespace
separated values. Only plain positive numbers (`.` decimal separator) are
accepted; anything else is reported as invalid. Parsing never writes data —
readings replace current values only after explicit user confirmation.