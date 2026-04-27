# Ballistic Calculator - Complete Implementation Guide

## Overview
A comprehensive ballistic profile system has been added to Target Shooting → Ballistic Calculator with full functionality for creating, managing, and calculating ballistic data. The system integrates with existing rifle, scope, and ammunition inventory.

## Changes Made

### 1. New Entity: BallisticProfile
**File:** `entities/BallisticProfile.json`

Stores complete ballistic profiles with links to:
- Rifle (from Rifle inventory)
- Scope (from ScopeProfile inventory)
- Ammunition (factory or hand load)
- Ballistic calculations (BC, MV, bullet weight)
- Zero distance and sight height
- Environmental data (optional)
- Shot photos

**Key Fields:**
- `profile_name`: Human-readable profile name
- `ammunition_type`: "factory" or "hand_load"
- `ballistic_coefficient_g1` / `ballistic_coefficient_g7`: Drag coefficients
- `muzzle_velocity_fps` / `muzzle_velocity_ms`: Auto-converted velocity
- `bullet_weight_grains` / `bullet_weight_grams`: Auto-converted weight
- `zero_distance_meters` / `zero_distance_yards`: Auto-converted zero
- `scope_click_value`: "0.25_MOA", "0.125_MOA", "0.1_MRAD"
- `shot_photos`: Array of target photos linked to profile

### 2. BallisticCalculator Component (Refactored)
**File:** `components/target-analysis/BallisticCalculator.jsx`

Complete rewrite with 6-tab interface:

#### Tab 1: Input
- Bullet database picker (pulls BC and weight)
- Manual input: BC, muzzle velocity (fps/m/s), bullet weight (gr/g)
- Auto-syncing unit conversions
- Zero distance (metres/yards)
- Scope height

#### Tab 2: Profiles
- List all saved ballistic profiles
- Click to load profile (auto-fills all fields)
- "New Profile" button to create (opens form)
- Shows profile name, rifle, caliber, BC, MV, zero distance

#### Tab 3: Table
- Full ballistic table at configured distances (25m to 300m)
- Columns: Distance, Drop (cm/in), Drift, Velocity (fps/m/s), Time-of-flight
- Highlighted zero distance row
- Color-coded: red drops (down), green recoveries (up), amber drift warnings
- Footer with wind/zero conditions

#### Tab 4: Reticle
- Visual reticle reference (crosshair circle)
- Shows first 3 distances with hold-over marks
- Zero distance and caliber info
- Ready for printing/reference at range

#### Tab 5: Turret (ASV/Click Card)
- Scope click calculations based on selected click value
- Shows: Distance, Clicks required, MOA/MRAD adjustment
- Useful for turret settings at range

#### Tab 6: Shots
- Attach target photos to profile
- Placeholder for future photo storage integration
- Tracks performance history per profile

### 3. BallisticProfileForm Component (New)
**File:** `components/ballistic/BallisticProfileForm.jsx`

Dedicated form for creating/editing profiles:
- Profile name
- Rifle selection (with cached name)
- Scope selection (with cached model)
- Ammunition type toggle (Factory/Hand Load)
- Ammunition picker (filtered by rifle caliber)
- Caliber, bullet name, bullet weight, velocity, BC inputs
- Zero distance, sight height, scope click value
- Notes field
- Saves to BallisticProfile entity

### 4. Unit Conversion System
All conversions are automatic and bidirectional:
- **gramsToGrains** / **grainsToGrams** (1 grain = 15.4324g)
- **msToFps** / **fpsToMs** (1 fps = 0.3048 m/s)
- **metersToYards** / **yardsToMeters** (1 meter = 1.09361 yards)
- **cmToInches** / **inchesToCm** (1 inch = 2.54cm)

When user enters a value in one unit, the other unit field updates automatically.

### 5. Removed Features
- **Quick Select Preset dropdown** - Completely removed
- BC_PRESETS still available for reference but not exposed in UI
- Users create custom profiles instead of using presets

### 6. Integration with Existing Systems
- Works with Session Record (target shooting sessions)
- Integrates with Rifle inventory (rifle selection)
- Integrates with ScopeProfile (scope selection)
- Integrates with Ammunition entity (factory loads)
- Integrates with ReloadingSession (future hand load support)
- No impact on Target Analyzer or Target Session
- No inventory deduction (calculation-only)

## Physics Engine
- **G1 ballistic model**: Point-mass trajectory simulation
- **Drag calculation**: Based on BC, bullet mass, velocity
- **Wind modeling**: Crosswind component calculation
- **Time-of-flight**: Accurate for typical ranges
- **Baseline**: Sea-level, standard conditions

## Data Safety
- Existing ballistic data preserved (none existed before)
- No changes to Session Record or TargetSession entities
- New BallisticProfile entity doesn't affect existing workflows
- Safe migrations: all references are optional links

## Usage Workflow

### Creating a Ballistic Profile
1. Open Target Shooting → Ballistic Calculator
2. Click "Profiles" tab
3. Click "New" button
4. Fill form: name, rifle, scope, ammunition type
5. Enter or select ammunition details
6. Set ballistic coefficient, muzzle velocity, bullet weight
7. Set zero distance and scope click value
8. Click "Save Profile"

### Using a Profile for Calculations
1. Open Ballistic Calculator
2. Click "Profiles" tab
3. Select your saved profile
4. All fields auto-populate
5. Switch to "Table" tab to see ballistic data
6. Switch to "Turret" tab for click card
7. Switch to "Reticle" for holdover reference

### Manual Quick Calculation
1. Open Ballistic Calculator
2. Stay on "Input" tab
3. Enter BC, muzzle velocity, bullet weight manually
4. Set zero distance
5. Switch to "Table" tab for calculations
6. No profile saved (one-time calculation)

## Testing Checklist
- [x] Create new ballistic profile
- [x] Select rifle from inventory
- [x] Select scope from inventory
- [x] Choose factory ammunition type
- [x] Enter manual ballistic data
- [x] Unit conversion (grams ↔ grains)
- [x] Unit conversion (m/s ↔ fps)
- [x] Unit conversion (meters ↔ yards)
- [x] Generate ballistic table
- [x] Calculate scope clicks correctly
- [x] Display reticle holdover
- [x] Load profile (auto-fill)
- [x] Edit profile
- [x] Delete profile
- [x] Confirm Quick Select Preset removed
- [x] Existing target shooting pages work
- [x] No inventory deduction
- [x] No impact on sessions

## Future Enhancements
- Hand load batch integration (ReloadingSession)
- Shot photo storage and history
- BC calculation from field data
- Environmental corrections (temp, pressure, altitude)
- Multiple reticle types
- Printable PDF click cards
- Export ballistic data to files

## File Structure
```
components/
  target-analysis/
    BallisticCalculator.jsx          (refactored - multi-tab interface)
  ballistic/
    BallisticProfileForm.jsx         (new - profile creation/editing)

entities/
  BallisticProfile.json              (new - entity schema)
```

## Compatibility
- ✅ iOS mobile layout
- ✅ Android mobile layout
- ✅ Desktop browsers
- ✅ Responsive design
- ✅ Safe-area layout compliant
- ✅ No overlapping text
- ✅ All buttons accessible

## Notes
- Quick Select Preset fully removed (not in UI, still in code for reference)
- BC_PRESETS can be re-enabled if needed in future
- All existing target shooting features preserved
- No breaking changes to existing workflows
- Profiles are user-scoped (created_by filtering)