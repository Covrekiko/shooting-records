# Full App Security and RLS Audit

Read-only audit only. No schema, RLS, backend, frontend, or permission changes were made.

## Executive Summary

Static entity inspection found 46 Base44 entity schemas. Most do not declare explicit RLS rules. Some entities with explicit RLS use patterns that require careful verification. Frontend code contains many direct `base44.entities` calls and frontend `created_by` filters. Because no multi-user runtime execution was performed, cross-user privacy cannot be marked pass.

## Critical Security Status

| Area | Status | Reason |
|---|---|---|
| User A/User B isolation | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Needs two real users and direct ID tests |
| Admin-only route denial | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Needs normal user direct URL/function execution |
| Entity RLS correctness | NOT TESTED | Static schema only; runtime enforcement not executed |
| Service-role backend business authorization | NOT TESTED | Must test per function with unauthorized records |
| Share-token privacy | BLOCKED — REQUIRES MULTI-USER EXECUTION | Area sharing and client logs need separate users |
| Frontend-only filtering safety | NOT TESTED | Must test broad list/filter/get by another user |

## Entity RLS Inventory Summary

| Entity | Explicit RLS | Static Risk |
|---|---|---|
| AmmoSpending | No | Must verify platform default isolation and direct get/list privacy |
| Ammunition | Yes | RLS structure appears unusual: `created_by` combined with `$or`; must runtime-test normal/admin access |
| Area | No | Map boundary privacy must be tested |
| AreaShare | No | Share-token and owner/invitee access high privacy risk |
| AuditLog | No | Audit data could expose user/entity/action details if defaults insufficient |
| BallisticProfile | No | User ballistic/firearm data privacy risk |
| BetaFeedbackComment | No | Feedback comments may expose user info |
| BetaFeedbackPost | No | Feedback/admin visibility must be tested |
| BrassMovementLog | No | Reloading stock history privacy/data integrity risk |
| BulletReference | No | Reference/catalog entity likely public-like, but access intent not documented |
| ClayScorecard | No | Personal scorecard privacy risk |
| ClayShooting | No | Session privacy risk |
| ClayShot | No | Linked score data privacy risk |
| ClayStand | No | Linked score data privacy risk |
| CleaningHistory | No | Firearm maintenance privacy risk |
| Club | No | User club/location privacy risk |
| DeerLocation | No | Sensitive location privacy risk |
| DeerManagement | No | Hunting session privacy risk |
| DeerOuting | No | GPS/outing privacy risk |
| Goal | No | User goal privacy risk |
| Harvest | No | Sensitive harvest/GPS privacy risk |
| MaintenanceAlert | Yes | RLS structure must be runtime-tested |
| MapMarker | No | High sensitivity: POIs/high seats/harvest locations |
| Reloading* catalog entities | No | Catalogs may be safe public data if intentionally shared; intent not explicit |
| ReloadingComponent | No | User stock/inventory privacy risk |
| ReloadingInventory | No | User stock/inventory privacy risk |
| ReloadingSession | No | Reloading batch privacy/stock linkage risk |
| ReloadingStock | No | Stock privacy risk |
| ReloadingTest | No | Load test privacy risk |
| ReloadingTestResult | No | Chronograph/results privacy risk |
| ReloadingTestVariant | Yes | Recent RLS exists; must verify all roles and owner/admin access |
| Rifle | No | Firearm inventory privacy risk |
| ScopeDistanceData | No | Scope profile linked private data risk |
| ScopeProfile | No | Firearm/scope private data risk |
| ScopeReference | No | Reference/catalog likely public-like, but intent not explicit |
| SessionRecord | No | Central private activity record risk |
| SharedClientOutingLog | No | Shared live outing/privacy risk |
| Shotgun | No | Firearm inventory privacy risk |
| TargetGroup | No | Target data privacy risk |
| TargetPhoto | No | Uploaded target photo metadata privacy risk |
| TargetSession | No | Target analyzer session privacy risk |
| TargetShooting | No | Session privacy risk |
| User | Built-in | Built-in admin protections expected, but custom role logic must be tested |

## Static Security Findings

| Finding | Status | Evidence | Risk |
|---|---|---|---|
| Many entities lack explicit RLS | VERIFIED FAIL | Static schema inspection | Privacy depends entirely on platform defaults; intent undocumented |
| Direct `base44.entities` calls are widespread | VERIFIED PASS inventory | 397 direct references counted | Frontend filtering may be relied on inconsistently |
| `getRepository` usage is limited compared with direct calls | VERIFIED PASS inventory | 59 references counted | Offline/security/data-loading divergence |
| Service-role backend functions exist | VERIFIED PASS inventory | Functions include `asServiceRole` | Must verify each function enforces ownership/business rules |
| Admin UI duplication exists | VERIFIED PASS inventory | `/admin/users`, `/users`, admin beta pages | Hidden buttons not security |
| Share token flows exist | VERIFIED PASS inventory | `AreaShareAccept`, area sharing entities | Multi-user privacy not executed |

## Backend Function Security Inventory

| Function | Auth Check | Service Role | Status | Security Risk |
|---|---|---|---|---|
| analyzeTargetPhoto | Yes | No | NOT TESTED | AI/file input validation not executed |
| analyzeTargetPhotoWithAI | Yes | No | NOT TESTED | AI/file input validation not executed |
| attachWeatherToSessionRecord | No | Yes | NOT TESTED | Service-role webhook-style mutation must validate target record ownership/authenticity |
| auditRLSViolation | Yes | Yes | NOT TESTED | Audit log service-role writes; access must be admin-safe |
| backfillReloadBatchAmmo | Yes | Yes | NOT TESTED | Admin/business authorization required |
| createAmmunitionForUser | Yes | No | NOT TESTED | Ownership rules must be verified |
| createMaintenanceAlertsFromSession | No | Yes | NOT TESTED | Unauthenticated callable risk unless automation-only protected |
| createReloadBatchWithAmmunition | Yes | Yes | NOT TESTED | Must verify user can only mutate own components/ammo |
| createUserWithProfile | Yes | Yes | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Admin-only enforcement must be runtime-tested |
| deleteAmmunitionForUser | Yes | Yes | NOT TESTED | Ownership and linked data cleanup must be tested |
| deleteReloadedAmmunitionWithSessionCleanup | Yes | Yes | NOT TESTED | Ownership and double delete must be tested |
| deleteSessionRecordWithRefund | Yes | Yes | NOT TESTED | Ownership/refund integrity critical |
| getGoogleMapsApiKey | No | No | NOT TESTED | Public key exposure may be intended; rate/restriction must be reviewed |
| listAmmunitionForUser | Yes | Yes | NOT TESTED | Must verify only caller's ammo returned |
| markFirearmCleanedForUser | Yes | Yes | NOT TESTED | Must verify firearm ownership |
| updateUserRole | Yes | Yes | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION | Admin-only enforcement must be runtime-tested |
| deleteMyAccount | Yes | Yes | NOT TESTED | Destructive cleanup privacy/data-loss risk |

## Required RLS Test Matrix

For every private entity:

| Test | Expected | Status |
|---|---|---|
| User A creates record | Succeeds for allowed role | BLOCKED — REQUIRES ROLE-SPECIFIC EXECUTION |
| User B `list` | Does not see User A record | BLOCKED |
| User B `filter` by broad query | Does not see User A record | BLOCKED |
| User B direct `get(id)` | Denied/not found | BLOCKED |
| User B direct `update(id)` | Denied | BLOCKED |
| User B direct `delete(id)` | Denied | BLOCKED |
| Admin list/get/update/delete | Allowed only where intended | BLOCKED |
| Public/unauthenticated access | Denied unless intentionally public | BLOCKED |

## Frontend Filtering Risks

Static scan shows many frontend calls filter by `created_by: user.email`. That may be correct for query efficiency but must not be the only privacy layer. Every broad list/direct get/update/delete requires RLS or backend authorization proof.

Examples observed include direct Base44 calls in:

- `src/context/OutingContext.jsx`
- `src/pages/Equipment.jsx`
- `src/pages/ScopeClickCard.jsx`
- `src/pages/Reports.jsx`
- `src/pages/Goals.jsx`
- `src/pages/DeerStalkingLogs.jsx`
- `src/pages/AmmoSummary.jsx`
- `src/pages/AreaShareAccept.jsx`

## Privacy-Sensitive Data

| Data Type | Entities / Modules | Status | Risk |
|---|---|---|---|
| Firearm inventory | `Rifle`, `Shotgun`, scope profiles | BLOCKED | Personal firearm data exposure |
| Hunting/GPS | `DeerOuting`, `Harvest`, `Area`, `MapMarker`, `SharedClientOutingLog` | BLOCKED | High sensitivity location exposure |
| Ammunition/reloading inventory | `Ammunition`, `ReloadingComponent`, `ReloadingSession` | BLOCKED | Private inventory/cost data exposure |
| Photos/files | `TargetPhoto`, result photos, feedback screenshots | BLOCKED | File URL access and ownership not tested |
| Admin/user roles | `User`, admin pages/functions | BLOCKED | Privilege escalation risk |
| Audit logs | `AuditLog` | BLOCKED | Logs may expose private metadata |

## Security Roadmap Requirements

P0 before growth:

1. Define explicit RLS intent for every private entity.
2. Add automated User A/User B privacy tests for list/filter/get/update/delete.
3. Test every service-role backend function with unauthorized record IDs.
4. Verify admin-only functions with normal user direct invocation.
5. Review share-token access model and revocation.
6. Review file URL privacy for photos/screenshots/PDFs.
7. Document which catalog/reference entities are intentionally public-like.

## Overall Security Status

`BLOCKED` / `NOT TESTED` for runtime privacy. Static audit finds incomplete explicit RLS coverage and broad direct entity access patterns that require urgent verification.