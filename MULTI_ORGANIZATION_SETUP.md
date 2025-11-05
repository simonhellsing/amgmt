# Multi-Organization Support

## Overview
The system now supports multiple organizations with the ability to switch between them. Users can have access to multiple organizations and seamlessly switch between them in the navigation.

## What Was Implemented

### 1. Organization Context (`lib/OrganizationContext.tsx`)
- **Global state management** for the currently selected organization
- **Automatic loading** of all organizations the user has access to
- **LocalStorage persistence** to remember the last selected organization
- **Event system** to notify components when the organization changes

### 2. Updated Global Navigation
- **Organization selector** in the workspace dropdown menu
- Shows **all organizations** the user has access to
- **Visual indicator** (checkmark) next to the currently selected organization
- **Settings and Logout** options below the organization list
- **Current organization display** under "All artists" section

### 3. Organization-Filtered Data
All data queries now automatically filter by the selected organization:
- **Artists**: Only shows artists belonging to the selected organization
- **Releases**: Only shows releases from artists in the selected organization
- **Deliverables**: Automatically filtered through their parent releases
- **Navigation artist list**: Updates automatically when switching organizations

### 4. New Artists Auto-Link
When creating a new artist, it's automatically linked to the currently selected organization.

## How It Works

### User Flow
1. **Login**: System loads all organizations the user has access to
2. **Auto-select**: If a previous organization was selected (from localStorage), it's automatically selected. Otherwise, the first organization is selected.
3. **Switch organizations**: Click the workspace button → Select a different organization from the list
4. **Data updates**: All pages automatically refresh to show data from the new organization

### Technical Flow
```
User switches organization
    ↓
OrganizationContext updates selectedOrganization
    ↓
Context saves selection to localStorage
    ↓
Context dispatches 'organizationChanged' event
    ↓
Components listening to the event refresh their data
    ↓
accessControl functions read from localStorage
    ↓
Data queries filter by organization_id
```

## Database Setup

### Run These SQL Scripts (in order):

1. **`link_artists_to_organizations.sql`**
   - Links all existing artists to organizations
   - Ensures no artist is left without an organization

2. **`nuclear_fix_access.sql`** (if you haven't run it already)
   - Grants proper access to all organizations
   - Fixes RLS policies for artist creation

### What Got Updated:
- `artists` table: Added `organization_id` filtering
- `access_grants`: All users now have proper organization access
- RLS policies: Allow authenticated users to create/manage artists

## Code Changes Summary

### New Files:
- `lib/OrganizationContext.tsx` - Organization state management
- `MULTI_ORGANIZATION_SETUP.md` - This documentation
- `link_artists_to_organizations.sql` - Database migration

### Modified Files:
- `pages/_app.tsx` - Wrapped app in OrganizationProvider
- `components/GlobalNavigation.tsx` - Added organization selector UI
- `components/AddArtistForm.tsx` - Auto-link new artists to selected org
- `lib/accessControl.ts` - Added organization filtering to:
  - `getAccessibleArtists()`
  - `getAccessibleReleases()`

## Usage Examples

### Switching Organizations
```tsx
import { useOrganization } from '@/lib/OrganizationContext';

function MyComponent() {
  const { selectedOrganization, allOrganizations, setSelectedOrganization } = useOrganization();
  
  // Display current organization
  console.log(selectedOrganization?.name);
  
  // Switch to a different organization
  const switchToOrg = (org) => {
    setSelectedOrganization(org);
  };
}
```

### Filtering Data by Organization
Data is automatically filtered - just call the existing functions:
```tsx
import { getAccessibleArtists } from '@/lib/accessControl';

// Automatically filters by selected organization from localStorage
const artists = await getAccessibleArtists();

// Or explicitly pass an organization ID
const artists = await getAccessibleArtists({ organizationId: 'specific-org-id' });
```

### Listening to Organization Changes
```tsx
useEffect(() => {
  const handleOrgChange = (event) => {
    const newOrg = event.detail;
    // Refresh your data here
  };
  
  window.addEventListener('organizationChanged', handleOrgChange);
  return () => window.removeEventListener('organizationChanged', handleOrgChange);
}, []);
```

## Features

✅ **Multi-organization support** - Users can belong to multiple organizations  
✅ **Easy switching** - One-click organization switching in the navigation  
✅ **Automatic filtering** - All data automatically filters by selected organization  
✅ **Persistent selection** - Last selected organization is remembered  
✅ **Visual indicators** - Clear UI showing current organization  
✅ **Event system** - Components can react to organization changes  
✅ **Auto-linking** - New resources automatically link to current organization  

## Next Steps (Optional Enhancements)

1. **Organization Management Page**
   - Create/edit/delete organizations
   - Manage organization settings
   - Upload organization logos

2. **Organization-Level Permissions**
   - Define roles at the organization level
   - Cascade permissions from organization to artists/releases

3. **Organization Switcher Keyboard Shortcut**
   - Add Cmd+K / Ctrl+K quick switcher

4. **Organization Analytics Dashboard**
   - View statistics per organization
   - Compare metrics across organizations

## Troubleshooting

### Artists not showing up?
1. Ensure artists are linked to an organization: Run `link_artists_to_organizations.sql`
2. Check that you have access to the organization
3. Try switching to a different organization and back

### Can't create artists?
1. Ensure RLS policies are set up: Run `nuclear_fix_access.sql`
2. Check that you have "full" access to at least one organization
3. Verify you have an organization selected

### Organization dropdown is empty?
1. Check that you have access grants for at least one organization
2. Run `nuclear_fix_access.sql` to grant access
3. Try logging out and back in

## Support

For issues or questions, check:
1. Browser console for error messages
2. Supabase logs for database errors
3. Network tab to see failed API calls

