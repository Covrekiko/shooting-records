# Full App Recommended Roadmap

Read-only roadmap only. No implementation authorised or performed.

## P0 — Must Prove Or Fix Before Growth

| Item | Problem | Evidence | Proposed Future Change | Files / Modules Affected | Schema Impact | Regression Risk | Dependency | Complexity | Test Requirement |
|---|---|---|---|---|---|---|---|---|---|
| RLS/privacy proof | Many entities lack explicit RLS and multi-user privacy is unproven | 46 entities, many no explicit RLS | Define RLS intent and add User A/User B tests | All `base44/entities`, admin/user flows | Possible | High | Test users | High | list/filter/get/update/delete by User A/User B/admin |
| Stock/refund idempotency | Multi-entity stock operations unproven | Reload/session/delete functions and direct UI writes | Establish authoritative mutation paths and idempotency tests | Target, Clay, Deer, Reloading, Records, backend functions | Possible | High | Test data factory | High | Duplicate checkout/delete/refund tests |
| Service-role backend authorization | Functions use service role | Backend inventory | Verify ownership/business checks per function | `base44/functions/*` | None/possible | High | Role tests | Medium/High | Unauthorized record ID invocation |
| Offline/direct CRUD split | 397 direct Base44 refs vs 59 repository refs | Static scan | Map and migrate only after tests | Many pages/components | None | High | Offline test harness | High | Offline create/edit/delete/reconnect |
| Automated critical flow tests | No clear E2E/unit suite found | Test inventory | Add E2E and unit tests before feature growth | App-wide | None | Medium | Test runner setup | High | 14 critical flows from audit |
| Account deletion safety | Destructive cleanup path unproven | `deleteMyAccount` function | Add dry-run/report mode and tests | Account/admin/entities | Possible | High | Privacy map | Medium | Delete account with full data graph |

## P1 — Reliability

| Item | Problem | Evidence | Proposed Future Change | Files / Modules Affected | Schema Impact | Regression Risk | Dependency | Complexity | Test Requirement |
|---|---|---|---|---|---|---|---|---|---|
| Offline sync validation | Sync queue behaviour unproven | Offline architecture exists but runtime not executed | Build deterministic offline test plan | `offlineDB`, `syncQueue`, `syncEngine`, pages | Possible | High | P0 data model clarity | High | Network loss, replay, conflict, TTL |
| Mobile/TestFlight verification | Device-only flows blocked | Camera/GPS/PDF/share/safe-area blocked | Device matrix and regression checklist | Modals, maps, PDFs, camera | None | Medium | TestFlight access | Medium | iPhone portrait/native/PWA tests |
| PDF/export app-wide hardening | Multiple PDF implementations | Static PDF scan | Standardise after inventory; add export tests | Records, Reports, Load Dev, Clay, QR | None | Medium | Mobile PDF tests | Medium | Preview/download/share/cancel tests |
| Form duplicate-submit audit | 584 buttons / 62 submits | Static counts | Add duplicate-submit guards where missing after mapping | All forms | None | Medium | E2E harness | Medium | Rapid double tap tests |
| Lint failure cleanup | Lint fails | `npm run lint` exit 1; unused imports | Separate cleanup-only milestone | Many files | None | Low/Medium | Freeze feature work | Low | Lint pass after changes |
| Dependency vulnerability review | 24 vulnerabilities reported | `npm install`/audit | Review `npm audit`; controlled updates | package/deps | None | Medium/High | Dependency policy | Medium | Build/regression after updates |
| Admin route enforcement | Admin pages exist; runtime denial unproven | Routes and functions | Verify server-side denial, not UI hiding | admin pages/functions | Possible | High | Role test users | Medium | Normal user direct URL/function call |
| Map/GPS reliability | Field map critical and blocked | Stalking map/GPS files | Device field test protocol | Stalking map, tracking service | Possible | High | Device/location | High | GPS permission/background/offline map |

## P2 — Product Improvement

| Item | Problem | Evidence | Proposed Future Change | Files / Modules Affected | Schema Impact | Regression Risk | Dependency | Complexity | Test Requirement |
|---|---|---|---|---|---|---|---|---|---|
| Universal Activity Timeline | App is module-fragmented | Product gap analysis | Add unified chronological activity feed | Dashboard, records, sessions, reloads, outings | Possibly index entity | Medium | Stable links | Medium | Timeline across all modules |
| Global Search | Data retrieval spread across modules | Many entities/modules | Search across firearms, ammo, reloads, records, outings | App-wide | Possible search index | Medium | Entity map | Medium | Search accuracy/security tests |
| Data Health Center | Orphans/stock mismatches invisible | Data integrity risks | Read-only diagnostics for mismatches/orphans | Armory, records, reloading | Possible | Low/Medium | Integrity rules | Medium | Seeded mismatch tests |
| Unified Firearm Profile | Firearm history scattered | Product gap | Combine sessions, counters, maintenance, loads, zero | Armory, records, load dev, scope | Possible | Medium | Link integrity | Medium | Firearm profile data tests |
| Notification Center | Important events scattered | Alerts/low stock/sync exist separately | Unified notification inbox | Maintenance, stock, sync, goals | Possible | Medium | Rules | Medium | Trigger/read/dismiss tests |
| Better onboarding | Broad app scope may confuse users | Module system | Module-based onboarding/checklists | Dashboard/ProfileSetup | Possible | Low | Product copy | Low/Medium | New user flow tests |
| Recently Deleted / Undo | Destructive deletes high risk | Delete/refund complexity | Soft-delete/undo after delete audit | Entities/functions | Yes likely | High | P0 delete audit | High | Restore/refund idempotency tests |

## P3 — Premium Differentiation

| Item | Problem | Evidence | Proposed Future Change | Files / Modules Affected | Schema Impact | Regression Risk | Dependency | Complexity | Test Requirement |
|---|---|---|---|---|---|---|---|---|---|
| Cross-module analytics | Data exists but consistency unproven | Load comparison and reports | Load vs target performance, lot vs group size, cleaning vs accuracy | Analytics, reports, load dev, records | Possible | High | P0/P1 proof | High | Analytics fixture tests |
| Chronograph import | Manual chrono entry burden | Load Dev V2 manual editor | Import Garmin/LabRadar/MagnetoSpeed/CSV | Load Development | Possible | Medium | File import parser | Medium/High | Parser fixtures and legacy tests |
| Proven Load Lifecycle | Reloading/load testing not fully unified | Product gap | Experimental→Proven→Batch→Inventory→Performance | Reloading, Load Dev, Records | Yes likely | High | Link integrity | High | Full lifecycle E2E |
| Coach/reviewer workflow | Sharing limited | Product gap | Invite reviewer/coach for selected sessions | Auth/sharing/RLS | Yes | High | Privacy/RLS proof | High | Multi-user sharing tests |
| Team/shared area workflow | Stalking teams need collaboration | AreaShare exists | Harden shared area/team permissions | Stalking map/share | Yes | High | P0 privacy | High | Owner/invitee/revoke tests |
| Professional report suite | Reports can become subscription value | Multiple PDFs exist | Branded reports, export bundles, audit logs | Reports/PDF modules | Possible | Medium | PDF reliability | Medium | App-wide PDF tests |

## Sequencing Recommendation

1. Freeze new feature work until P0 privacy/stock/offline test harness exists.
2. Prove RLS and service-role function authorization.
3. Prove stock/refund idempotency for Target, Clay, Deer, Reloading.
4. Prove offline sync in deterministic scenarios.
5. Run mobile/TestFlight verification for GPS/camera/PDF/modals.
6. Only then start product additions such as Analysis, timeline, global search, notification center, or premium analytics.

## Next Recommended Action

Run a focused P0 verification sprint with seeded test data and role-specific execution:

- User A/User B privacy matrix.
- Stock/refund idempotency matrix.
- Backend service-role authorization matrix.
- Offline replay matrix.

No product expansion should start until those are proven or fixed.