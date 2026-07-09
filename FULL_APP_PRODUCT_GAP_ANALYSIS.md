# Full App Product Gap Analysis

Read-only product analysis only. No feature implementation performed.

## Product Positioning Summary

Shooting Records has an unusually broad scope: shooting logs, deer/stalking, clay, reloading, load development, target analysis, ammunition inventory, firearm maintenance, maps, QR, reports, admin, beta feedback, and offline field support. The breadth is commercially valuable but creates complexity. The strongest opportunity is to turn the app from a collection of modules into an integrated shooting intelligence system.

## Commercial Risk Before Growth

| Risk | Product Impact | Status |
|---|---|---|
| Stock/privacy/offline correctness not proven | Users may lose trust quickly | NOT TESTED |
| Too many partially overlapping workflows | User confusion and support burden | VERIFIED PASS inventory |
| Limited automated tests | Slower safe iteration | VERIFIED FAIL |
| Mobile/native/PDF not app-wide verified | TestFlight/App Store quality risk | BLOCKED |
| RLS/admin/privacy not proven | Severe trust/compliance risk | BLOCKED |

## Product Opportunity Evaluation

| Idea | User Value | Commercial Value | Target Customer | Complexity | Regression Risk | Dependencies | Priority | Recommendation |
|---|---|---|---|---|---|---|---|---|
| Universal Activity Timeline | Makes all activity visible chronologically | High retention; daily-use anchor | All users | Medium | Medium | Stable links across modules | P2 | Add |
| Global Search | Fast retrieval across rifles/ammo/records/load tests | High perceived polish | Power users, clubs | Medium | Low/Medium | Unified indexing/entity map | P2 | Add |
| Notification Center | Cleaning due, low stock, sync conflicts | Drives return usage | All users | Medium | Medium | Reliable rules and background sync | P2 | Add |
| Sync Conflict Center | Trustworthy offline conflict handling | Premium/reliability differentiator | Field users | High | High | Sync metadata/conflict detection | P1/P2 | Add after offline hardening |
| Data Health Center | Finds orphan records/stock mismatch | Strong trust/retention | Power users/admins | Medium/High | Medium | Integrity rules, read-only diagnostics | P1/P2 | Add |
| Unified Firearm Profile | Single source for firearm history | High value for serious shooters | Rifle/shotgun owners | Medium | Medium | Link sessions, maintenance, loads | P2 | Add |
| Proven Load Lifecycle | Connects load tests to batches and real performance | Major reloading differentiator | Reloaders | High | High | Load Dev, Reloading, Target Sessions | P2/P3 | Add after data integrity |
| Smart Dashboard | Personalised by enabled modules | Better onboarding and retention | All users | Medium | Low | Module preferences reliable | P2 | Improve |
| Cross-Module Analytics | Load vs performance, lot vs group size | Premium feature | Advanced reloaders | High | High | Data consistency and analytics model | P3 | Defer until P0/P1 fixed |
| Recently Deleted / Undo | Reduces fear of data loss | Trust feature | All users | Medium | Medium | Soft-delete model | P1/P2 | Add after delete audit |
| Better onboarding | Reduces first-run confusion | Conversion improvement | New users | Low/Medium | Low | Module templates | P2 | Improve |
| Professional subscription value | Monetizable premium tiers | Revenue | Serious users/clubs | Medium | Medium | Stable core + billing | P3 | Defer until reliability proof |
| Coach/reviewer workflow | Shared review of targets/loads | New segment | Coaches/clubs | High | High | Sharing/privacy/RLS | P3 | Defer |
| Better reports | Polished PDF/exports | Premium/professional value | Serious users | Medium | Medium | App-wide PDF reliability | P2/P3 | Improve |
| Shared area/team workflows | Stalking teams/landowners | Differentiated market | Deer/stalking users | High | High | Sharing permissions/location privacy | P3 | Defer until privacy proof |

## Competitive/Product Gaps By Segment

### Reloading / Load Development

| Gap | Impact | Recommendation |
|---|---|---|
| Chronograph import formats not present | Manual entry burden | Add later: Garmin/LabRadar/MagnetoSpeed import |
| Proven load lifecycle incomplete | Load tests not fully connected to real sessions | Add after stock/link integrity |
| Lot-level analytics limited | Hard to compare powder/bullet lots | Add after data model proof |
| Advanced pressure/temperature sensitivity analytics absent | Limits professional use | Defer to P3 |

### Shooting Logs / Armory

| Gap | Impact | Recommendation |
|---|---|---|
| Unified firearm profile missing | Users must jump between modules | Add P2 |
| Global activity timeline missing | App feels module-fragmented | Add P2 |
| Data health center missing | Orphan/stock mismatch invisible | Add P1/P2 |
| Recently deleted/undo missing | Destructive actions risky | Add after delete model audit |

### Target Analysis

| Gap | Impact | Recommendation |
|---|---|---|
| Multiple analyzer implementations | Confusing maintenance/product story | Simplify later after audit |
| Mobile calibration not proven | Trust risk | Verify before expansion |
| AI/manual calculation consistency not proven | Accuracy trust risk | Add calculation regression tests |

### Field / Stalking

| Gap | Impact | Recommendation |
|---|---|---|
| Sync conflict UX missing | Offline field data risk | Add after sync proof |
| Team/owner permissions need product hardening | Commercial opportunity blocked by privacy risk | Defer until security proof |
| Offline map confidence not proven | Field users may churn if unreliable | P1 validation required |

### Commercial / Subscription

| Opportunity | Value | Timing |
|---|---|---|
| Premium analytics | Strong differentiator | P3 after data integrity |
| Advanced reports | Professional subscription value | P2/P3 |
| Coach/reviewer workflows | New customer segment | P3 |
| Team/shared land management | Differentiated niche | P3 after privacy/RLS proof |
| QR asset labels | Practical premium add-on | P2 after print/device proof |

## Simplify / Remove Candidates For Future Review

No removal is authorised now. Future review candidates:

| Candidate | Reason | Recommendation |
|---|---|---|
| Duplicate target analyzer pages/components | Multiple implementations increase bugs | Simplify after mapping authoritative flow |
| Duplicate admin/user pages | Role/security confusion | Simplify after admin audit |
| Legacy modal systems | Multiple modal abstractions | Simplify only after mobile safe-area regression tests |
| Direct entity CRUD paths | Offline/security inconsistency | Replace gradually after tests |
| Historical audit/report markdown clutter in `src` | Repository noise | Move/archive only with explicit approval |

## Product Priorities

| Priority | Focus | Reason |
|---|---|---|
| P0 | Privacy, RLS, stock integrity, delete/refund idempotency | Trust foundation |
| P1 | Offline/sync, mobile PDF, mobile modals, duplicate submits | Reliability foundation |
| P2 | Timeline, global search, data health, firearm profile, onboarding | Cohesion and retention |
| P3 | Advanced analytics, chrono import, coach/team workflows, premium reports | Differentiation and monetization |

## Product Conclusion

The largest commercial opportunity is not more isolated features; it is a unified, trustworthy shooting data system. Before premium analytics or team workflows, the app must prove privacy, stock integrity, offline sync, mobile behaviour, and delete/refund safety.