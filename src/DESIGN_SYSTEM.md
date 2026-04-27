# Unified Design System & Modal Architecture

## Overview
This document outlines the new unified design system implemented to ensure consistency across the Shooting Records app. All UI components, modals, spacing, and layout now follow these standards.

## Design System Tokens

### Spacing
- `xs`: 4px
- `sm`: 8px
- `md`: 16px (default)
- `lg`: 20px
- `xl`: 24px
- `2xl`: 32px

### Icon Sizing
- `icon_sm`: 16px (small UI icons)
- `icon_md`: 18px (default UI icons)
- `icon_lg`: 20px (section headers)
- `icon_xl`: 24px (larger headers)
- `icon_feature`: 28px (feature icons)
- `icon_hero`: 32px (hero/dashboard icons)

**Rule**: Never use icons larger than 32px in normal layouts. Oversized icons break layouts.

### Button Heights
- `sm`: 36px (tertiary/icon buttons)
- `md`: 44px (default buttons)
- `lg`: 48px (primary CTA)

**All buttons must be at least 44px tall for mobile accessibility.**

### Input Heights
- Standard: 44px
- Padding: 10px vertical, 12px horizontal

### Border Radius
- `sm`: 6px
- `md`: 12px (default)
- `lg`: 20px (for large modals)

### Z-Index Layer System
```
0     - Base (default)
1     - Page content
10    - Map layers
20    - Floating controls (map controls, FAB)
25    - Sticky headers
30    - Bottom navigation bar
40    - Overlay (modal background)
50    - Modal/Sheet (above overlay)
60    - Toast notifications
70    - Critical alerts
```

## Modal System

### Components

#### 1. AppModal
Centered modal for confirmations and small forms.

```jsx
import AppModal from '@/components/ui/AppModal';

<AppModal
  open={isOpen}
  onClose={handleClose}
  title="Confirm Action"
  width="420px"
  showClose={true}
  closeOnOutsideClick={true}
  closeOnEscape={true}
  footer={
    <>
      <button onClick={handleClose}>Cancel</button>
      <button onClick={handleSubmit}>Delete</button>
    </>
  }
>
  <p>Are you sure?</p>
</AppModal>
```

**Use Cases**:
- Yes/No confirmations
- Small forms
- Alerts
- Delete confirmations

#### 2. AppBottomSheet
Bottom sheet for mobile actions, forms, and selections.

```jsx
import AppBottomSheet from '@/components/ui/AppBottomSheet';

<AppBottomSheet
  open={isOpen}
  onClose={handleClose}
  title="Select Club"
  subtitle="Choose a shooting club"
  maxHeight="85vh"
  isDraggable={true}
  footer={
    <>
      <button>Cancel</button>
      <button>Save</button>
    </>
  }
>
  {/* Content */}
</AppBottomSheet>
```

**Use Cases**:
- Mobile action menus
- List selections
- Mobile-optimized forms
- Map action menus

#### 3. AppFormModal
Form modal with fixed header/footer and scrollable content.

```jsx
import AppFormModal from '@/components/ui/AppFormModal';

<AppFormModal
  open={isOpen}
  onClose={handleClose}
  onSubmit={handleSubmit}
  title="Add Rifle"
  subtitle="Enter rifle details"
  primaryAction="Save"
  secondaryAction="Cancel"
  isLoading={false}
>
  <AppInput label="Name" placeholder="Rifle name" required />
  <AppInput label="Caliber" placeholder=".308 Win" required />
</AppFormModal>
```

**Use Cases**:
- Multi-field forms
- Ballistic profile creation
- Ammunition entry
- Rifle/shotgun settings

#### 4. AppConfirmDialog
Dialog for destructive actions.

```jsx
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';

<AppConfirmDialog
  open={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="Delete Rifle?"
  message="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  isDangerous={true}
/>
```

**Use Cases**:
- Delete confirmations
- Destructive action warnings

### Background Locking

All modals automatically:
1. Lock body scroll (prevents page scrolling when modal is open)
2. Prevent map dragging/zooming
3. Disable background touch interactions
4. Restore interaction when modal closes

**iOS Safari fixes included**:
- Prevents overscroll bounce
- Blocks touchmove propagation
- Handles keyboard push correctly
- Fixes input focus layout jump

### Safe Area Awareness

All modals respect safe areas:
- Header respects top safe area
- Footer respects bottom safe area
- No content hidden behind iPhone notches
- No buttons hidden behind bottom tab bar

## Standard Components

### AppButton
```jsx
import AppButton from '@/components/ui/AppButton';

<AppButton variant="primary" size="md" fullWidth>
  Save
</AppButton>
```

**Variants**: primary, secondary, outline, ghost, destructive
**Sizes**: sm (36px), md (44px), lg (48px)

### AppInput
```jsx
import AppInput from '@/components/ui/AppInput';

<AppInput
  label="Name"
  placeholder="Enter name"
  required
  error={error}
  helpText="Help text"
/>
```

### AppCard
```jsx
import AppCard, { AppCardHeader, AppCardContent } from '@/components/ui/AppCard';

<AppCard>
  <AppCardHeader title="Session" subtitle="25 Apr 2026" />
  <AppCardContent>
    <p>Content here</p>
  </AppCardContent>
</AppCard>
```

## Naming Conventions

### Consistent Terminology

**Sessions** = Active or completed shooting/stalking/clay sessions
**Records** = Saved entries/results from sessions
**Reports** = PDF exports or formal reporting views
**History** = Timeline view (if needed, avoid duplication)
**Logs** = Maintenance, cleaning, inventory movements

**Do NOT use**:
- "Previous Sessions" (use "Records")
- "Session History" (use "Records")
- "Entry Logs" (use "Records" or "History")
- Multiple names for the same thing

### Button Text
- Save / Cancel (forms)
- Delete / Cancel (confirmations)
- Continue / Back (multi-step)
- Done / Close (completion)

## Icon Standards

### Sizing Rules
- **Normal UI icons**: 18-20px
- **Section headers**: 24px
- **Feature/dashboard icons**: 28-32px max
- **Oversized icons**: NEVER (they break layouts)

### Stroke Width
- Use consistent stroke width across icon library
- Prefer `lucide-react` for consistency
- Don't mix icon libraries

### Color Consistency
- Icons use `text-foreground` or `text-muted-foreground`
- Action icons use primary color
- Error/destructive icons use destructive color
- Don't use random colors for UI icons

### Spacing Around Icons
- Icon + text: 8px gap minimum
- Multiple icons: 8px gap minimum
- Icon inside button: centered, no gap needed

## Spacing Standards

### Page Padding
- Mobile: 16px
- Desktop: 24px
- Never less than 16px

### Card Padding
- Standard: 16px (p-4)
- Compact: 12px (p-3)
- Spacious: 20px (p-5)

### Section Gaps
- Between sections: 16-20px
- Between items in list: 8-12px
- Within form fields: 12px

### Modal Padding
- Header/Footer: 16px horizontal, 12px vertical
- Content: 16px on all sides
- Content gap: 16px between elements

## Button Guidelines

### Rules
1. All buttons are 44px minimum height on mobile
2. Primary buttons are full width on mobile (except modals)
3. Secondary buttons are always same height as primary
4. Danger buttons only for delete/destructive actions
5. Button text is short and action-oriented

### Variations
```
Primary:     Orange bg, white text
Secondary:   Gray bg, dark text
Outline:     Border only, transparent bg
Ghost:       No border, hover highlight
Destructive: Red bg, white text
```

### Layout
- Mobile: Stack vertically or reversed row (Cancel first)
- Desktop: Inline with gap
- Never hide buttons behind footer or tab bar

## Form Standards

### Input Styling
- Height: 44px minimum
- Padding: 10px vertical, 12px horizontal
- Border: 1px border-border
- Radius: 12px
- Font: 14px (text-sm)
- Focus ring: 2px primary color

### Labels
- Font: 12px, bold (font-semibold)
- Color: muted-foreground
- Uppercase with letter spacing
- Always above input
- Required indicator: red asterisk

### Layout
- Field gap: 12px
- Form gap: 16px
- Labels inside modals: 16px padding on sides

### Validation
- Error text: red, 12px, below input
- Error state: red border and focus ring
- Help text: muted-foreground, 12px, below input

## Empty States

**All empty states must include**:
1. Icon (24-28px, muted color)
2. Title (14-16px, bold)
3. Message (12px, muted color)
4. Primary action button (optional)

Example:
```
[Icon]
No Rifles Found
Add your first rifle to get started.
[+ Add Rifle]
```

## Loading States

### Rules
- Use skeleton cards for content loading
- Use small spinner (20px) for actions
- Never show giant blank white screens
- No layout shift after loading
- Include loading text for clarity

## Mobile Optimization

### Bottom Navigation Safety
- 64px bottom nav bar on mobile
- Add `mobile-page-padding` class to page content
- Never put buttons near bottom (64px clearance minimum)
- Use `safe-area-bottom` in modals

### Keyboard Safety
- Form modals handle keyboard push
- Inputs don't cause layout jump
- Footer buttons always visible with keyboard open
- Test on iOS Safari keyboard

### Touch Targets
- All buttons/inputs: 44px minimum
- Touch zones: 8px padding around interactive elements
- No small buttons (< 36px)

## Dark Mode

All components support dark mode via `dark` class on `<html>` element.

Colors adjust automatically:
- Background/card colors lighter in dark mode
- Text colors adjusted for contrast
- Border colors adjusted
- No manual color overrides needed

## Accessibility

### ARIA
- Modals have proper roles
- Buttons have labels
- Form fields have labels
- Icons have aria-labels where needed

### Focus Management
- Focus trap in modals
- Visible focus ring on buttons
- Logical tab order
- Keyboard navigation works

### Color Contrast
- Text on backgrounds: 7:1 ratio minimum
- Icons: 4.5:1 minimum
- Borders: sufficient contrast

## Migration Guide

### Replacing Old Modals

**Before**:
```jsx
<BaseModal open={open}>
  <div className="p-6">
    <h2>Title</h2>
    {/* content */}
    <div className="flex gap-2 justify-end">
      <button>Cancel</button>
      <button>Save</button>
    </div>
  </div>
</BaseModal>
```

**After**:
```jsx
<AppModal
  open={open}
  onClose={handleClose}
  title="Title"
  footer={
    <>
      <AppButton variant="secondary" onClick={handleClose}>Cancel</AppButton>
      <AppButton variant="primary" onClick={handleSave}>Save</AppButton>
    </>
  }
>
  {/* content */}
</AppModal>
```

### Replacing Old Buttons

**Before**:
```jsx
<button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
  Save
</button>
```

**After**:
```jsx
<AppButton variant="primary">Save</AppButton>
```

### Replacing Old Inputs

**Before**:
```jsx
<input placeholder="Name" className="border px-3 py-2" />
```

**After**:
```jsx
<AppInput label="Name" placeholder="Name" required />
```

## Testing Checklist

- [ ] Modal opens and closes smoothly
- [ ] Background is locked (can't scroll/zoom)
- [ ] Buttons are visible (not hidden behind tab bar)
- [ ] Form scrolls properly with many fields
- [ ] Mobile layout works (iPhone SE size)
- [ ] Tablet layout works (iPad size)
- [ ] Keyboard doesn't push content (iOS)
- [ ] Dark mode works
- [ ] Icons are correct size
- [ ] Spacing looks consistent
- [ ] No layout shifts
- [ ] Touch targets are 44px minimum
- [ ] Focus ring visible on keyboard nav

## Files Created

- `lib/designSystem.js` - Token definitions
- `components/ui/AppModal.jsx` - Centered modal
- `components/ui/AppBottomSheet.jsx` - Bottom sheet
- `components/ui/AppFormModal.jsx` - Form modal
- `components/ui/AppConfirmDialog.jsx` - Confirm dialog
- `components/ui/AppButton.jsx` - Standard button
- `components/ui/AppInput.jsx` - Standard input
- `components/ui/AppCard.jsx` - Card components
- `hooks/useBodyScrollLock.js` - Scroll locking utility
- `DESIGN_SYSTEM.md` - This file

## Next Steps

1. Refactor existing modals to use new components
2. Audit all screens for icon consistency
3. Standardize spacing on all pages
4. Fix bottom navigation overlap issues
5. Update naming where duplicates exist
6. Test on mobile and desktop
7. Ensure no functionality changed