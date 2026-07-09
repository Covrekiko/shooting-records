# Protected Working Flows Report

Date: 2026-07-09

---

## 1. Target Shooting ammunition deduction

Original expected working behaviour:

- Initial ammunition stock: 500
- User records Target Shooting usage: 100
- Expected result: stock becomes 400

Code modified?

- No stock deduction logic was modified.

Why:

- The user reported this flow is working correctly.
- Static architecture risk alone did not authorize changing this protected path.

Regression evidence:

- `npm run build`: VERIFIED PASS
- `npm run lint`: VERIFIED PASS
- Protected runtime stock test: BLOCKED because isolated test data was not available.

Final status:

`PRESERVE CURRENT WORKING IMPLEMENTATION`

---

## 2. Target Shooting ammunition return after deletion

Original expected working behaviour:

- Initial stock: 500
- Target usage: 100
- Stock after usage: 400
- User deletes Target Shooting entry
- Expected result: stock returns to 500

Code modified?

- No delete/refund/return logic was modified.

Why:

- The user reported this flow is working correctly.
- The audit identified static partial-failure risk, but no exact runtime defect was executed.

Regression evidence:

- `npm run build`: VERIFIED PASS
- `npm run lint`: VERIFIED PASS
- Runtime delete/retry test: BLOCKED because isolated seeded stock/session test data was not available.

Final status:

`PRESERVE CURRENT WORKING IMPLEMENTATION`

---

## 3. Reloading deduction/reversal behaviour

Original expected working behaviour:

- Reloading consumes current stock/components according to current design.
- Deleting/reversing according to current app behaviour restores stock/components as currently intended.

Code modified?

- No reloading stock deduction/reversal logic was modified.

Why:

- The user reported the current behaviour is working.
- Reloading internals were not rewritten based on static architecture preference.

Regression evidence:

- `npm run build`: VERIFIED PASS
- `npm run lint`: VERIFIED PASS
- Runtime seeded reload reversal test: BLOCKED because isolated component/batch test data was not available.

Final status:

`PRESERVE CURRENT WORKING IMPLEMENTATION`

---

## 4. Rifle cleaning behaviour

Original expected working behaviour:

- Current rifle cleaning state/counter behaviour works and must be preserved.

Code modified?

- No rifle cleaning/maintenance function or counter logic was modified.

Why:

- User-confirmed working flow.
- No exact current cleaning defect was proven.

Regression evidence:

- `npm run build`: VERIFIED PASS
- `npm run lint`: VERIFIED PASS
- Runtime cleaning threshold/reset/lifetime test: BLOCKED because isolated test data was not available.

Final status:

`PRESERVE CURRENT WORKING IMPLEMENTATION`

---

## 5. Firearm round counters tied to protected flows

Original expected working behaviour:

- Current firearm usage/counter behaviour tied to working stock/reversal/cleaning flows must remain unchanged.

Code modified?

- No counter mutation semantics were modified.
- New Firearm Profiles page reads existing counter values only.

Why:

- Counter semantics are protected.
- New profile page is read-only.

Regression evidence:

- `npm run build`: VERIFIED PASS
- `npm run lint`: VERIFIED PASS
- Runtime counter mutation tests: BLOCKED due isolated data requirement.

Final status:

`PRESERVE CURRENT WORKING IMPLEMENTATION