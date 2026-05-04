# ONE APP USER/ADMIN AUDIT

## Decision
This app must remain one app. Admin and normal users must use the same core app pages and data flows. Admin-only behavior must be limited to user management.

## GitHub repository inspection
Repository inspected: `https://github.com/Covrekiko/shooting-records`.
Key GitHub findings matched the local app for the important paths checked:
- `src/lib/ammoUtils.js` in GitHub still used direct `base44.entities.Ammunition.get/update` for checkout stock changes.
- `src/pages/Dashboard.jsx` in GitHub had a separate admin branch that loaded `User.list()` and skipped the normal dashboard analytics setup.
- `src/App.jsx` in GitHub shows routes are shared; admin-only pages are separate routes.

## Places admin/user logic was split incorrectly
1. `pages/Dashboard`
   - Root cause: `loadData()` had a separate `if (currentUser.role === 'admin')` branch.
   - Admin dashboard loaded `User.list()` and admin stats instead of using the same normal user dashboard data.
   - This violates the one-app rule because admin sees a different core dashboard logic path.
   - Minimal fix: remove the admin dashboard branch and always load the current user’s own records/equipment for normal dashboard widgets.
   - Admin user-management remains accessible separately through `/admin/users`.

2. `context/ModulesContext.jsx` + `App.jsx`
   - `ModuleGate` itself no longer blocks because it always returns children after loading.
   - However, `ModulesContext` sets `enabledModules` to `undefined` for users without module preferences.
   - `App.jsx` then shows `ModuleOnboarding` when `enabledModules === undefined`, which can block brand-new users from core app access.
   - Minimal fix without touching `App.jsx`: default users with no module settings to all modules in `ModulesContext`.

3. `pages/Users` and `pages/admin/Users`
   - Both are admin-only user management pages.
   - This is allowed by the requirement because user management is the only admin-only area.
   - No core feature is duplicated here.

## Places normal users were blocked
1. Brand-new users could be blocked by module onboarding because `enabledModules` became `undefined`.
2. Core route `ModuleGate` is not currently blocking normal users because it returns children.
3. Admin pages correctly block normal users:
   - `/users`
   - `/admin/users`

## Places service-owned records were possible
1. Historical data shows service-owned ammunition records exist from earlier flows/tests.
2. Current `createAmmunitionForUser` uses user-scoped `base44.entities.Ammunition.create(payload)`, so new normal-user ammunition is owned by the current logged-in user.
3. Current `createReloadBatchWithAmmunition` uses user-scoped creates for:
   - `ReloadingSession.create`
   - `Ammunition.create`
   This means new reload sessions and linked reloaded ammo are owned by the current logged-in user.
4. Service role is used inside backend functions only after ownership checks for protected updates/deletes. That is acceptable.

## Direct entity calls that bypass shared functions
### Ammunition
- `pages/settings/AmmunitionInventory`: uses shared `createAmmunitionForUser`, `updateAmmunitionForUser`, `deleteAmmunitionForUser`, and `loadOwnedAmmunitionWithReloads`. Correct.
- `pages/settings/Ammunition`: uses the same shared ammunition create/update/delete functions and loader. Correct.
- `components/AmmoStockWidget`: now uses `loadOwnedAmmunitionWithReloads`. Correct.
- `lib/ammoUtils.js`: previously used direct `Ammunition.get/update` during checkout. This was the checkout permission/404 root cause. It has been changed to use `loadOwnedAmmunitionWithReloads` and `updateAmmunitionForUser`.

### Reloading
- `components/reloading/ReloadBatchForm`: uses `createReloadBatchWithAmmunition`. Correct.
- `functions/createReloadBatchWithAmmunition`: owns all created reload session/ammunition records as the current user. Correct.
- `components/reloading/ComponentManager`, `AddComponentModal`, `AddBrassModal`: use current user entity create/update/delete for the user’s own components. This is acceptable because reloading components are normal user-owned records and not admin-only.

### Records/delete/refund
- `pages/Records`: deletes via `deleteSessionRecordWithRefund`. Correct.
- `functions/deleteSessionRecordWithRefund`: uses service role only after verifying `record.created_by === user.email`. Correct.
- `functions/restoreSessionStock`: also verifies session ownership before restoring. Mostly legacy/edit path; acceptable.

### Firearm/shotgun counters during checkout
- `pages/TargetShooting`, `pages/ClayShooting`, `pages/DeerManagement` still update Rifle/Shotgun counters directly from the frontend using user-scoped entity calls.
- This does not expose other users’ data because the user SDK is scoped and records are fetched from the current user’s data.
- It is not ideal for a single backend checkout transaction, but it is not an admin/user split.
- Minimal confirmed fix in this pass: ammunition stock changes are unified through the shared owned-ammo/update function path. A later deeper refactor can move firearm counters and session completion into one backend checkout function if approved.

## Pages/modals using different loaders
- Ammunition Inventory: `loadOwnedAmmunitionWithReloads`.
- Ammunition Management: `loadOwnedAmmunitionWithReloads`.
- Dashboard ammo widget: `loadOwnedAmmunitionWithReloads`.
- Target/Clay/Deer ammunition selectors: `loadOwnedAmmunitionWithReloads`.
These are now aligned.

## Exact root cause: user ammunition disappearing
The dashboard/widget and checkout paths previously did not consistently use the same user-owned ammunition loader. Direct `Ammunition.get/update` calls could fail for normal users or stale IDs, while the inventory page showed data via a different loader. The app now uses `loadOwnedAmmunitionWithReloads` for visible ammo lists and checkout stock lookup.

## Exact root cause: checkout permission error
`lib/ammoUtils.js` used direct `base44.entities.Ammunition.get(ammunitionId)` and `Ammunition.update(...)`. For normal users, this could fail with 404/permission behavior when the selected ammo was only visible through the shared owned-ammo/reload loader or when the record was stale/deleted. Checkout now resolves ammo through `loadOwnedAmmunitionWithReloads(currentUser)` and updates through `updateAmmunitionForUser`.

## Exact root cause: reloaded ammo not showing
Reloaded ammo visibility depended on matching ownership/reload session links. Any page not using `loadOwnedAmmunitionWithReloads` could miss linked reloaded ammo. The major ammunition displays and selectors now use that loader.

## Minimal fix plan
1. Keep admin/user as one app.
2. Remove Dashboard’s separate admin core-data branch.
3. Default missing modules to all modules in `ModulesContext` so brand-new normal users are not blocked.
4. Keep admin-only user management pages/admin nav only for admins.
5. Keep ammunition create/update/delete/list through shared functions/loader.
6. Keep reloading batch creation through `createReloadBatchWithAmmunition`.
7. Keep record deletion through `deleteSessionRecordWithRefund`.
8. Do not touch schemas, App.jsx routing/auth redirect, manifest, service worker, maps/GPS, PDFs, colours, icons, or layout.

## Acceptance test plan
Because this environment cannot actually log in as three separate real accounts from chat, runtime validation must be based on code paths and available runtime logs.
- Admin: should load same Dashboard own-data path and still see admin/user-management links.
- Existing normal user `geazifilhoamorimferreira@gmail.com`: should load all core pages because ModuleGate does not block and missing module settings default to all modules.
- Brand-new normal user: should not be stopped by module onboarding because missing modules default to all modules.