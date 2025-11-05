# Command Dock - Component Library Documentation

## Overview

The Command Dock is a comprehensive keyboard-first interface system for command execution and search, similar to Spotlight (macOS) or Command Palette (VS Code/Cursor).

## Components

### CommandBar

**Category:** Navigation  
**File:** `command-dock/CommandBar.tsx`

A persistent floating bar at the bottom of the screen that provides:
- Universal search across artists, releases, and deliverables
- Command palette for quick actions
- Keyboard-first interaction (⌘K, /)
- Context-aware suggestions

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `artistId` | `string` | - | Current artist context ID |
| `releaseId` | `string` | - | Current release context ID |
| `organizationId` | `string` | - | Current organization context ID |
| `onOpen` | `() => void` | - | Callback when bar is opened |
| `onClose` | `() => void` | - | Callback when bar is closed |
| `onExecute` | `(commandId: string) => void` | - | Callback when command executes |

#### States

- **default** - Bar is visible but not focused
- **focus** - Input is focused, dropdown visible
- **loading** - Search is in progress

#### Usage

```tsx
import { CommandBar } from '@/components/command-dock';

// Basic usage - mount once at app level
<CommandBar />

// With context
<CommandBar 
  artistId={currentArtistId}
  releaseId={currentReleaseId}
  onExecute={(id) => console.log('Command executed:', id)}
/>
```

#### Keyboard Shortcuts

- `⌘K` or `Ctrl+K` - Focus command bar
- `/` - Focus command bar
- `↑` / `↓` - Navigate results
- `Enter` - Execute selected command/result
- `Esc` - Close dropdown and blur

#### Search Prefixes

- `a:` - Search artists only
- `r:` - Search releases only
- `f:` or `d:` - Search deliverables only
- No prefix - Search all content types

---

### ResultCard

**Category:** Data Display  
**File:** `command-dock/ResultCard.tsx`

A specialized card component for displaying search results and command items in the command bar dropdown.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `result` | `SearchResult \| ResultCardData` | **required** | Result data to display |
| `isSelected` | `boolean` | **required** | Whether result is keyboard-selected |
| `onClick` | `() => void` | **required** | Click handler |
| `resultType` | `'search' \| 'command'` | `'search'` | Type of result |

#### Variants

- **search** - Display search result with type icon (🎤 artist, 💿 release, 📦 deliverable, 📁 folder)
- **command** - Display command item without type icon

#### States

- **default** - Normal state
- **hover** - Mouse hover
- **selected** - Keyboard selected (via arrow keys)

#### Usage

```tsx
import { ResultCard } from '@/components/command-dock';

<ResultCard
  result={{
    id: '123',
    type: 'artist',
    title: 'Miles Davis',
    subtitle: 'Jazz • United States',
    href: '/artists/123'
  }}
  isSelected={selectedIndex === 0}
  onClick={() => navigate('/artists/123')}
  resultType="search"
/>
```

---

## Utilities

### Command Registry

**File:** `command-dock/commandRegistry.ts`

Exports:
- `commands` - Array of all registered commands
- `filterCommands(query, context)` - Filter commands by query with fuzzy matching

### Search Functions

**File:** `command-dock/search.ts`

Exports:
- `search(query)` - Universal search with prefix detection
- `searchArtists(query)` - Search artists only
- `searchReleases(query)` - Search releases only
- `searchAssets(query)` - Search deliverables only
- `searchAll(query)` - Search all types (interleaved results)

## Types

**File:** `types/command-dock.ts`

```typescript
export type CommandContext = {
  router: NextRouter;
  artistId?: string;
  releaseId?: string;
  organizationId?: string;
  route?: string;
};

export type Command = {
  id: string;
  title: string;
  hint?: string;
  keywords?: string[];
  visible?: (ctx: CommandContext) => boolean;
  run: (query: string, ctx: CommandContext) => Promise<ResultCardData>;
};

export type SearchResult = {
  id: string;
  type: 'artist' | 'release' | 'deliverable' | 'folder';
  title: string;
  subtitle?: string;
  href: string;
};
```

## Integration

### App-Level Setup

Mount CommandBar once at the root level:

```tsx
// pages/_app.tsx
import { CommandBar } from '@/components/command-dock';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <CommandBar />
    </>
  );
}
```

### Adding Custom Commands

```typescript
// command-dock/commandRegistry.ts

export const commands: Command[] = [
  // ... existing commands
  {
    id: 'my:custom:action',
    title: 'My Custom Action',
    hint: 'Description of what this does',
    keywords: ['custom', 'action', 'my'],
    visible: (ctx) => ctx.artistId !== undefined, // Optional: context-aware
    run: async (query, ctx) => {
      // Your logic here
      console.log('Executing custom action');
      
      return { 
        title: 'Action completed!',
        description: 'Optional success message'
      };
    },
  },
];
```

### Extending Search

```typescript
// command-dock/search.ts

export async function searchMyCustomType(query: string) {
  const { data } = await supabase
    .from('my_table')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10);
    
  return data.map(item => ({
    id: item.id,
    type: 'my_type' as const,
    title: item.name,
    subtitle: item.description,
    href: `/my-type/${item.id}`,
  }));
}
```

## Accessibility

### WCAG 2.1 AA Compliance

- ✅ Full keyboard navigation
- ✅ ARIA roles (dialog, listbox, option)
- ✅ ARIA states (aria-selected, aria-expanded)
- ✅ Focus management
- ✅ Screen reader announcements
- ✅ Visible focus indicators

### Keyboard Support

All interactions are fully keyboard accessible:
- Navigation through results
- Command execution
- Modal operations
- Dropdown management

## Styling

### Design System Integration

The command dock uses the project's design system:
- Colors: Gray scale with system colors (blue, green, red, yellow)
- Typography: System font stack
- Spacing: Consistent with design tokens
- Animations: Smooth transitions with easing functions

### Customization

Styling can be customized via Tailwind classes and CSS custom properties defined in `styles/globals.css`.

## Performance

- **Debounced search**: 200ms delay to prevent excessive API calls
- **Results limit**: Max 10 items per search to maintain performance
- **Lazy loading**: Search only executes when dropdown is open
- **Cancel in-flight**: Previous searches are cancelled when new query starts
- **Memoization**: Context and filter functions are memoized

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- macOS keyboard shortcuts (⌘K)
- Windows/Linux keyboard shortcuts (Ctrl+K)
- Requires localStorage for tab persistence
- Requires ES6+ features

## Related Components

- **Modal** (`overlay/Modal.tsx`) - Used for command execution modals
- **Toast** (`Toast.tsx`) - Used for command feedback
- **Input** (`form/Input.tsx`) - Similar input patterns
- **Card** (`layout/Card.tsx`) - Similar card patterns

## Future Enhancements

Planned extensions (documented, not yet implemented):
- **Agent Mode** - LLM-powered command assistance
- **Recent Searches** - History of previous searches
- **Command History** - Recently executed commands
- **Custom Keybindings** - User-configurable shortcuts
- **Drag & Drop** - File upload via drag onto button

