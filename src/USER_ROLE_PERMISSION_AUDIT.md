# User Role / Permission Audit

Date: 2026-05-03  
Scope: read-only audit of recent fixes and ownership paths for admin, existing normal users, and brand-new normal users.

## Important lock confirmations

No code logic was changed as part of this audit.  
No database/entity schemas were changed.  
No stock model, brass lifecycle maths, refund/delete logic, routing, auth, GPS/maps, PDFs, manifest, service worker, or Base44 config was changed.

## Files inspected

### GitHub repository
- `https://github.com/Covrekiko/shooting-records`

### Entity schemas / permissions inspected
- `entities/Ammunition.json`
- `entities/ReloadingComponent.json`
- `entities/ReloadingSession.json`
- `entities/AmmoSpending.json`
- `entities/BrassMovementLog.json`
- `entities/Rifle.json`
- `entities/Shotgun.json`
- `entities/TargetShooting.json`
- `entities/ClayShooting.json`
- `entities/DeerManagement.json`
- `entities/SessionRecord.json`
- `entities/User.json`

### Frontend / shared logic inspected
- `pages/settings/AmmunitionInventory`
- `pages/settings/Ammunition`
- `pages/settings/Rifles`
- `pages/ReloadingManagement`
- `pages/Records`
- `pages/Profile`
- `components/reloading/ReloadBatchForm`
- `components/reloading/ComponentManager`
- `components/reloading/ReloadingStockInventory`
- `components/RecordsSection`
- `lib/ammoUtils.js`
- `lib/reloadingDeleteUtils.js`
- `lib/brassLifecycle.js`

### Backend functions inspected
- `functions/deleteSessionRecordWithRefund`
- `functions/restoreSessionStock`
- `functions/updateUserRole`

### Missing function path
- `functions/createReloadBatchAmmunition` was requested in the audit list but does not exist in the current app.

## Entity permission findings

| Entity | Explicit RLS found | Normal user risk | Notes |
|---|---:|---:|---|
| Ammunition | Yes | High | Explicit RLS exists. It appears intended to allow owner access and admin access, but the structure must be verified live because if interpreted as `created_by AND admin`, normal users will be blocked from create/update/delete. This is the biggest risk area. |
| ReloadingComponent | No explicit RLS in inspected schema | Medium | Frontend filters by `created_by`. If platform default is owner-scoped CRUD, normal users should work. If defaults are restrictive, component creation/update may fail. |
| ReloadingSession | No explicit RLS in inspected schema | Medium | Frontend creates sessions directly and filters by `created_by`. |
| AmmoSpending | No explicit RLS in inspected schema | Medium | Created directly from frontend during ammo usage. If defaults are restrictive, spending logs may fail silently because errors are caught. |
| BrassMovementLog | No explicit RLS in inspected schema | Medium | Created directly from frontend by brass lifecycle helpers. If defaults are restrictive, brass movement history may fail. |
| Rifle | No explicit RLS in inspected schema | Low/Medium | Frontend creates/updates directly and filters by `created_by`. |
| Shotgun | No explicit RLS in inspected schema | Low/Medium | Same pattern as Rifle. |
| SessionRecord | No explicit RLS in inspected schema | Low/Medium | Frontend creates/updates directly and filters by owner for normal users. |
| User | Built-in/special | Expected | Normal users can access/update self; admin can manage others. `updateUserRole` correctly requires admin. |

## Backend function permission findings

| Function | Admin-only? | Uses service role? | Ownership check | Finding |
|---|---:|---:|---:|---|
| `deleteSessionRecordWithRefund` | No | Yes | Yes, checks `record.created_by === user.email` | Suitable for normal users deleting their own records. Safer than frontend-only delete/refund. |
| `restoreSessionStock` | No | Yes | Partial/missing direct ownership check on loaded session | Can restore stock with service role. Should verify session ownership before restoring if used broadly. |
| `updateUserRole` | Yes | Yes | Admin role check | Correct admin-only function. |
| `createReloadBatchAmmunition` | N/A | N/A | N/A | Not present. Reload batch creation currently happens directly in frontend. |

## Direct frontend create/update/delete actions found

| Area | Direct entity actions from frontend | Permission risk |
|---|---|---:|
| Add Ammunition | `Ammunition.create`, `Ammunition.update`, `Ammunition.delete` | High due explicit Ammunition RLS ambiguity. |
| Ammunition Inventory | `Ammunition.create`, `Ammunition.update`, `Ammunition.delete/update archive` | High due explicit Ammunition RLS ambiguity. |
| Add Rifle | `Rifle.create`, `Rifle.update`, `Rifle.delete` | Medium/likely OK if platform owner defaults apply. |
| Add Brass / Components | `ReloadingComponent.create/update/delete` | Medium/likely OK if platform owner defaults apply. |
| Create Reload Batch | `ReloadingComponent.update`, `ReloadingSession.create`, `Ammunition.create`, `BrassMovementLog.create` | High because batch creates linked Ammunition directly from frontend. |
| Ammo usage in checkout | `Ammunition.update`, `AmmoSpending.create`, brass lifecycle updates | High because errors in `decrementAmmoStock()` are caught/logged, which can silently leave stock unchanged. |
| Record delete from Records UI | Frontend refund/update helpers, soft delete SessionRecord | High/medium because it relies on direct frontend updates instead of the safer existing backend function. |
| ReloadingSession delete | `deleteReloadBatchWithRestore()` frontend helper uses direct entity updates | Medium/high if any related entity permissions block normal users. |
| Profile tab reset | Frontend tab history/navigation only | Low. No role-specific storage issue found. |
| iPhone UI layout | CSS/shared components only | Low. Role-independent. |

## Ownership / filtering findings

1. Most user-owned lists correctly filter by `created_by: currentUser.email`.
2. `ReloadingManagement` loads sessions with `created_by: user.email` and hides deleted sessions.
3. `ComponentManager` and `ReloadingStockInventory` load `ReloadingComponent` with `created_by: currentUser.email`.
4. `RecordsSection` loads `SessionRecord`, `Rifle`, `Shotgun`, `Club`, and `Area` with the current user email.
5. `pages/Records` lets admins see all records, while normal users are filtered to their own records.
6. `lib/reloadingDeleteUtils.js` has one broad `Ammunition.list('-updated_date', 500)` and then filters in JavaScript. This is probably safe if entity permissions restrict reads; however, for clarity and performance it should prefer current-user filtering if changed later.
7. No manual `created_by` assignment is needed in create payloads because Base44 supplies it automatically.
8. Brand-new users should have empty lists, not shared stock, as long as entity read permissions remain owner-scoped.

## Error handling findings

| Area | Error visibility |
|---|---|
| Add Ammunition / Add Rifle / Add Component | Shows alerts or logs errors; generally visible. |
| `decrementAmmoStock()` | Catches and logs errors only; checkout may continue even if stock decrement/spending log fails. This can hide normal-user permission failures. |
| `restoreAmmoStock()` | Catches and logs errors only; delete/refund callers may think restore worked when it did not. |
| `RecordsSection` delete | Shows some alerts, but relies on helper return values that may hide swallowed errors. |
| Backend functions | Return clear errors. Safer path for permission-sensitive restore/delete work. |

## Feature test matrix from static audit

Legend:  
PASS = expected to work from inspected code/permissions.  
FAIL/RISK = likely or possible failure requiring live role test or minimal fix.  
N/A = not role-dependent.

| Feature | Admin user | Existing normal user | Brand-new normal user | Audit finding |
|---|---|---|---|---|
| A. Add factory ammunition | PASS | FAIL/RISK | FAIL/RISK | Direct `Ammunition.create`; explicit Ammunition RLS may block normal users. |
| B. Add rifle | PASS | PASS/RISK | PASS/RISK | Direct `Rifle.create`; no explicit restrictive RLS seen. |
| C. Add brass/component | PASS | PASS/RISK | PASS/RISK | Direct `ReloadingComponent.create`; no explicit restrictive RLS seen. |
| D. Create reload batch | PASS | FAIL/RISK | FAIL/RISK | Directly updates components, creates `ReloadingSession`, creates `Ammunition`, logs brass movement. Ammunition create is the high-risk step. |
| E. Reloaded ammo appears in Ammunition Inventory | PASS | FAIL/RISK | FAIL/RISK | If reloaded Ammunition creation fails, it cannot appear. If created successfully, owner filtering should show it. |
| F. Reloaded ammo appears in Target/Deer checkout | PASS | FAIL/RISK | FAIL/RISK | Depends on reloaded Ammunition creation and owner-visible inventory loading. |
| G. Delete Target/Clay/Deer record restores ammo and reverses counters | PASS | FAIL/RISK | FAIL/RISK | Existing backend function is safer, but current UI paths still use frontend helper updates in some places. Direct `Ammunition.update` and firearm updates may be blocked or errors may be swallowed. |
| H. Delete ReloadingSession restores components/brass | PASS | PASS/RISK | PASS/RISK | Frontend helper uses owner-scoped entity calls. Should work if defaults permit owner updates; risk if related Ammunition update is restricted. |
| I. Delete reloaded ammo cleans linked ReloadingSession | PASS | FAIL/RISK | FAIL/RISK | Uses direct Ammunition archive/update plus ReloadingSession update; Ammunition RLS is the risk. |
| J. Profile tab reset | PASS | PASS | PASS | Role-independent navigation/state behaviour. No permission issue found. |
| K. iPhone UI layout | PASS | PASS | PASS | Role-independent shared UI/CSS fix. |

## Root cause of any admin-only behaviour

The likely root cause is the explicit RLS on `Ammunition` combined with direct frontend calls to `Ammunition.create/update/delete` in normal-user flows.

Affected flows include:
- Add factory ammunition.
- Create reload batch, because it creates linked reloaded ammunition directly from the frontend.
- Checkout ammo usage, because stock decrement updates Ammunition directly.
- Record delete/refund, because some UI paths restore stock directly instead of always using the existing backend function.
- Delete reloaded ammunition / delete reload session, because linked ammo is archived/updated directly.

A second root cause is swallowed errors in `lib/ammoUtils.js` for stock decrement/restore. Permission failures can be logged to console but not always surfaced to the user.

## Minimal fix plan if live testing confirms failures

Do not change schemas unless explicitly approved.

Recommended smallest safe fixes, in order:

1. Use existing backend function path for record delete/refund where available.
   - Prefer `deleteSessionRecordWithRefund` for Target/Clay/Deer record deletion.
   - It already authenticates the user, uses service role, and checks ownership.

2. If Ammunition RLS blocks normal users, avoid weakening global permissions first.
   - Add or reuse a backend function for permission-sensitive stock actions that verifies ownership before service-role updates.
   - Candidate actions: create factory ammunition, create reload batch linked ammunition, decrement stock, restore stock, archive/delete reloaded ammunition.

3. Add clear error messages where stock operations currently swallow errors.
   - `decrementAmmoStock()` and `restoreAmmoStock()` should return/throw meaningful failures if permission denied.

4. Keep current owner isolation.
   - Do not make all users admins.
   - Do not expose other users' records or stock.
   - Continue filtering by `created_by: currentUser.email` for normal users.

5. Only if the user explicitly says “I approve database/schema changes”, adjust entity RLS safely.
   - Smallest schema-level change would be to make Ammunition RLS clearly allow owner CRUD and admin CRUD, without exposing cross-user data.

## Files that must not be touched without explicit approval

- `App.jsx`
- Auth redirect logic
- Routing
- Manifest
- Service worker
- Base44 config
- Maps/GPS code
- PDF generation/layout code
- Theme/icons/design code
- Database/entity schemas
- Global stock model/database
- Brass lifecycle maths
- Ammunition/reloading stock calculations
- Existing delete/refund logic unless applying an approved minimal permission fix

## Audit conclusion

The UI-only recent fixes are role-independent and should apply equally to admin, existing normal users, and brand-new normal users.

The highest permission risk is not the UI fixes; it is the Ammunition entity permission path and direct frontend stock operations. Admin users are expected to pass all tested flows. Normal and brand-new users are at risk of failure specifically anywhere `Ammunition.create/update/delete` is called directly, especially Add Ammunition and Create Reload Batch.

No implementation fix was applied yet, per instruction.