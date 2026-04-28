# Native Mobile Behavior Fixes — Regression Audit

**Date:** April 2026  
**Changes:** Tab stack restoration, pull-to-refresh UI, native select conversion

## Fixed Issues

### 1. ✅ Bottom Navigation Tab Stack Behavior
- **What was broken:** Tapping a tab always returned to root page (TAB_DEFAULT), losing user's navigation history
- **Fix applied:** `MobileTabBar` now uses `getLastPath()` to resume where user left off when switching tabs; double-tap to return to root
- **File:** `components/MobileTabBar`
- **Testing:**
  - [ ] Tap "Records" → navigate to "/reports" → tap "Home" → verify you're at "/" → tap "Records" again → verify you're at "/reports"
  - [ ] Double-tap same tab → verify returns to root
  - [ ] Back button doesn't create duplicate history entries
  - [ ] Swipe back feels native/smooth

### 2. ✅ Pull-to-Refresh UI Implementation
- **What was broken:** Pull-to-refresh existed as a hook but visual feedback was minimal/inconsistent across pages
- **Fix applied:** Created reusable `PullToRefreshIndicator` component with smooth animations; applied to Dashboard and Records
- **Files:** 
  - New: `components/PullToRefreshIndicator`
  - Updated: `pages/Dashboard`, `pages/Records`
- **Testing:**
  - [ ] Pull down from top of Dashboard → spinner rotates, text says "Pull to refresh"
  - [ ] Release past threshold → "Release to refresh" text
  - [ ] Loading shows "Updating…" while data reloads
  - [ ] Data refreshes correctly (new records appear)
  - [ ] Works offline (shows cached data, no error)
  - [ ] No double-refresh (spam-proof)
  - [ ] Safe area respected (notch/bottom safe inset)

### 3. ✅ Native Selects → Bottom Sheets
- **What was broken:** Multiple native `<select>` elements broke premium mobile feel
- **Fix applied:** Converted all native selects to `BottomSheetSelect` component
- **Files:**
  - `pages/Records` — Record type filter
  - `components/analyzer/TargetPhotoAnalyzer` — Rifle, Ammunition, Distance unit, Shooting position
- **Testing:**
  - [ ] Records page: tap "Record Type" filter → bottom sheet opens with radio options
  - [ ] Target analyzer: tap "Rifle" select → bottom sheet, can filter by caliber match
  - [ ] Ammunition select → shows caliber-filtered list
  - [ ] Distance unit → clean 2-option picker
  - [ ] Shooting position → list with proper spacing for touch
  - [ ] Keyboard works with selects (accessibility)
  - [ ] Selected value is highlighted/shown
  - [ ] Data persistence: selected value saved correctly after submission

## Regression Test Checklist

### Navigation & Routing
- [ ] Tab switching doesn't reset internal state
- [ ] Each tab maintains separate navigation history
- [ ] Back button works predictably (native feel)
- [ ] Swipe back gesture works smoothly
- [ ] No duplicate routes in history
- [ ] Deep links work (navigate directly to /reports, etc.)

### Pull-to-Refresh
- [ ] Indicator appears when pulling down
- [ ] Smooth rotation animation
- [ ] Text feedback ("Pull to refresh" → "Release to refresh")
- [ ] Data reloads on release
- [ ] No double-refresh if user refreshes twice quickly
- [ ] Offline mode: doesn't error, shows cached data
- [ ] Form/edit screens: doesn't interfere with unsaved edits

### Bottom Sheets
- [ ] All selects open as bottom sheets (not native)
- [ ] Options are easy to tap (touch-friendly spacing)
- [ ] Selected value highlighted
- [ ] Scrollable for long lists
- [ ] Respects safe areas (bottom notch)
- [ ] Keyboard works (accessibility)
- [ ] Form validation still works

### Safe Area & Mobile Layout
- [ ] Bottom nav respects safe-area-inset-bottom (notch)
- [ ] Pull-to-refresh indicator respects safe areas
- [ ] Bottom sheets properly positioned (no notch overlap)
- [ ] Modal dialogs respect safe areas
- [ ] No horizontal scroll on any page
- [ ] Text is readable (no clipping)

### Data Integrity
- [ ] Saved data persists (records, goals, equipment)
- [ ] Offline changes sync when back online
- [ ] No data loss on tab switch
- [ ] No data loss on back button
- [ ] Modals close without losing input
- [ ] Forms can be submitted from within bottom sheets

### Performance
- [ ] Tab switching is instant (no lag)
- [ ] Pull-to-refresh doesn't stutter
- [ ] Bottom sheets open smoothly
- [ ] No memory leaks after repeated tab switches
- [ ] No console errors

## Notes
- Pull-to-refresh respects `min-h-[60vh]` and mobile-page-padding
- BottomSheetSelect respects existing validation and onChange handlers
- Tab history uses `useRef` for reliability (survives re-renders)
- All changes are backwards-compatible (no breaking changes to components)