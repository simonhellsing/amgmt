# Command Dock

A keyboard-first command palette and search interface for the application.

## Features

- **Floating button**: Always accessible from bottom-right corner
- **Keyboard shortcuts**: 
  - `⌘K` / `Ctrl+K` - Open in Commands mode
  - `/` - Open in Search mode
  - `↑` / `↓` - Navigate results
  - `Enter` - Execute/select
  - `Esc` - Close
- **Dual modes**:
  - **Search**: Find artists, releases, and assets
  - **Commands**: Quick actions and navigation
- **Smart search**: 
  - Use prefixes like `a:`, `r:`, `f:` to filter by type
  - Debounced queries (200ms)
  - Interleaved results from all content types
- **Context-aware**: Accepts context props for page-specific functionality
- **Persistent state**: Remembers last active tab via localStorage
- **Full accessibility**: ARIA roles, keyboard navigation, focus management

## Usage

### Basic Integration

The CommandDock is already integrated in `_app.tsx` and available on all pages:

```tsx
import CommandDock from '@/components/command-dock/CommandDock';

<CommandDock />
```

### With Context

Pass context to enable context-aware commands:

```tsx
<CommandDock 
  artistId={artistId}
  releaseId={releaseId}
  organizationId={orgId}
/>
```

### Event Handlers

```tsx
<CommandDock
  onOpen={() => console.log('Opened')}
  onClose={() => console.log('Closed')}
  onExecute={(commandId) => console.log('Executed:', commandId)}
/>
```

## Architecture

### Components

- **CommandDock.tsx** - Main component with modal, tabs, and keyboard handling
- **ResultCard.tsx** - Reusable result item component
- **commandRegistry.ts** - Command definitions and filtering logic
- **search.ts** - Supabase search functions
- **useHotkeys.ts** - Keyboard shortcut hook
- **types/command-dock.ts** - TypeScript definitions

### Search Functionality

Search supports:
- Artists (by name, region, country)
- Releases (by title, type, catalog number, status)
- Deliverables (by name, type, status)

Prefix filters:
- `a:` - Artists only
- `r:` - Releases only  
- `f:` or `d:` - Deliverables only
- No prefix - All types (interleaved)

### Commands

Current commands:
- `create:artist` - Navigate to artists page
- `create:release` - Navigate to releases page
- `navigate:home` - Go to home
- `navigate:artists` - Go to artists
- `navigate:releases` - Go to releases
- `navigate:calendar` - Go to calendar
- `navigate:settings` - Go to settings

## Extending

### Adding New Commands

Edit `components/command-dock/commandRegistry.ts`:

```typescript
{
  id: 'my:command',
  title: 'My Custom Command',
  hint: 'Does something useful',
  keywords: ['custom', 'action'],
  visible: (ctx) => ctx.artistId !== undefined, // Optional
  run: async (query, ctx) => {
    // Execute your logic
    ctx.router.push('/somewhere');
    return { 
      title: 'Success!',
      description: 'Command executed',
      href: '/somewhere'
    };
  },
}
```

### Adding Search Types

Edit `components/command-dock/search.ts`:

```typescript
export async function searchMyType(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(10);
    
  return (data ?? []).map(item => ({
    id: item.id,
    type: 'my_type' as const,
    title: item.name,
    subtitle: item.description,
    href: `/my-type/${item.id}`,
  }));
}
```

Then update `searchAll()` to include your new type.

## Future Extensions

The system is designed for easy extension:

### Agent Mode (Future)

Add a third tab for LLM-powered assistance:

1. Add `'agent'` to `TabMode` type
2. Create `AgentPanel.tsx` component
3. Implement `executeLLM(input, context)` handler
4. Reuse existing `ResultCard` for streaming responses

### Analytics

Uncomment the analytics stubs and replace with your tracking solution:

```typescript
// trackEvent('command_dock_opened', { tab: defaultTab });
// trackEvent('command_dock_search_selected', { type: searchResult.type, query });
// trackEvent('command_dock_command_executed', { command_id: command.id });
```

### Context Suggestions

Show relevant actions based on current page/context:

```typescript
if (ctx.route === '/releases' && ctx.releaseId) {
  suggestions.push({ 
    title: 'Upload asset', 
    action: () => openUploadModal() 
  });
}
```

### Drag & Drop

Handle file drops on the floating button (stub implementation):

```typescript
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  open('commands');
  // Preselect upload command with files
};
```

## Testing

Test file: `__tests__/command-dock.spec.tsx`

To run tests, first install testing dependencies:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom
```

Then implement the test stubs and run:

```bash
npm test
```

## Accessibility

- ✅ ARIA `role="dialog"` and `aria-modal="true"`
- ✅ Results use `role="listbox"` and `role="option"`
- ✅ `aria-selected` on active items
- ✅ Focus trap within modal
- ✅ Focus returns to trigger on close
- ✅ Keyboard navigation (arrows, Enter, Esc)
- ✅ Screen reader friendly labels

## Performance

- Debounced search (200ms)
- Lazy loading (only searches when modal is open)
- Results limited to 10 items
- Cancel in-flight requests on query change
- localStorage for state persistence

## Browser Support

- Modern browsers with ES6+ support
- localStorage required for tab persistence
- Keyboard shortcuts work on macOS (⌘K) and Windows/Linux (Ctrl+K)

