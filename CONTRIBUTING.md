# Contributing to the Component Library

This guide explains how to develop, test, and contribute to the component library.

## Development Workflow

### 1. Set Up Your Environment

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Navigate to the Component Gallery
open http://localhost:3001/system/components
```

### 2. Create a New Component

Follow the "Adding a New Component" checklist in `COMPONENTS.md`:

1. Choose the right category folder (`ui`, `form`, `feedback`, etc.)
2. Create the component file
3. Use design tokens (see `TOKENS.md`)
4. Export metadata and register it
5. Add a preview to the gallery page
6. Test in the gallery

Example component structure:
```tsx
// components/ui/MyComponent.tsx
import React from 'react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface MyComponentProps {
  // ... props
}

export const MyComponent = React.forwardRef<HTMLElement, MyComponentProps>(
  (props, ref) => {
    // Implementation using design tokens
    return <div ref={ref} className="bg-gray-800 p-4 rounded-md" {...props} />;
  }
);

MyComponent.displayName = 'MyComponent';

export const myComponentMetadata: ComponentMetadata = {
  // ... metadata
};

registerComponent(myComponentMetadata);

export default MyComponent;
```

### 3. Test Your Component

1. **Visual testing**: View it in the Component Gallery
2. **State testing**: Verify all applicable states work
3. **Accessibility testing**: 
   - Tab through interactive elements
   - Test with a screen reader (VoiceOver on Mac, NVDA on Windows)
   - Check color contrast with browser DevTools
4. **Responsive testing**: Test at different viewport sizes

### 4. Update Documentation

- Update `COMPONENTS.md` if you're adding new patterns
- Update `TOKENS.md` if you're adding new tokens
- Add comments explaining non-obvious code

### 5. Commit Your Changes

We use conventional commits:

```bash
# Format: type(scope): description
git commit -m "feat(ui): add new Button variant"
git commit -m "fix(form): correct Input validation styling"
git commit -m "docs(tokens): add spacing token examples"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting (not CSS)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

## Linting Rules

### Preventing Raw HTML Primitives

We enforce component library usage via ESLint. Raw HTML primitives (`<button>`, `<input>`, etc.) are not allowed in `pages/**` and `app/**` except where explicitly disabled.

**Why?**: To ensure consistency and prevent ad-hoc styling.

```tsx
// ❌ Not allowed in pages/app
<button onClick={handleClick}>Click me</button>

// ✅ Use library components
<Button onClick={handleClick}>Click me</Button>

// ✅ Exceptions allowed with eslint-disable comment
{/* eslint-disable-next-line react/forbid-elements */}
<button>Special case with documented reason</button>
```

The rule is configured in `.eslintrc.json`.

### Running the Linter

```bash
# Check for errors
npm run lint

# Auto-fix where possible
npm run lint -- --fix
```

## Code Quality Guidelines

### TypeScript

- Use strict typing - avoid `any`
- Export prop interfaces for component consumers
- Use type imports: `import type { ... }`

### React

- Use `React.forwardRef` for components wrapping native elements
- Use `React.memo` sparingly (only for expensive renders)
- Prefer composition over prop drilling

### Styling

- **Never** use hard-coded color/spacing values
- Use Tailwind classes that map to design tokens
- Group Tailwind classes logically: layout → spacing → colors → typography → effects
- Extract repeated class combinations into components

```tsx
// ❌ Bad
<div className="bg-[#2B2B2B] rounded-[8px] p-[16px] text-[#FFFFFF] hover:bg-[#383838]" />

// ✅ Good
<div className="bg-gray-800 rounded-md p-4 text-white hover:bg-gray-700" />
```

### Accessibility

Every component must:
- Be keyboard accessible
- Have visible focus states
- Include proper ARIA attributes
- Have sufficient color contrast (4.5:1 minimum)
- Work with screen readers

Use these tools:
- Browser DevTools Lighthouse
- axe DevTools extension
- Keyboard-only navigation testing

### Performance

- Avoid unnecessary re-renders
- Memoize expensive computations
- Lazy-load heavy components
- Keep bundle sizes reasonable

## Component Checklist

Before submitting a component, verify:

- [ ] Uses design tokens (no hard-coded values)
- [ ] Forwards refs appropriately
- [ ] Spreads remaining props to underlying element
- [ ] Has TypeScript types for all props
- [ ] Exports metadata and registers with `registerComponent()`
- [ ] Handles all applicable states
- [ ] Has visible focus states
- [ ] Passes accessibility checks
- [ ] Works at all supported viewport sizes
- [ ] Appears correctly in Component Gallery
- [ ] Has example usage in metadata
- [ ] Has accessibility notes in metadata
- [ ] Follows naming conventions

## Testing Strategy

### Manual Testing

1. **Component Gallery**: Visual verification of all states
2. **Real usage**: Test in actual pages
3. **Keyboard navigation**: Tab through, activate with Enter/Space
4. **Screen reader**: Test with VoiceOver/NVDA
5. **Responsive**: Test mobile, tablet, desktop sizes

### Automated Testing (Future)

We plan to add:
- Unit tests with Jest + React Testing Library
- Visual regression tests
- Playwright tests for the Component Gallery
- Accessibility tests with jest-axe

## Common Patterns

### Variants

```tsx
const variantClasses: Record<string, string> = {
  primary: 'bg-white text-gray-900',
  secondary: 'bg-gray-700 text-white',
};
```

### Sizes

```tsx
const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};
```

### State Props

```tsx
// Loading state
{loading && <Loader2 className="animate-spin" />}
disabled={disabled || loading}

// Validation state
const stateClasses = error
  ? 'border-red-500 focus:ring-red-500'
  : 'border-gray-700 focus:ring-gray-500';
```

### Conditional Classes

```tsx
const classes = [
  baseClasses,
  variantClasses[variant],
  sizeClasses[size],
  disabled && disabledClasses,
  className,
]
  .filter(Boolean)
  .join(' ');
```

## Troubleshooting

### Component Not Appearing in Gallery

1. Check that you imported the component file in `pages/system/components.tsx`
2. Verify `registerComponent()` is called
3. Check browser console for errors
4. Ensure metadata is properly exported

### Styling Not Working

1. Verify Tailwind class names are correct
2. Check that tokens are defined in `tokens.css`
3. Ensure tokens are wired into `tailwind.config.ts`
4. Clear Next.js cache: `rm -rf .next && npm run dev`

### TypeScript Errors

1. Check that interfaces are properly exported
2. Verify generic types are correct
3. Run `npm run type-check` (if available)

### Linter Errors

1. Don't use raw HTML elements in pages/app code
2. Import components from the library instead
3. Add `eslint-disable` comment if absolutely necessary (with explanation)

## Migration Workflow

When migrating existing pages to use the library:

1. **Identify raw elements**: Look for `<button>`, `<input>`, etc.
2. **Find equivalent library component**: Check gallery
3. **Replace**: Update imports and JSX
4. **Test**: Verify functionality and styling
5. **Iterate**: Fix any issues

Example:
```tsx
// Before
<button 
  className="px-4 py-2 bg-white text-gray-900 rounded-md"
  onClick={handleClick}
>
  Click me
</button>

// After
import { Button } from '@/components/ui/Button';

<Button onClick={handleClick}>
  Click me
</Button>
```

## Getting Help

- **Component patterns**: Check existing components in the same category
- **Design tokens**: See `TOKENS.md`
- **Component structure**: See `COMPONENTS.md`
- **Gallery issues**: Check browser console for errors

## Questions?

If something is unclear or you need guidance:
1. Check the documentation (COMPONENTS.md, TOKENS.md)
2. Look at similar existing components
3. View the Component Gallery for examples
4. Ask the team in your communication channel

## Pull Request Process

1. **Create a branch**: `git checkout -b feat/my-component`
2. **Make changes**: Follow the development workflow above
3. **Test thoroughly**: Use the checklist
4. **Commit**: Use conventional commit format
5. **Push**: `git push origin feat/my-component`
6. **Create PR**: Include description, screenshots if visual changes
7. **Address feedback**: Make requested changes
8. **Merge**: Once approved

## Code Style

We follow these conventions:
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Semicolons optional but consistent within files
- Component files use PascalCase
- Utility files use camelCase

## Thank You!

Your contributions make the design system better for everyone. Thank you for following these guidelines and maintaining our component quality standards!

