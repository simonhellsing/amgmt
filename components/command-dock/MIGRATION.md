# Command Dock → Command Bar Migration

## What Changed

Redesigned from a **modal command palette** to a **persistent bottom bar** (like Cursor).

### Before (Modal)
- Floating button opens modal
- Modal overlays the entire screen
- Commands navigate to other pages

### After (Bottom Bar)
- Always-visible bar at bottom of screen
- Inline input with dropdown results
- Commands open modals on top of current page
- No navigation - actions happen in-place

## Key Changes

1. **New Component**: `CommandBar.tsx` replaces `CommandDock.tsx`
2. **Persistent UI**: Always visible at bottom (not a button)
3. **Modal Integration**: Opens AddArtistForm and NewReleaseForm directly
4. **No Navigation**: Create actions open modals, don't redirect
5. **Smart Detection**: Auto-detects commands vs searches
6. **Body Padding**: Added `padding-bottom: 4rem` to body for bar space

## Files

- ✅ `CommandBar.tsx` - New persistent bottom bar
- ⚠️ `CommandDock.tsx` - Old modal (kept for reference, not used)
- ✅ `commandRegistry.ts` - Updated create commands
- ✅ `_app.tsx` - Switched to CommandBar
- ✅ `globals.css` - Added body padding

## Usage

The bar is now always visible at the bottom. Users can:

1. **Click to focus** the input
2. **Press ⌘K or /** to focus from anywhere
3. **Type commands**: "create artist", "new release", etc.
4. **Type searches**: Artist names, release titles, etc.
5. **Use keyboard**: ↑/↓ to navigate, Enter to select

## Command Detection

Automatically detects commands when input starts with:
- `create ...`
- `new ...`
- `add ...`
- `go to ...`
- `open ...`
- `upload ...`

Everything else is treated as search.

## Modals

- **Create Artist**: Opens AddArtistForm in Modal
- **Create Release**: Opens NewReleaseForm (already modal-aware)
- Future: Upload file, create deliverable, etc.

## Benefits

✅ Faster access (no need to open modal first)
✅ Context preserved (stay on current page)
✅ More natural (type anywhere, anytime)
✅ Cursor-like experience
✅ Actions don't disrupt workflow

