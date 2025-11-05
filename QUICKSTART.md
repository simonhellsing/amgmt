# Component Library Quick Start

## 1. View the Gallery (30 seconds)

```bash
npm run dev
```

Then navigate to: **http://localhost:3001/system/components**

This is your single source of truth. Bookmark it.

## 2. Use Components (2 minutes)

### Before (❌ Now Blocked by ESLint)
```tsx
<button className="px-4 py-2 bg-white text-gray-900 rounded-md">
  Click me
</button>
```

### After (✅ Enforced by System)
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">
  Click me
</Button>
```

## 3. Common Components

### Buttons
```tsx
import { Button, IconButton, LinkButton } from '@/components/ui';
import { Settings } from 'lucide-react';

<Button variant="primary">Save</Button>
<IconButton icon={Settings} aria-label="Settings" />
<LinkButton href="/dashboard">Dashboard</LinkButton>
```

### Form Inputs
```tsx
import { Input, Textarea, Select, Checkbox } from '@/components/form';

<Input 
  label="Email"
  type="email"
  error="Email is required"
  placeholder="you@example.com"
/>

<Textarea 
  label="Description"
  maxLength={500}
  showCount
/>

<Select
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
  ]}
/>

<Checkbox label="Accept terms" />
```

### Feedback
```tsx
import { Alert, Spinner, Badge } from '@/components/feedback';

<Alert variant="success" title="Success!">
  Your changes have been saved.
</Alert>

<Spinner size="md" />

<Badge variant="success">Active</Badge>
```

### Layout
```tsx
import { Card, Stack } from '@/components/layout';

<Card padding="md" hoverable>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>

<Stack direction="vertical" spacing={4}>
  <div>Item 1</div>
  <div>Item 2</div>
</Stack>
```

### Overlay
```tsx
import { Modal } from '@/components/overlay';
import { Button } from '@/components/ui';

const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>
  Open Modal
</Button>

<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure?</p>
  <div className="flex gap-4 mt-6">
    <Button variant="tertiary" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </div>
</Modal>
```

## 4. Finding Components

**Search**: Type component name in gallery search
**Filter**: By category (ui, form, feedback, etc.) or state (hover, disabled, etc.)
**Explore**: Click through categories to see all options

## 5. Understanding Props

Every component in the gallery shows:
- **Props table** with types and defaults
- **Live examples** with all states
- **Code samples** for common usage
- **Accessibility notes**

## 6. Common Patterns

### Loading State
```tsx
<Button loading={isSubmitting}>
  Submit
</Button>
```

### Validation
```tsx
<Input
  label="Email"
  value={email}
  error={errors.email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### Disabled State
```tsx
<Button disabled={!canSubmit}>
  Submit
</Button>
```

### Sizes
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### Variants
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="tertiary">Tertiary</Button>
<Button variant="destructive">Delete</Button>
```

## 7. Design Tokens

Never use hard-coded values. Use Tailwind classes that map to tokens:

```tsx
// ❌ Don't
<div style={{ background: '#2B2B2B', padding: '16px' }} />

// ✅ Do
<div className="bg-gray-800 p-4" />
```

### Common Tokens
- **Colors**: `bg-gray-800`, `text-white`, `border-gray-700`
- **Spacing**: `p-4` (16px), `gap-6` (24px), `mt-8` (32px)
- **Radius**: `rounded-md` (8px), `rounded-lg` (12px)
- **Typography**: `text-sm`, `font-semibold`, `text-white`

See `TOKENS.md` for complete reference.

## 8. Need Help?

1. **Check the gallery first**: `/system/components`
2. **Read the docs**:
   - `COMPONENTS.md` - Component patterns
   - `TOKENS.md` - Design tokens
   - `CONTRIBUTING.md` - Development guide
3. **Look at examples**: See how existing components are used
4. **Check existing pages**: Learn from implemented patterns

## 9. Adding New Components

See `COMPONENTS.md` for detailed guide. Quick version:

1. Create component file in appropriate category
2. Use design tokens (Tailwind classes)
3. Export metadata and call `registerComponent()`
4. Import in gallery page to register
5. View in gallery to verify

## 10. Migrating Existing Pages

The ESLint rule will flag raw HTML elements. To migrate:

1. Find raw elements: `<button>`, `<input>`, etc.
2. Replace with library components
3. Test functionality
4. Fix any styling differences
5. Repeat for next page

Do this **gradually** - one page at a time.

---

## That's It!

You now know enough to use the component library. The gallery at `/system/components` is your reference. Start there whenever you need a component.

**Pro tip**: Keep the gallery open in a tab while developing. It's faster than searching through code.

