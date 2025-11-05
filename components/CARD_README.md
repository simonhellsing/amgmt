# Card Components

This directory contains reusable card components that provide consistent styling for displaying content in card format.

## Base Card Component

The `Card` component is a base component that provides consistent styling and behavior for all cards in the application.

### Props

- `children`: React.ReactNode - The content to display inside the card
- `className`: string - Additional CSS classes
- `onClick`: () => void - Click handler for interactive cards
- `href`: string - URL for cards that act as links

### Features

- **Consistent styling**: Dark theme with hover effects
- **Interactive**: Optional click handlers and link behavior
- **Responsive**: Works well on all screen sizes
- **Accessible**: Proper focus states and keyboard navigation

### Examples

```tsx
import Card from '../components/Card';

// Basic card
<Card>
  <div className="p-4">
    <h3>Card Title</h3>
    <p>Card content goes here</p>
  </div>
</Card>

// Interactive card with click handler
<Card onClick={() => console.log('Card clicked')}>
  <div className="p-4">
    <h3>Clickable Card</h3>
  </div>
</Card>

// Card as a link
<Card href="/some-page">
  <div className="p-4">
    <h3>Link Card</h3>
  </div>
</Card>
```

## ArtistCard Component

The `ArtistCard` component is a specialized card for displaying artist information with image and details.

### Props

- `artist`: Artist object with id, name, region, country, and image_url
- `className`: string - Additional CSS classes

### Features

- **Image display**: Shows artist image or placeholder icon
- **Responsive layout**: Image on top, details below
- **Navigation**: Links to artist detail page
- **Hover effects**: Smooth transitions and scaling
- **Text truncation**: Handles long names and locations gracefully

### Artist Object Structure

```tsx
interface Artist {
  id: string;
  name: string;
  region?: string | null;
  country?: string | null;
  image_url?: string | null;
}
```

### Examples

```tsx
import ArtistCard from '../components/ArtistCard';

// Basic usage
<ArtistCard artist={artist} />

// With custom styling
<ArtistCard 
  artist={artist} 
  className="max-w-sm"
/>

// In a grid layout
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {artists.map(artist => (
    <ArtistCard key={artist.id} artist={artist} />
  ))}
</div>
```

## Creating Custom Card Variants

You can create new card variants by extending the base Card component:

```tsx
import Card from './Card';

// Example: Album Card
interface AlbumCardProps {
  album: {
    id: string;
    title: string;
    artist: string;
    cover_url?: string;
  };
}

export default function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Card href={`/albums/${album.id}`}>
      <div className="aspect-square bg-gray-700 relative overflow-hidden">
        {album.cover_url ? (
          <img
            src={album.cover_url}
            alt={album.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white text-lg mb-1 truncate">
          {album.title}
        </h3>
        <p className="text-gray-400 text-sm truncate">
          {album.artist}
        </p>
      </div>
    </Card>
  );
}
```

## Styling Guidelines

### Card Structure
- Use consistent padding (p-4) for content areas
- Maintain aspect ratios for images (aspect-square)
- Use proper text hierarchy (text-lg for titles, text-sm for details)

### Colors
- Background: bg-gray-800
- Borders: border-gray-700 with hover:border-blue-500
- Text: text-white for titles, text-gray-400 for details
- Hover effects: hover:shadow-xl and hover:scale-105

### Spacing
- Use gap-6 for grid layouts
- Maintain consistent padding inside cards
- Use proper margins for text hierarchy

## Benefits

1. **Consistency**: All cards have the same base styling and behavior
2. **Reusability**: Easy to create new card variants
3. **Maintainability**: Changes to card styling only need to be made in one place
4. **Accessibility**: Built-in focus states and proper navigation
5. **Performance**: Optimized hover effects and transitions 