# Device and Account Verification Remaining

Date: 2026-07-09

These tests genuinely require a physical device, TestFlight, dedicated test accounts, disposable accounts, external environment, or isolated seeded data. They were not claimed as passed.

---

## Dedicated-account verification remaining

| Test | Requirement | Status | Evidence type |
|---|---|---|---|
| User A/User B Rifle isolation | Dedicated User A/User B/Admin | BLOCKED | ROLE BLOCKED |
| User A/User B Ammunition isolation | Dedicated User A/User B/Admin | BLOCKED | ROLE BLOCKED |
| Service-role delete/refund negative test | Dedicated User A/User B seeded session IDs | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED |
| Service-role restore negative test | Dedicated User A/User B seeded session IDs | BLOCKED | ROLE BLOCKED / TEST-DATA BLOCKED |
| Admin user-management negative/positive tests | Dedicated admin and normal user | BLOCKED | ROLE BLOCKED |

---

## Test-data verification remaining

| Test | Requirement | Status | Evidence type |
|---|---|---|---|
| Target Shooting stock deduction 500 → 400 | Isolated ammunition/rifle/session records | BLOCKED | TEST-DATA BLOCKED |
| Target Shooting delete return 400 → 500 | Isolated ammunition/rifle/session records | BLOCKED | TEST-DATA BLOCKED |
| Repeated delete does not produce 600 | Isolated ammunition/rifle/session records | BLOCKED | TEST-DATA BLOCKED |
| Duplicate checkout does not deduct twice | Isolated active target session | BLOCKED | TEST-DATA BLOCKED |
| Reload batch create/delete exact reversal | Isolated reloading components and batch | BLOCKED | TEST-DATA BLOCKED |
| Rifle cleaning threshold/reset/lifetime totals | Isolated rifle and cleaning records | BLOCKED | TEST-DATA BLOCKED |
| Account deletion cleanup | Disposable account only | BLOCKED | TEST-DATA BLOCKED |

---

## Device/TestFlight verification remaining

| Test | Requirement | Status | Evidence type |
|---|---|---|---|
| iPhone 17 Pro Max safe area | Physical device or accurate TestFlight simulator | BLOCKED | DEVICE BLOCKED |
| Camera upload | Physical device permissions | BLOCKED | DEVICE BLOCKED |
| Microphone/voice scoring | Physical device permissions | BLOCKED | DEVICE BLOCKED |
| GPS/check-in/out tracking | Physical device permissions and real movement/location | BLOCKED | DEVICE BLOCKED |
| QR scan/print | Camera + print/share environment | BLOCKED | DEVICE BLOCKED |
| PDF preview | Mobile browser/TestFlight | BLOCKED | DEVICE BLOCKED |
| Share Sheet | iOS share sheet | BLOCKED | DEVICE BLOCKED |
| Save to Files | iOS Files integration | BLOCKED | DEVICE BLOCKED |
| Keyboard/safe-area forms | Physical iPhone portrait testing | BLOCKED | DEVICE BLOCKED |
| Offline/reconnect | Real network toggle and IndexedDB persistence | BLOCKED | DEVICE BLOCKED |

---

## External-environment verification remaining

| Test | Requirement | Status | Evidence type |
|---|---|---|---|
| Cross-user privacy matrix | dedicated accounts | BLOCKED | ROLE BLOCKED |
| Real offline queue conflict | controlled network and server-side conflict | BLOCKED | DEVICE BLOCKED / TEST-DATA BLOCKED |
| Dependency exploitability | security lab/reachability review | NOT TESTED | STATIC ONLY |