# Quick Component Reference Guide

## Components Available

### Modal Components

#### AppModal (Centered Confirmation Modal)
```jsx
import AppModal from '@/components/ui/AppModal';

<AppModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete Rifle?"
  width="420px"
  showClose={true}
  closeOnOutsideClick={true}
  closeOnEscape={true}
  footer={
    <>
      <button className="...">Cancel</button>
      <button className="...">Delete</button>
    </>
  }
>
  <p>This action cannot be undone.</p>
</AppModal>
```

#### AppBottomSheet (Mobile Bottom Sheet)
```jsx
import AppBottomSheet from '@/components/ui/AppBottomSheet';

<AppBottomSheet
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Select Club"
  subtitle="Choose a shooting club"
  maxHeight="85vh"
  isDraggable={true}
  footer={
    <>
      <button>Cancel</button>
      <button>Done</button>
    </>
  }
>
  {/* List of clubs */}
</AppBottomSheet>
```

#### AppFormModal (Form with Fixed Footer)
```jsx
import AppFormModal from '@/components/ui/AppFormModal';

<AppFormModal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={handleSubmit}
  title="Add Rifle"
  subtitle="Enter rifle details"
  primaryAction="Save"
  secondaryAction="Cancel"
  isLoading={isSaving}
  isDangerous={false}
>
  <AppInput label="Name" placeholder="Rifle name" required />
  <AppInput label="Caliber" placeholder=".308 Win" required />
</AppFormModal>
```

#### AppConfirmDialog (Destructive Action Warning)
```jsx
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';

<AppConfirmDialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Rifle?"
  message="This cannot be undone. All associated sessions will remain."
  confirmText="Delete"
  cancelText="Cancel"
  isDangerous={true}
/>
```

### Form Components

#### AppInput
```jsx
import AppInput from '@/components/ui/AppInput';

<AppInput
  label="Club Name"
  placeholder="Enter club name"
  required={true}
  error={error}
  helpText="Official name of the shooting club"
  size="md"
/>
```

**Props**:
- `label` - Required field label
- `placeholder` - Input placeholder
- `required` - Shows red asterisk
- `error` - Error message to display
- `helpText` - Helper text below input
- `size` - sm | md | lg

#### AppButton
```jsx
import AppButton from '@/components/ui/AppButton';

<AppButton
  variant="primary"
  size="md"
  fullWidth={false}
  disabled={false}
  isLoading={false}
  onClick={handleClick}
>
  Save
</AppButton>
```

**Variants**: primary | secondary | outline | ghost | destructive
**Sizes**: sm (36px) | md (44px) | lg (48px)

### Card Components

#### AppCard
```jsx
import AppCard, { 
  AppCardHeader, 
  AppCardContent, 
  AppCardFooter 
} from '@/components/ui/AppCard';

<AppCard>
  <AppCardHeader 
    title="Session Details" 
    subtitle="25 Apr 2026"
    action={<button>Edit</button>}
  />
  <AppCardContent>
    <p>Session details here</p>
  </AppCardContent>
  <AppCardFooter>
    <button>Delete</button>
  </AppCardFooter>
</AppCard>
```

## Usage Patterns

### Simple Confirmation
```jsx
const [open, setOpen] = useState(false);

<>
  <button onClick={() => setOpen(true)}>Delete</button>
  <AppConfirmDialog
    open={open}
    onClose={() => setOpen(false)}
    onConfirm={handleDelete}
    title="Delete?"
    message="Are you sure?"
    isDangerous={true}
  />
</>
```

### List Selection in Bottom Sheet
```jsx
const [open, setOpen] = useState(false);
const [selected, setSelected] = useState(null);

<>
  <button onClick={() => setOpen(true)}>
    {selected?.name || 'Select Club'}
  </button>
  <AppBottomSheet
    open={open}
    onClose={() => setOpen(false)}
    title="Select Club"
    footer={<AppButton onClick={() => setOpen(false)}>Done</AppButton>}
  >
    <div className="space-y-2">
      {clubs.map(club => (
        <button
          key={club.id}
          onClick={() => setSelected(club)}
          className={selected?.id === club.id ? 'bg-primary/10' : ''}
        >
          {club.name}
        </button>
      ))}
    </div>
  </AppBottomSheet>
</>
```

### Form Submission
```jsx
const [open, setOpen] = useState(false);
const [loading, setLoading] = useState(false);
const [data, setData] = useState({ name: '', caliber: '' });

const handleSubmit = async () => {
  setLoading(true);
  await api.saveRifle(data);
  setLoading(false);
  setOpen(false);
};

<AppFormModal
  open={open}
  onClose={() => setOpen(false)}
  onSubmit={handleSubmit}
  title="Add Rifle"
  primaryAction="Save"
  isLoading={loading}
>
  <AppInput
    label="Name"
    value={data.name}
    onChange={(e) => setData({ ...data, name: e.target.value })}
    required
  />
  <AppInput
    label="Caliber"
    value={data.caliber}
    onChange={(e) => setData({ ...data, caliber: e.target.value })}
    required
  />
</AppFormModal>
```

## Design Tokens Reference

```jsx
import { 
  SPACING, 
  SIZING, 
  Z_INDEX, 
  MODAL_SIZES,
  BUTTON_VARIANTS,
  CARD_STYLES 
} from '@/lib/designSystem';

// Example usage
<div style={{ padding: SPACING.md, gap: SPACING.lg }}>
  <button style={{ fontSize: SIZING.icon_lg }}>
    Button
  </button>
</div>
```

## CSS Classes for Common Tasks

### Spacing
```jsx
// Padding: p-3 (12px), p-4 (16px), p-5 (20px)
<div className="p-4">Content</div>

// Gap: gap-2 (8px), gap-3 (12px), gap-4 (16px)
<div className="flex gap-4">Items</div>

// Margin: m-3, m-4, m-5 or mt-4, mb-4, etc
<div className="mb-4">Content</div>
```

### Safe Area
```jsx
// Add to modals footer
<div className="safe-area-bottom">Content</div>

// Add to pages (clears bottom nav)
<div className="mobile-page-padding">Content</div>

// Add to top-level pages
<div className="safe-area-top">Content</div>
```

### Colors
```jsx
// Primary button
<button className="bg-primary text-primary-foreground">Save</button>

// Secondary button
<button className="bg-secondary text-secondary-foreground">Cancel</button>

// Text colors
<p className="text-foreground">Normal text</p>
<p className="text-muted-foreground">Muted text</p>
<p className="text-destructive">Error text</p>
```

### Rounded Corners
```jsx
// Default radius
<div className="rounded-lg">Content</div>

// Larger radius
<div className="rounded-2xl">Content</div>

// Smaller radius
<div className="rounded-md">Content</div>
```

## Icon Usage

### Standard Sizes
```jsx
import { Settings, Plus, Trash2, ChevronDown } from 'lucide-react';

// Small UI icon (18px)
<Settings className="w-4.5 h-4.5" />  // or just leave default

// Section header icon (24px)
<Settings className="w-6 h-6" />

// Never use larger than 32px
<Settings className="w-8 h-8" /> // 32px max

// Spacing example
<button className="flex items-center gap-2">
  <Plus className="w-4.5 h-4.5" />
  <span>Add Club</span>
</button>
```

### Icon Colors
```jsx
// Default (foreground)
<Settings className="text-foreground" />

// Muted
<Settings className="text-muted-foreground" />

// Primary action
<Settings className="text-primary" />

// Destructive
<Trash2 className="text-destructive" />
```

## Common Patterns

### Empty State
```jsx
import { Plus } from 'lucide-react';

<div className="text-center py-12">
  <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
  <h3 className="font-semibold text-foreground mb-2">No Rifles</h3>
  <p className="text-sm text-muted-foreground mb-6">
    Add your first rifle to get started
  </p>
  <AppButton onClick={handleAdd}>+ Add Rifle</AppButton>
</div>
```

### Loading State
```jsx
<div className="flex items-center justify-center py-12">
  <div className="w-6 h-6 border-3 border-border border-t-primary rounded-full animate-spin" />
</div>
```

### Form Layout
```jsx
<form className="space-y-4">
  <AppInput label="Name" required />
  <AppInput label="Caliber" required />
  <AppInput label="Serial Number" />
  <div className="flex gap-3 pt-4">
    <AppButton variant="secondary" fullWidth>Cancel</AppButton>
    <AppButton variant="primary" fullWidth>Save</AppButton>
  </div>
</form>
```

### Card List
```jsx
<div className="space-y-3">
  {rifles.map(rifle => (
    <AppCard key={rifle.id}>
      <AppCardHeader title={rifle.name} subtitle={rifle.caliber} />
      <AppCardContent>
        <p>{rifle.model}</p>
      </AppCardContent>
      <AppCardFooter>
        <button className="text-sm text-primary">Edit</button>
        <button className="text-sm text-destructive ml-auto">Delete</button>
      </AppCardFooter>
    </AppCard>
  ))}
</div>
```

## Testing Tips

1. **Always test on iPhone SE** (small screen)
2. **Always test bottom nav clearance** (64px minimum)
3. **Always test with keyboard** on iOS
4. **Always test dark mode** (add `dark` class to html)
5. **Always test escape key** on modals
6. **Always test click-outside-to-close** on modals
7. **Test background lock** - drag inside modal, background must not move
8. **Test form scroll** - long form must scroll, not background

## Troubleshooting

### Modal background moves when scrolling
- Ensure you're using `AppModal`, `AppBottomSheet`, or `AppFormModal`
- Check that modal children have `data-scrollable` attribute
- Verify `useBodyScrollLock` is running

### Icons too large
- Never use larger than 32px
- Use `w-6 h-6` (24px) for section headers
- Use default size for UI icons
- Check icon isn't inside crowded card

### Buttons hidden behind tab bar
- Add `mobile-page-padding` to page wrapper
- Add `safe-area-bottom` to modal footer
- Test on real iPhone or Safari DevTools

### Form keyboard pushes content
- Use `AppFormModal` for forms
- Footer has `safe-area-bottom` class
- Test on iOS Safari specifically

### Dark mode colors wrong
- Colors auto-switch with `dark` class
- Don't use hex colors, use design tokens
- Don't override with inline styles