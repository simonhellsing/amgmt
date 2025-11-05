# Design Tokens

Design tokens are the single source of truth for all design decisions in the application. They're defined as CSS custom properties in `styles/tokens.css` and wired into Tailwind in `tailwind.config.ts`.

## Principles

1. **Never hard-code design values** - Always use tokens
2. **Tokens cascade** - Changes to tokens update the entire app
3. **Semantic over literal** - Use `--color-border` not `--color-gray-700`
4. **System colors for states** - Blue/green/red/yellow are reserved for semantic meaning

## Token Categories

### Colors

#### Grays (Neutral)
Used for backgrounds, borders, and text. Black/grey only as specified in project preferences.

```css
--color-gray-50    /* Lightest gray */
--color-gray-900   /* Darkest gray (background) */
--color-gray-950   /* Almost black */
```

**Usage**:
- Backgrounds: `bg-gray-900`, `bg-gray-800`, `bg-gray-700`
- Borders: `border-gray-700`, `border-gray-600`
- Text: `text-white`, `text-gray-300`, `text-gray-400`

#### System Colors (Semantic)
Reserved for status, feedback, and validation states only.

```css
--color-blue-*    /* Info states */
--color-green-*   /* Success states */
--color-red-*     /* Error/destructive states */
--color-yellow-*  /* Warning states */
```

**When to use**:
- ✅ Validation messages (error, warning, success)
- ✅ Status indicators (badge, alert)
- ✅ State feedback (success button after save)

**When NOT to use**:
- ❌ General backgrounds
- ❌ Decorative elements
- ❌ Brand identity (use gray/white instead)

#### Semantic Aliases
Pre-defined color combinations for common states:

```css
--color-success         /* Green for success */
--color-error           /* Red for errors */
--color-warning         /* Yellow for warnings */
--color-info            /* Blue for info */
--color-background      /* Page background */
--color-surface         /* Card/elevated surfaces */
--color-border          /* Default borders */
```

### Spacing

Based on 4px grid system:

```css
--space-1   /* 4px */
--space-2   /* 8px */
--space-3   /* 12px */
--space-4   /* 16px */
--space-6   /* 24px */
--space-8   /* 32px */
--space-12  /* 48px */
```

**Usage in Tailwind**:
- `p-4` = 16px padding
- `gap-6` = 24px gap
- `mt-8` = 32px margin-top

### Typography

```css
/* Font families */
--font-family-sans
--font-family-mono

/* Font sizes */
--font-size-xs    /* 12px */
--font-size-sm    /* 14px */
--font-size-base  /* 16px */
--font-size-lg    /* 18px */
--font-size-2xl   /* 24px */

/* Font weights */
--font-weight-normal     /* 400 */
--font-weight-medium     /* 500 */
--font-weight-semibold   /* 600 */
--font-weight-bold       /* 700 */

/* Line heights */
--line-height-tight    /* 1.25 */
--line-height-normal   /* 1.5 */
--line-height-relaxed  /* 1.75 */
```

**Note**: Per project preferences, buttons use semibold weight (`font-semibold`).

### Radius

```css
--radius-sm   /* 4px - small elements */
--radius-md   /* 8px - buttons, inputs */
--radius-lg   /* 12px - cards */
--radius-xl   /* 16px - large surfaces */
--radius-full /* 9999px - pills, circles */
```

### Shadows

```css
--shadow-sm   /* Subtle elevation */
--shadow-md   /* Medium elevation */
--shadow-lg   /* High elevation */
--shadow-xl   /* Maximum elevation */
```

### Focus Ring

```css
--focus-ring-width    /* 2px */
--focus-ring-offset   /* 2px */
--focus-ring-color    /* Gray-500 */
```

**Usage**: All interactive elements should use:
```tsx
className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
```

### Motion

```css
/* Duration */
--duration-fast     /* 100ms - instant feedback */
--duration-normal   /* 200ms - default transitions */
--duration-slow     /* 300ms - complex animations */
--duration-slower   /* 500ms - page transitions */

/* Easing */
--ease-in       /* Accelerate */
--ease-out      /* Decelerate */
--ease-in-out   /* Smooth */
```

**Respects `prefers-reduced-motion`**: Durations automatically set to 0ms for users who prefer reduced motion.

### Z-Index

Layered from lowest to highest:

```css
--z-base: 0
--z-dropdown: 1000
--z-sticky: 1100
--z-fixed: 1200
--z-modal-backdrop: 1300
--z-modal: 1400
--z-popover: 1500
--z-tooltip: 1600
--z-notification: 1700
```

## Using Tokens

### In Components

Always use Tailwind classes that map to tokens:

```tsx
// ✅ Good - uses token-based classes
<button className="bg-white text-gray-900 rounded-md px-4 py-2 transition-all duration-normal">
  Click me
</button>

// ❌ Bad - hard-coded values
<button style={{ 
  background: '#FFFFFF',
  color: '#1E1E1E',
  borderRadius: '8px',
  padding: '8px 16px'
}}>
  Click me
</button>
```

### Accessing Tokens Directly

When you need to access tokens in JavaScript (rare):

```tsx
// CSS variables are available on :root
const borderColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-border');
```

### Custom Values

If you absolutely need a value not in tokens:

1. **First**: Ask if the value should be a token
2. **If one-off**: Document why it's special
3. **Use arbitrary values**: `className="w-[347px]"` (discouraged)

## Extending Tokens

### Adding a New Token

1. **Add to `styles/tokens.css`**:
```css
--color-purple-500: #A855F7;
```

2. **Wire into `tailwind.config.ts`**:
```ts
colors: {
  purple: {
    500: 'var(--color-purple-500)',
  },
}
```

3. **Document** the new token and its usage in this file

4. **Update components** to use the new token

### Modifying a Token

Tokens are designed to be changed! Just update the value in `tokens.css` and the change cascades everywhere:

```css
/* Change button radius across entire app */
--radius-md: 0.5rem;  /* was 0.5rem, now 0.75rem */
```

## Theme Support

The system supports light/dark themes via the `data-theme` attribute:

```css
:root {
  /* Default (dark) theme */
  --color-background: #1E1E1E;
}

[data-theme="light"] {
  /* Light theme overrides */
  --color-background: #FFFFFF;
}
```

To switch themes:
```tsx
document.documentElement.setAttribute('data-theme', 'light');
```

**Note**: Currently only dark theme is actively used based on project preferences.

## Token Reference Quick Guide

| Need | Use | Example |
|------|-----|---------|
| Page background | `bg-gray-900` | `<body className="bg-gray-900">` |
| Card/surface | `bg-gray-800` | `<div className="bg-gray-800">` |
| Border | `border-gray-700` | `<div className="border border-gray-700">` |
| Primary text | `text-white` | `<p className="text-white">` |
| Secondary text | `text-gray-300` | `<p className="text-gray-300">` |
| Button radius | `rounded-md` | `<button className="rounded-md">` |
| Card radius | `rounded-lg` | `<div className="rounded-lg">` |
| Standard padding | `p-4` (16px) | `<div className="p-4">` |
| Standard gap | `gap-4` (16px) | `<div className="flex gap-4">` |
| Transition | `transition-all duration-normal` | `<div className="...">` |
| Focus ring | `focus-visible:ring-2` | `<button className="focus-visible:ring-2">` |
| Success state | `text-green-500` / `bg-green-600` | `<Badge variant="success">` |
| Error state | `text-red-500` / `bg-red-600` | `<Alert variant="error">` |

## Token-First Mindset

When building components, think in tokens:

1. **Don't think** "I need 16px padding"
2. **Think** "I need standard padding" → `p-4`

3. **Don't think** "I need #2B2B2B background"
4. **Think** "I need a card surface" → `bg-gray-800`

This keeps the design system consistent and makes global changes easy.

## Questions?

- Not sure which token to use? Check existing components for patterns
- Need a new token? Discuss with the team first
- Token seems wrong? It might affect multiple components - test changes in the gallery first

