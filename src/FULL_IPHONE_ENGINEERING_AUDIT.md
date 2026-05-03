# FULL IPHONE ENGINEERING AUDIT

## 1. Files inspected

Repository/app structure was inspected from the current Base44 project and the GitHub repository page at `https://github.com/Covrekiko/shooting-records`.

Inspected files:
- `utils/caliberCatalog.js`
- `lib/ammoUtils.js`
- `utils/ammoLabels.js`
- `components/MobileTabBar`
- `context/TabHistoryContext.jsx`
- `pages/settings/AmmunitionInventory`
- `pages/settings/Ammunition`
- `pages/settings/Rifles`
- `components/AddRifleForm`
- `components/reloading/AddBrassModal`
- `components/reloading/ReloadBatchForm`
- `components/ManualRecordModal`
- `components/UnifiedCheckoutModal`
- `pages/TargetShooting`
- `pages/DeerManagement`
- `pages/ClayShooting`
- `components/scope/UserAmmoSelector`
- `components/load-development/CreateTestModal`
- `components/load-development/VariantFormModal`
- `components/AmmoEditModal`
- `components/AmmoStockWidget`
- `functions/createReloadBatchAmmunition`
- `components/scope/ScopeProfileForm`
- `components/target-analysis/BallisticCalculator`
- `pages/ScopeClickCard`

## 2. Bugs confirmed

### 1. Global calibre database is not used everywhere
Confirmed. A shared `CALIBER_CATALOG` and `searchCalibers()` already exist in `utils/caliberCatalog.js`, but there is no exported canonical `normalizeCaliber(value)` helper. Some files use manual text inputs and some use local, inconsistent normalizers.

### 2. Reloaded .308 ammunition not appearing in checkout
Confirmed likely root cause. `lib/ammoUtils.js` uses a local normalizer that strips `Win/Winchester` and dots. It handles some `.308` cases but is not shared with the global catalogue and does not canonicalize values like `.308`, `308`, `.308 Win`, and `.308 Winchester` to one value. Checkout uses this helper in Target/Deer, so mismatches can hide valid reloaded ammo.

### 3. Ammunition Inventory bottom tab highlights Armory
Confirmed intentional by current mapping. `context/TabHistoryContext.jsx` maps `/settings/ammunition-inventory` to the `armory` tab. `MobileTabBar` also forces the Armory tab to always navigate to `/ammo-summary`. This is consistent and avoids accidentally opening Reloading. No functional bug confirmed here.

### 4. New/different users on iPhone cannot add ammunition
Confirmed risk in `pages/settings/AmmunitionInventory`: numeric fields are initialized as numbers and `onChange` immediately converts empty input to `0`, which is poor on iPhone and can send forced values while editing. Save also sends raw `formData` without calibre normalization or explicit numeric cleanup. Permission handling only logs errors, leaving the user unclear.

`pages/settings/Ammunition` already uses string-based `NumberInput`, but also saves raw data without numeric/canonical cleanup.

### 5. New/different users cannot create reload batch
Partially already fixed. `components/reloading/ReloadBatchForm` now calls `createReloadBatchAmmunition`; `functions/createReloadBatchAmmunition` uses service role while preserving `created_by: user.email`. Remaining confirmed issue is calibre is saved raw, so the created reloaded ammunition can still fail checkout calibre matching.

### 6. iPhone number inputs cannot delete/replace 0
Confirmed in `pages/settings/AmmunitionInventory` and `pages/settings/Rifles` where values are initialized/rendered as `0` and converted during typing. `NumberInput` itself is already safe.

### 7. Profile tab does not reset to Profile menu
Confirmed. `MobileTabBar` stores and reopens last profile path via tab history. If the profile tab history contains `/settings/clubs`, tapping Profile navigates back to Clubs instead of `/profile`.

### 8. iPhone-specific causes
Confirmed relevant causes: controlled number inputs, modal keyboard/safe-area behavior already mostly handled globally, bottom-tab history behavior, and normal-user create permissions for Ammunition via direct client calls or service function.

## 3. Root causes

1. Shared calibre list exists but lacks a canonical normalizer and is not imported consistently.
2. Checkout ammunition filtering uses local string cleanup instead of canonical calibre normalization.
3. Ammunition Inventory belongs to Armory by current navigation design; active state is intentional.
4. Add Ammunition has iPhone-hostile number handling and weak error messaging.
5. Reload batch ammunition creation was moved server-side, but raw calibre values still persist.
6. Number inputs forcing numeric `0` during editing prevent easy iPhone deletion/replacement.
7. Mobile profile tab reuses last subpage instead of resetting to `/profile`.

## 4. Minimal fix plan

- Add `normalizeCaliber(value)` and aliases to `utils/caliberCatalog.js`.
- Use canonical calibre normalization in ammunition filtering and labels where relevant.
- Save new calibre values canonically in Rifle, Ammunition, Ammunition Inventory, Add Brass, Reload Batch, Scope Profile, and Load Development create flow.
- Replace only confirmed iPhone-hostile number handling in Ammunition Inventory and Rifles with string-while-editing patterns.
- Make Profile bottom tab always navigate to `/profile`.
- Do not change themes, routes, App.jsx, auth, service worker, manifest, Base44 config, GPS, maps, PDFs, records, inventory maths, brass lifecycle maths, or reloading cost maths.

## 5. Files that must not be touched

Protected and not required for these fixes:
- `App.jsx`
- `index.html`
- `public/manifest.json`
- `public/sw.js`
- `api/base44Client.js`
- Auth context/redirect logic
- GPS/map/tracking files
- PDF export files
- Entity schemas/RLS models

## 6. Acceptance tests

A. Calibre
- Add Rifle with `.308 Winchester`.
- Add Ammunition with `.308`, `.308 Win`, or `308`.
- Add Brass with `.308`.
- Create Reload Batch with `.308`.
- All save/display/filter as `.308 Winchester`.

B. Reloaded ammo checkout
- Reload `.308` ammunition.
- Start Target Shooting checkout with `.308 Winchester` rifle.
- Reloaded ammo appears.
- Selecting it deducts stock.
- Deleting record restores stock.

C. New user Add Ammunition
- Normal iPhone user adds ammunition.
- No permission error.
- No numeric `""`/422 error.
- Ammo appears in their inventory.

D. New user Reload Batch
- Normal iPhone user creates reload batch.
- No Ammunition permission error.
- Reloaded ammo appears in inventory and checkout.

E. Numeric input
- On iPhone, clear `0`, type `100`, save.
- Works in Ammunition Inventory and Rifle current rounds.

F. Profile tab reset
- Profile → Clubs → tap Profile.
- `/profile` opens.

G. Bottom tab active state
- Armory opens `/ammo-summary`.
- Reloading remains reachable through Armory page/navigation.
- Ammunition Inventory remains intentionally under Armory.

H. Regression
- Brass lifecycle maths unchanged.
- Reloading cost maths unchanged.
- PDFs unchanged.
- GPS/maps unchanged.
- Auth redirect unchanged.
- Desktop layout unchanged.