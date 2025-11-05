# Component Library

This document explains how to use and maintain the component library.

## Overview

Our component library is the single source of truth for all UI elements in the application. Every component is:

- **Token-based**: Uses design tokens from `styles/tokens.css` instead of hard-coded values
- **State-aware**: Supports all relevant interaction, validation, and async states
- **Documented**: Automatically appears in the Component Gallery at `/system/components`
- **Accessible**: Built with WCAG 2.1 AA standards in mind
- **Type-safe**: Fully typed with TypeScript

## Structure

```
components/
├── ui/              # Core interactive elements (Button, IconButton, LinkButton)
├── form/            # Form controls (Input, Textarea, Select, Checkbox, etc.)
├── feedback/        # User feedback (Alert, Toast, Spinner, Progress, etc.)
├── overlay/         # Overlays (Modal, Dialog, Tooltip, Dropdown)
├── navigation/      # Navigation (Tabs, Breadcrumb, Sidebar, etc.)
├── data/            # Data display (Table, List, Pagination, EmptyState)
├── layout/          # Layout primitives (Stack, Card, Container, Grid)
├── typography/      # Text and labels (Badge, Heading, Text)
└── patterns/        # Composite patterns (combinations of the above)
```

## Component States

Every component should handle applicable states from this taxonomy:

### Interaction States
- `default` - Resting state
- `hover` - Mouse hover
- `active` - Mouse pressed
- `focus` - Keyboard focus
- `pressed` - Touch/click pressed state
- `loading` - Async operation in progress
- `disabled` - Not interactive

### Validation States
- `valid` - Validation passed
- `invalid` - Validation failed
- `warning` - Warning condition

### Selection States
- `selected` - Item is selected
- `unselected` - Item is not selected
- `indeterminate` - Partially selected (checkboxes)

### Disclosure States
- `open` - Expanded/visible
- `closed` - Collapsed/hidden

### Async States
- `idle` - No operation
- `success` - Operation succeeded
- `error` - Operation failed

## Component Anatomy

Every component should follow this pattern:

```tsx
import React from 'react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface MyComponentProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const MyComponent = React.forwardRef<HTMLElement, MyComponentProps>(
  ({ variant = 'primary', size = 'md', disabled, children, className = '', ...props }, ref) => {
    // Use design tokens via Tailwind classes
    // E.g., 'bg-gray-800' instead of 'bg-[#2B2B2B]'
    
    const baseClasses = 'transition-all duration-normal rounded-md';
    const variantClasses = {
      primary: 'bg-white text-gray-900',
      secondary: 'bg-gray-700 text-white',
    };
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MyComponent.displayName = 'MyComponent';

// Register metadata for the gallery
export const myComponentMetadata: ComponentMetadata = {
  name: 'MyComponent',
  description: 'Short one-line description',
  category: 'ui',
  variants: [
    { name: 'primary', description: 'Primary variant' },
    { name: 'secondary', description: 'Secondary variant' },
  ],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: ['default', 'hover', 'focus', 'disabled'],
  props: [
    {
      name: 'variant',
      type: "'primary' | 'secondary'",
      default: "'primary'",
      required: false,
      description: 'Visual style variant',
    },
    // ... more props
  ],
  example: `<MyComponent variant="primary">
  Content
</MyComponent>`,
  a11y: 'Accessibility notes and considerations',
};

registerComponent(myComponentMetadata);

export default MyComponent;
```

## Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `IconButton`)
- **Props**: camelCase (e.g., `variant`, `size`, `isLoading`)
- **Variants**: lowercase (e.g., `'primary'`, `'secondary'`)
- **Sizes**: Two-letter lowercase (e.g., `'sm'`, `'md'`, `'lg'`)
- **Files**: PascalCase matching component name (e.g., `Button.tsx`)

## Variants vs. Composition

**Use variants for**:
- Visual style differences (primary, secondary, destructive)
- Size differences (sm, md, lg)
- Functional differences that are common (outlined, filled)

**Use composition for**:
- One-off customizations
- Complex layouts
- Feature combinations

Example:
```tsx
// ❌ Don't create a variant for every use case
<Button variant="primary-with-icon-and-border" />

// ✅ Use composition instead
<Button variant="primary">
  <Icon /> Button Text
</Button>
```

## Adding a New Component

1. **Create the component file** in the appropriate category folder
2. **Use design tokens** - Never hard-code values
3. **Export metadata** and call `registerComponent()`
4. **Add preview** to `/pages/system/components.tsx` (optional but recommended)
5. **Import in gallery** so it registers on page load
6. **Test in gallery** at `/system/components`
7. **Add to index** (if creating a new index file for the category)

## Design Token Usage

Always use design tokens through Tailwind classes:

```tsx
// ❌ Don't use hard-coded values
<div className="bg-[#2B2B2B] text-[#FFFFFF]" />

// ✅ Use token-based classes
<div className="bg-gray-800 text-white" />

// ❌ Don't use inline styles for values that should be tokens
<div style={{ padding: '16px', borderRadius: '8px' }} />

// ✅ Use Tailwind classes that reference tokens
<div className="p-4 rounded-md" />
```

## Accessibility Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus states are visible (using `focus-visible:` classes)
- [ ] Proper ARIA attributes where needed
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Form inputs have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Icon-only buttons have `aria-label`
- [ ] Modals trap focus and return focus on close
- [ ] Respects `prefers-reduced-motion`

## Common Patterns

### Forwarding Refs
Use `React.forwardRef` for components that wrap native elements:

```tsx
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <button ref={ref} {...props} />;
  }
);
```

### Spreading Props
Always spread remaining props to the underlying element:

```tsx
const { variant, size, className, ...props } = allProps;
return <button className={classes} {...props} />;
```

### Disabled States
Prevent interaction AND indicate visually:

```tsx
className="disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
disabled={disabled || loading}
```

### Loading States
Show loading spinner and disable interaction:

```tsx
{loading && <Loader2 className="animate-spin" />}
disabled={disabled || loading}
```

## Component Gallery

The Component Gallery at `/system/components` is your source of truth. It:

- Shows every component with all variants and states
- Provides live, interactive previews
- Documents all props with types and defaults
- Includes usage examples
- Notes accessibility considerations

Use it to:
- Spot visual inconsistencies
- Test components in isolation
- Share designs with stakeholders
- Onboard new team members

## Questions?

Check the gallery first. If your question isn't answered there, refer to:
- `TOKENS.md` for design token usage
- `CONTRIBUTING.md` for development workflow
- Existing components for patterns and examples

