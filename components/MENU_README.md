# Menu Component

The `Menu` component is a reusable dropdown menu that provides consistent styling and behavior for all menu interactions in the application.

## Features

- **Click outside to close**: Automatically closes when clicking outside the menu
- **Keyboard accessible**: Proper focus management and keyboard navigation
- **Flexible positioning**: Can appear above or below the trigger button
- **Disabled states**: Support for disabled menu items
- **Consistent styling**: Matches the application's dark theme

## Props

- `isOpen`: boolean - Controls whether the menu is visible
- `onClose`: () => void - Function called when the menu should close
- `items`: MenuItem[] - Array of menu items to display
- `position`: 'top' | 'bottom' (default: 'bottom') - Where the menu appears relative to the trigger
- `className`: string - Additional CSS classes

## MenuItem Interface

```tsx
interface MenuItem {
  label: string;        // Text to display
  onClick: () => void;  // Function to call when clicked
  disabled?: boolean;    // Whether the item is disabled
}
```

## Usage Examples

### Basic Menu

```tsx
import Menu from '../components/Menu';

const [isOpen, setIsOpen] = useState(false);

<Menu
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  items={[
    {
      label: 'Option 1',
      onClick: () => console.log('Option 1 clicked')
    },
    {
      label: 'Option 2',
      onClick: () => console.log('Option 2 clicked')
    }
  ]}
/>
```

### Menu with Disabled Items

```tsx
<Menu
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  items={[
    {
      label: 'Active Option',
      onClick: handleActiveClick
    },
    {
      label: 'Disabled Option',
      onClick: () => {},
      disabled: true
    }
  ]}
/>
```

### Top-Positioned Menu

```tsx
<Menu
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  position="top"
  items={menuItems}
/>
```

## Implementation in GlobalNavigation

The Menu component is used in two places in the GlobalNavigation:

### 1. New Button Menu

```tsx
<Menu
  isOpen={showNewDropdown}
  onClose={() => setShowNewDropdown(false)}
  items={[
    {
      label: 'New Artist',
      onClick: handleNewArtist
    },
    {
      label: 'New Release',
      onClick: () => {},
      disabled: true
    },
    {
      label: 'New Deliverable',
      onClick: () => {},
      disabled: true
    }
  ]}
/>
```

### 2. User Menu

```tsx
<Menu
  isOpen={showUserMenu}
  onClose={() => setShowUserMenu(false)}
  items={[
    {
      label: 'Settings',
      onClick: () => {},
      disabled: true
    },
    {
      label: 'Logout',
      onClick: handleLogout
    }
  ]}
  position="top"
/>
```

## Styling

The Menu component uses consistent styling that matches the application theme:

- **Background**: `bg-gray-800`
- **Border**: `border-gray-700`
- **Text**: `text-white` for active items, `text-gray-400` for disabled
- **Hover**: `hover:bg-gray-700` for active items
- **Shadow**: `shadow-lg` for depth
- **Z-index**: `z-10` to appear above other content

## Accessibility

- **Focus management**: Proper focus handling when menu opens/closes
- **Keyboard navigation**: Arrow keys to navigate between items
- **Screen reader support**: Proper ARIA attributes
- **Click outside**: Closes when clicking outside the menu area

## Benefits

1. **Consistency**: All menus in the app have the same look and behavior
2. **Reusability**: Easy to create new menus throughout the application
3. **Maintainability**: Changes to menu styling only need to be made in one place
4. **Accessibility**: Built-in accessibility features
5. **Flexibility**: Supports different positions and disabled states 