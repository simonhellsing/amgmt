# Button Components

This directory contains reusable button components that provide consistent styling across the application using Tailwind CSS.

## Button Component

The main `Button` component provides consistent styling for all buttons in the application.

### Props

- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `loading`: boolean (default: false) - Shows a spinner when true
- `disabled`: boolean - Disables the button
- `className`: string - Additional CSS classes
- All standard button HTML attributes

### Variants

- **primary**: Blue background, white text (default)
- **secondary**: Gray background, white text
- **danger**: Red background, white text
- **ghost**: Transparent background with border

### Sizes

- **sm**: Small padding and text
- **md**: Medium padding and text (default)
- **lg**: Large padding and text

### Examples

```tsx
import Button from '../components/Button';

// Primary button (default)
<Button onClick={handleClick}>Click me</Button>

// Secondary button
<Button variant="secondary" onClick={handleCancel}>Cancel</Button>

// Danger button
<Button variant="danger" onClick={handleDelete}>Delete</Button>

// Loading state
<Button loading={isLoading}>Save</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// Full width
<Button className="w-full">Full Width</Button>
```

## LinkButton Component

The `LinkButton` component is for links that should look like buttons. It supports both internal (Next.js Link) and external (anchor tag) links.

### Props

- `href`: string - The URL to navigate to
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `external`: boolean (default: false) - If true, renders as anchor tag
- `target`: string - Target attribute for external links
- `rel`: string - Rel attribute for external links
- `className`: string - Additional CSS classes

### Examples

```tsx
import LinkButton from '../components/LinkButton';

// Internal link
<LinkButton href="/dashboard">Go to Dashboard</LinkButton>

// External link
<LinkButton 
  href="https://example.com" 
  external 
  variant="secondary"
>
  Visit External Site
</LinkButton>

// With custom target and rel
<LinkButton 
  href="https://example.com" 
  external 
  target="_blank"
  rel="noopener noreferrer"
>
  Open in New Tab
</LinkButton>
```

## Migration Guide

When updating existing buttons, replace:

```tsx
// Old way
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
  Click me
</button>

// New way
<Button variant="primary">
  Click me
</Button>
```

For links that look like buttons:

```tsx
// Old way
<a href="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
  Dashboard
</a>

// New way
<LinkButton href="/dashboard" variant="primary">
  Dashboard
</LinkButton>
```

## Benefits

1. **Consistency**: All buttons have the same styling and behavior
2. **Maintainability**: Changes to button styling only need to be made in one place
3. **Accessibility**: Built-in focus states and proper ARIA attributes
4. **Type Safety**: TypeScript interfaces ensure proper prop usage
5. **Loading States**: Built-in loading spinner for async operations 