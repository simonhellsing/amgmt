# AMGMT Product Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database & Models](#database--models)
4. [Authentication & Authorization](#authentication--authorization)
5. [Core Features](#core-features)
6. [Component Library](#component-library)
7. [Utilities & Configurations](#utilities--configurations)
8. [Known Limitations / TODOs](#known-limitations--todos)
9. [How to Extend](#how-to-extend)

---

## 1. Overview

### What is AMGMT?

AMGMT is a music management application designed for managing artists, releases, deliverables, and assets. It provides a comprehensive system for organizing music production workflows, tracking deliverables, managing files, and controlling access across teams.

**Target Users:**
- Music labels and production companies
- Artist managers and producers
- Content creators and distributors
- Teams collaborating on music releases

### Tech Stack

**Frontend:**
- **Next.js** (v15.4.4) - React framework with Pages Router
- **React** (v19.1.0) - UI library
- **Tailwind CSS** (v4) - Utility-first styling
- **Lucide React** (v0.536.0) - Icon library
- **TypeScript** (v5) - Type-safe development

**Backend & Database:**
- **Supabase** - Backend-as-a-Service providing:
  - PostgreSQL database
  - Row Level Security (RLS)
  - Authentication
  - Storage for file uploads
  - Real-time subscriptions

**Email Service:**
- **Resend API** - Email delivery for invitations and notifications

**Development:**
- **ESLint** - Code quality and consistency
- **PostCSS** - CSS processing
- Development server runs on port 3001

---

## 2. Architecture

### Project Structure

```
/Users/simonh/amgmt/
├── pages/              # Next.js Pages Router
│   ├── api/           # API routes (serverless functions)
│   ├── artists/       # Artist pages
│   ├── releases/      # Release pages
│   ├── deliverables/  # Deliverable pages
│   ├── folders/       # Folder pages
│   ├── auth/          # Authentication pages
│   └── system/        # System/admin pages
├── components/         # React components
│   ├── ui/            # UI primitives (Button, Modal, etc.)
│   ├── form/          # Form components
│   ├── layout/        # Layout components
│   ├── feedback/      # Feedback components (Toast, Alert, etc.)
│   └── overlay/       # Overlay components (Modal)
├── lib/               # Utility libraries
│   ├── supabase.ts    # Supabase client
│   ├── accessControl.ts # Permission system
│   ├── releaseAccess.ts # Release-specific access
│   ├── usePermissions.ts # React hooks for permissions
│   ├── cache.ts       # Caching utilities
│   └── useToast.ts    # Toast notification hook
├── styles/            # Global styles
│   ├── globals.css    # Global CSS
│   └── tokens.css     # Design tokens
├── public/            # Static assets
└── *.sql              # Database migration scripts
```

### Data Flow Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ├─── React Components (UI)
       │    └─── lib/accessControl.ts (Business Logic)
       │         └─── lib/supabase.ts (API Client)
       │              └─── Supabase Backend
       │                   ├─── PostgreSQL Database
       │                   ├─── Storage (Files)
       │                   └─── Auth System
       │
       └─── pages/api/* (Next.js API Routes)
            └─── Resend API (Email Service)
```

### Key Architectural Decisions

1. **Supabase as Backend**: All data operations, authentication, and file storage are handled by Supabase, eliminating the need for a custom backend.

2. **Row Level Security (RLS)**: Database-level security ensures users can only access data they have permissions for, enforced at the PostgreSQL level.

3. **Permission-Based Filtering**: Access control is implemented at the query level, with functions that filter results based on user permissions before returning data to the client.

4. **Cascading Permissions**: Permissions follow a hierarchy:
   - Organization → Artist → Release → Deliverable → Folder
   - Higher-level access grants automatic access to child resources

5. **Caching Layer**: Request deduplication and caching (5-minute TTL) minimize database queries and improve performance.

6. **Component-Driven UI**: Reusable component library with design tokens ensures consistency across the application.

7. **Next.js API Routes**: Server-side API routes handle sensitive operations like email invitations that require API keys.

---

## 3. Database & Models

### Core Tables

#### **artists**
Represents musical artists or bands.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Artist name |
| `region` | TEXT | Geographic region (optional) |
| `country` | TEXT | Country (optional) |
| `image_url` | TEXT | Profile image URL (optional) |
| `organization_id` | UUID | Organization this artist belongs to (optional) |
| `created_at` | TIMESTAMP | Creation timestamp |

#### **releases**
Represents music releases (albums, singles, EPs).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Release title |
| `cover_url` | TEXT | Cover art URL (optional) |
| `type` | TEXT | Release type (album, single, EP, etc.) |
| `status` | TEXT | Status (not_started, in_progress, final) |
| `catalog_number` | TEXT | Catalog number (optional) |
| `online` | TEXT | Online release date (optional) |
| `offline` | TEXT | Offline release date (optional) |
| `created_at` | TIMESTAMP | Creation timestamp |

#### **release_artists**
Many-to-many relationship between releases and artists.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `release_id` | UUID | Foreign key to releases |
| `artist_id` | UUID | Foreign key to artists |
| `created_at` | TIMESTAMP | Creation timestamp |

#### **deliverables**
Represents deliverable items within a release (asset packs, folders, files).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Deliverable name |
| `type` | TEXT | Type (pack, folder, file, other) |
| `description` | TEXT | Description (optional) |
| `release_id` | UUID | Foreign key to releases |
| `online_deadline` | TIMESTAMP | Online deadline (optional) |
| `offline_deadline` | TIMESTAMP | Offline deadline (optional) |
| `status` | TEXT | Status (not_started, in_progress, completed, final) |
| `created_at` | TIMESTAMP | Creation timestamp |

#### **deliverable_files**
Individual files within a deliverable.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | File name |
| `file_type` | TEXT | MIME type |
| `file_size` | INTEGER | Size in bytes |
| `file_url` | TEXT | Storage URL |
| `deliverable_id` | UUID | Foreign key to deliverables |
| `status` | TEXT | Status (in_progress, final) |
| `created_at` | TIMESTAMP | Creation timestamp |

#### **folders**
Additional folder structure for organizing files by artist.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Folder name |
| `description` | TEXT | Description (optional) |
| `artist_id` | UUID | Foreign key to artists |
| `file_count` | INTEGER | Number of files (optional) |
| `created_at` | TIMESTAMP | Creation timestamp |

#### **user_profiles**
User profile information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (matches auth.users.id) |
| `email` | TEXT | User email |
| `first_name` | TEXT | First name (optional) |
| `last_name` | TEXT | Last name (optional) |
| `avatar_url` | TEXT | Profile picture URL (optional) |
| `phone_number` | TEXT | Phone number (optional) |
| `location` | TEXT | Location (optional) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Access Control Tables

#### **access_grants**
Core table for permission-based access control.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `resource_type` | ENUM | Type (organization, artist, release, deliverable, folder, collection) |
| `resource_id` | UUID | ID of the resource |
| `user_id` | UUID | Foreign key to auth.users (optional) |
| `email` | TEXT | User email (for pending invites) |
| `access_level` | ENUM | Level (view, artist, edit, full) |
| `granted_by` | UUID | User who granted access (optional) |
| `granted_at` | TIMESTAMP | When access was granted |
| `invited_at` | TIMESTAMP | When user was invited |
| `accepted_at` | TIMESTAMP | When user accepted (optional) |
| `expires_at` | TIMESTAMP | Expiration date (optional) |
| `is_active` | BOOLEAN | Whether access is active |
| `invite_token` | TEXT | Invitation token (optional) |
| `invite_sent_at` | TIMESTAMP | When invitation email was sent (optional) |

**Unique Constraint:** `(resource_type, resource_id, email)`

#### **collections**
User-created collections for grouping mixed content.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Collection name |
| `description` | TEXT | Description (optional) |
| `created_by` | UUID | Foreign key to auth.users |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `is_public` | BOOLEAN | Public visibility |
| `public_token` | TEXT | Public access token (optional) |
| `public_expires_at` | TIMESTAMP | Token expiration (optional) |

#### **collection_items**
Items within collections.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `collection_id` | UUID | Foreign key to collections |
| `item_type` | ENUM | Type (artist, release, deliverable, folder) |
| `item_id` | UUID | ID of the item |
| `sort_order` | INTEGER | Display order |
| `added_by` | UUID | User who added item |
| `added_at` | TIMESTAMP | When item was added |

**Unique Constraint:** `(collection_id, item_type, item_id)`

#### **share_links**
Public share links for resources.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `resource_type` | ENUM | Type of resource |
| `resource_id` | UUID | ID of resource |
| `token` | TEXT | Unique access token |
| `access_level` | ENUM | Permission level (default: view) |
| `created_by` | UUID | Creator |
| `created_at` | TIMESTAMP | Creation timestamp |
| `expires_at` | TIMESTAMP | Expiration date (optional) |
| `max_uses` | INTEGER | Maximum uses (optional) |
| `use_count` | INTEGER | Current use count |
| `is_active` | BOOLEAN | Active status |
| `title` | TEXT | Link title (optional) |
| `description` | TEXT | Link description (optional) |

#### **invite_tokens**
Email invitation tokens.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `token` | TEXT | Unique token |
| `access_grant_id` | UUID | Foreign key to access_grants |
| `email` | TEXT | Invited email |
| `expires_at` | TIMESTAMP | Expiration date |
| `used_at` | TIMESTAMP | When token was used (optional) |
| `created_at` | TIMESTAMP | Creation timestamp |

### Enums

#### **access_level**
```sql
CREATE TYPE access_level AS ENUM ('view', 'artist', 'edit', 'full');
```

**Permission Hierarchy:**
- **View:** Read-only access, can view and download content
- **Artist:** View + comment, approve/reject files
- **Edit:** Artist + upload files, create/edit/delete deliverables, manage metadata
- **Full:** Edit + manage access, invite users, manage share links, override approvals

#### **resource_type**
```sql
CREATE TYPE resource_type AS ENUM ('organization', 'artist', 'release', 'deliverable', 'folder', 'collection');
```

### Relationships

```
organizations
    └── artists (organization_id)
        ├── releases (via release_artists)
        │   └── deliverables
        │       └── deliverable_files
        └── folders

access_grants (resource_type + resource_id → any resource)
collections → collection_items (item_type + item_id → any resource)
share_links (resource_type + resource_id → any resource)
```

### Database Triggers & Functions

**Key Functions:**
- `has_access(resource_type, resource_id, required_level)`: Check if user has required access level
- `cleanup_expired_items()`: Clean up expired tokens, links, and access grants
- `generate_collection_token()`: Generate unique token for public collections
- `trigger_collection_public_token()`: Auto-generate token when collection is made public
- `trigger_collection_updated()`: Update collection timestamp on changes

---

## 4. Authentication & Authorization

### Authentication Flow

1. **Sign Up:**
   - Users can sign up with email/password or Google SSO
   - Email verification may be required (Supabase configuration)
   - User profile is created automatically in `user_profiles` table

2. **Sign In:**
   - Email/password authentication
   - Google OAuth (via Supabase Auth)
   - Session managed by Supabase Auth tokens

3. **Password Reset:**
   - Forgot password flow via Supabase Auth
   - Email with reset link sent to user
   - User redirected to password update page

4. **Session Management:**
   - Supabase handles JWT tokens automatically
   - `AuthWrapper` component enforces authentication on protected pages
   - Automatic redirect to `/login` for unauthenticated users

### Authorization System

#### Permission Levels

**1. View Access (`view`)**
- View and download content
- Read-only permissions

**2. Artist Access (`artist`)**
- All View permissions
- Comment on files
- Approve/reject files
- Intended for artists collaborating on their own releases

**3. Edit Access (`edit`)**
- All Artist permissions
- Upload files
- Create/edit/delete deliverables
- Manage metadata
- Change file status
- Intended for producers, managers, coordinators

**4. Full Access (`full`)**
- All Edit permissions
- Manage access (invite users, revoke access)
- Override approvals
- Manage share links
- Create collections
- Intended for administrators and project owners

#### Cascading Permissions

Permissions cascade from parent to child resources:

```
Organization (Full) → Artist (Full) → Release (Full) → Deliverable (Full)
```

**Key Rules:**
1. If you have access to an **artist**, you automatically have access to:
   - All current releases by that artist
   - All future releases created for that artist
   - All folders for that artist

2. If you have access to a **release**, you automatically have access to:
   - All deliverables in that release
   - All files in those deliverables

3. Access levels can be **overridden** at lower levels:
   - Artist-level "view" can be overridden with release-level "edit"
   - Highest permission level always wins

#### Permission Checking

**Client-Side:**
```typescript
import { canCurrentUserPerformAction, usePermissions } from '@/lib/accessControl';

// Single permission check
const canEdit = await canCurrentUserPerformAction('upload_files', 'release', releaseId);

// Multiple permissions with React hook
const { permissions, loading, checkPermission } = usePermissions('release', releaseId, [
  'view',
  'upload_files',
  'manage_access'
]);
```

**Database-Level:**
```sql
-- Row Level Security policy example
CREATE POLICY "Users can view resources they have access to" ON releases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.resource_type = 'release'
      AND ag.resource_id = releases.id
      AND ag.user_id = auth.uid()
      AND ag.is_active = true
    )
  );
```

#### Permission-Based Filtering

Access control is enforced through filtering functions that only return resources the user has access to:

```typescript
// Get only accessible artists
const artists = await getAccessibleArtists();

// Get only accessible releases
const releases = await getAccessibleReleases();

// Get accessible releases for a specific artist
const artistReleases = await getAccessibleArtistReleases(artistId);

// Get accessible deliverables for a release
const deliverables = await getAccessibleDeliverables(releaseId);
```

### Access Management

**Inviting Users:**
1. User with "full" access clicks "Share" button
2. Enters email addresses (one per line)
3. Selects access level (view, artist, edit, full)
4. System creates `access_grants` entries
5. Email invitations sent via Resend API
6. Recipients receive email with signup/login link
7. On first login, `user_id` is populated in `access_grants`

**Changing Access:**
- Only users with "full" access can manage permissions
- Can upgrade/downgrade access levels
- Can revoke access entirely

**Bulk Management:**
- Settings page has "Access Management" tab
- View all users and their permissions
- Filter by resource type, access level
- Search users by email
- Bulk invite multiple users

---

## 5. Core Features

### Artist Management

**Purpose:** Organize and manage musical artists/bands.

**Key Files:**
- `pages/artists.tsx` - Artist listing page
- `pages/artists/[id].tsx` - Artist detail page
- `components/ArtistCard.tsx` - Artist card component
- `components/AddArtistForm.tsx` - Create artist form
- `components/ArtistEditForm.tsx` - Edit artist form
- `components/ArtistImageUploader.tsx` - Upload artist images

**Database Tables:**
- `artists` - Artist records
- `access_grants` (resource_type='artist') - Artist permissions

**Features:**
- Create/edit/delete artists
- Upload artist profile images
- View artist's releases and folders
- Share artist access with team members
- Filter visible artists based on user permissions

**Permissions:**
- Users only see artists they have access to (direct, organization, or release-based)
- Full access required to manage artist settings and invite users

### Release Management

**Purpose:** Track music releases (albums, singles, EPs) and their progress.

**Key Files:**
- `pages/releases.tsx` - Release listing page
- `pages/releases/[id].tsx` - Release detail page
- `components/ReleaseCard.tsx` - Release card component
- `components/NewReleaseForm.tsx` - Create release form
- `components/ReleaseEditForm.tsx` - Edit release form

**Database Tables:**
- `releases` - Release records
- `release_artists` - Artist associations
- `deliverables` - Deliverables within releases
- `access_grants` (resource_type='release') - Release permissions

**Features:**
- Create releases with multiple artists
- Set online/offline dates, catalog numbers
- Track release status (draft, in progress, completed)
- Manage deliverables within releases
- Upload cover art
- Share release access
- Add suggested deliverables (templates)
- Bulk operations on deliverables

**Release Status Logic:**
- **Draft** (not_started): No deliverables or all not started
- **In Progress** (in_progress): At least one deliverable in progress
- **Completed** (final): All deliverables marked as final

**Permissions:**
- View: See release details and files
- Artist: View + approve/reject files
- Edit: Artist + manage deliverables
- Full: Edit + manage access

### Deliverable Management

**Purpose:** Organize asset packs and folders within releases.

**Key Files:**
- `pages/deliverables/[id].tsx` - Deliverable detail page
- `components/NewDeliverableForm.tsx` - Create deliverable form
- `components/DeliverableHeader.tsx` - Deliverable header component

**Database Tables:**
- `deliverables` - Deliverable records
- `deliverable_files` - Files within deliverables
- `access_grants` (resource_type='deliverable') - Deliverable permissions (inherited from release)

**Features:**
- Create deliverable items (asset packs, folders, files)
- Set deadlines (online/offline)
- Upload multiple files (drag & drop supported)
- Preview files (images, documents, etc.)
- Mark files as final
- Bulk operations (select multiple files, mark as final, delete)
- Track deliverable status based on file statuses
- Download files

**Deliverable Types:**
- **Pack**: Collection of assets
- **Folder**: Organized folder of files
- **File**: Single file deliverable
- **Other**: Custom type

**Deliverable Status Logic:**
- **Not Started**: No files uploaded
- **In Progress**: Files uploaded, not all final
- **Final**: All files marked as final

**File Management:**
- Files stored in Supabase Storage (`deliverable-files` bucket)
- File metadata stored in database
- Preview support for images, PDFs, and other formats
- Individual file status (in_progress, final)

### Folder Management

**Purpose:** Additional folder organization structure for artists.

**Key Files:**
- `pages/folders/[id].tsx` - Folder detail page
- `components/NewFolderForm.tsx` - Create folder form
- `components/FolderCard.tsx` - Folder card component

**Database Tables:**
- `folders` - Folder records
- `access_grants` (resource_type='folder') - Folder permissions (inherited from artist)

**Features:**
- Create folders within artists
- Upload files to folders
- Track file counts
- Folder-specific permissions

### Collection Management

**Purpose:** Create custom collections of mixed content (artists, releases, deliverables).

**Key Files:**
- `components/CollectionManager.tsx` - Collection management UI
- `lib/accessControl.ts` - Collection functions

**Database Tables:**
- `collections` - Collection records
- `collection_items` - Items in collections
- `access_grants` (resource_type='collection') - Collection permissions

**Features:**
- Create named collections
- Add mixed content types (artists, releases, deliverables, folders)
- Sort/reorder items
- Public/private collections
- Share collections with public links
- Manage collection access

### Share & Access Management

**Purpose:** Control who can access resources and at what level.

**Key Files:**
- `components/ShareAccessModal.tsx` - Share access dialog
- `components/BulkPermissionManagement.tsx` - Bulk access management
- `pages/settings.tsx` - Settings page with access management tab

**Database Tables:**
- `access_grants` - Core permission records
- `share_links` - Public share links
- `invite_tokens` - Email invitation tokens

**Features:**

**ShareAccessModal (Per-Resource):**
- Invite users by email
- Set access levels (view, artist, edit, full)
- View current members
- Change member access levels
- Revoke access
- Create public share links
- Copy share link URLs
- Delete share links

**Bulk Permission Management (Settings Page):**
- View all users in system
- See each user's permissions across all resources
- Consolidated view of user access
- Filter by resource type, access level
- Search users by email
- Bulk invite users to resources
- Change access levels
- Revoke access

**Share Links:**
- Generate unique tokens for resources
- Set expiration dates
- Track link usage
- View-only by default (configurable)
- Delete/deactivate links

**Email Invitations:**
- Send via Resend API
- Beautiful HTML email templates
- Include resource details and inviter info
- Secure tokens with 7-day expiration
- Signup flow pre-fills email
- Automatic access grant on signup

### File Upload & Storage

**Purpose:** Store and manage files in deliverables.

**Key Files:**
- `pages/deliverables/[id].tsx` - File upload interface
- `components/FilePreviewModal.tsx` - File preview

**Storage:**
- Supabase Storage bucket: `deliverable-files`
- Files organized by deliverable: `deliverable-files/{deliverable_id}/{timestamp}-{filename}`

**Features:**
- Drag & drop upload
- Multiple file upload
- Image preview thumbnails
- File metadata (name, type, size)
- Individual file status tracking
- Download files
- Delete files
- File preview modal with navigation

**Supported File Types:**
- Images (JPEG, PNG, GIF, WebP)
- Documents (PDF)
- Videos (various formats)
- Audio (various formats)
- Archives (ZIP, RAR)
- Any other file type

### Navigation & Layout

**Purpose:** Consistent navigation and layout across the application.

**Key Files:**
- `components/Layout.tsx` - Main layout wrapper
- `components/GlobalNavigation.tsx` - Side navigation
- `components/Breadcrumb.tsx` - Breadcrumb navigation

**Features:**
- Fixed left sidebar navigation
- Main navigation items:
  - Home
  - Artists
  - Releases
  - Calendar
  - Notifications
  - Settings
- Quick actions (Add Artist, Add Release)
- User profile menu
- Breadcrumb navigation on detail pages
- Back button functionality

### Notifications

**Purpose:** Notify users of important events and updates.

**Key Files:**
- `pages/notifications.tsx` - Notifications page
- `components/NotificationMenu.tsx` - Notification dropdown
- `lib/notificationUtils.ts` - Notification utilities

**Database Tables:**
- `notifications` - Notification records

**Notification Types:**
- Access granted/revoked
- File uploads
- Deliverable status changes
- Comments (if implemented)
- Invitations

**Features:**
- Unread count indicator
- Mark as read
- Real-time updates (via Supabase subscriptions)

---

## 6. Component Library

The application uses a consistent component library built with React and Tailwind CSS, following a design system with tokens defined in `styles/tokens.css`.

### UI Components (`components/ui/`)

#### **Button**
Primary action component.

**Props:**
- `variant`: `'primary'` | `'secondary'` | `'tertiary'` | `'danger'` | `'ghost'`
- `size`: `'sm'` | `'md'` | `'lg'`
- `loading`: `boolean` - Shows spinner
- `disabled`: `boolean`
- `onClick`: Click handler

**Usage:**
```tsx
<Button variant="primary" size="md" onClick={handleSave}>
  Save
</Button>
```

#### **IconButton**
Button optimized for icons with 1:1 aspect ratio.

**Props:**
- `icon`: Lucide icon component
- `variant`: Same as Button
- `size`: Same as Button
- `onClick`: Click handler
- `aria-label`: Required for accessibility

**Usage:**
```tsx
<IconButton 
  icon={Settings} 
  variant="ghost" 
  aria-label="Settings"
  onClick={openSettings}
/>
```

#### **LinkButton**
Button styled as a link.

**Props:**
- `href`: URL to navigate to
- `children`: Button content

### Form Components (`components/form/`)

#### **Input**
Text input field with label and error states.

**Props:**
- `label`: Field label
- `type`: `'text'` | `'email'` | `'password'` | `'tel'` | etc.
- `error`: Error message string
- `placeholder`: Placeholder text
- `value`: Controlled value
- `onChange`: Change handler
- `required`: Boolean

**Usage:**
```tsx
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
/>
```

#### **Textarea**
Multi-line text input.

**Props:**
- Same as Input
- `maxLength`: Character limit
- `showCount`: Show character counter
- `rows`: Number of rows

#### **Select**
Dropdown select field.

**Props:**
- `label`: Field label
- `options`: Array of `{ value, label }` objects
- `value`: Selected value
- `onChange`: Change handler

#### **Checkbox**
Checkbox input with label.

**Props:**
- `label`: Checkbox label
- `checked`: Boolean
- `onChange`: Change handler

### Feedback Components (`components/feedback/`)

#### **Spinner**
Loading spinner.

**Props:**
- `size`: `'sm'` | `'md'` | `'lg'`

#### **Toast**
Toast notification system.

**Usage:**
```tsx
import { useToast } from '@/lib/useToast';

const { success, error, toasts, removeToast } = useToast();

// Show toast
success('Operation successful!');
error('Something went wrong', 'Please try again');

// Render toasts
<ToastContainer toasts={toasts} onClose={removeToast} />
```

#### **Alert**
Alert message component.

**Props:**
- `variant`: `'success'` | `'error'` | `'warning'` | `'info'`
- `title`: Alert title
- `children`: Alert content

#### **Badge**
Small status indicator.

**Props:**
- `variant`: `'success'` | `'error'` | `'warning'` | `'info'`
- `children`: Badge text

### Layout Components (`components/layout/`)

#### **Card**
Container component with consistent styling.

**Props:**
- `padding`: `'sm'` | `'md'` | `'lg'`
- `hoverable`: Boolean - add hover effect
- `children`: Card content

#### **Stack**
Flexbox stack layout.

**Props:**
- `direction`: `'vertical'` | `'horizontal'`
- `spacing`: Number (Tailwind spacing scale)
- `children`: Stack items

### Overlay Components (`components/overlay/`)

#### **Modal**
Modal dialog overlay.

**Props:**
- `isOpen`: Boolean
- `onClose`: Close handler
- `title`: Modal title
- `children`: Modal content
- `size`: `'sm'` | `'md'` | `'lg'` | `'xl'`

**Usage:**
```tsx
<Modal 
  isOpen={isModalOpen} 
  onClose={() => setIsModalOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure?</p>
  <div className="flex gap-4 mt-6">
    <Button onClick={handleConfirm}>Confirm</Button>
    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
      Cancel
    </Button>
  </div>
</Modal>
```

### Design Tokens

**Colors:**
- System colors: Blue (actions), Green (success), Red (destructive), Yellow (warning)
- Background: Black/grey scale
- Text: White, grey variations

**Spacing:**
- Uses Tailwind spacing scale (1-12, corresponding to 4px-48px)

**Typography:**
- Font weights: normal, medium, semibold, bold
- Font sizes: xs, sm, base, lg, xl, 2xl, 3xl

**Border Radius:**
- `rounded-md`: 8px
- `rounded-lg`: 12px
- `rounded-xl`: 16px
- `rounded-full`: Circular

### Custom Components

#### **ArtistCard / ReleaseCard / FolderCard**
Specialized card components for displaying resources.

#### **ShareAccessModal**
Complete access management interface with two tabs:
- People: Manage user access
- Links: Manage public share links

#### **BulkPermissionManagement**
Administrative interface for managing all user permissions.

#### **FilePreviewModal**
Modal for previewing and managing files with:
- Image/document preview
- File navigation (previous/next)
- File metadata
- Status management
- Download functionality

#### **Breadcrumb**
Navigation breadcrumb with custom content support and back button.

---

## 7. Utilities & Configurations

### Utility Files

#### **lib/supabase.ts**
Supabase client initialization.

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

#### **lib/accessControl.ts**
Core permission system with:
- Permission checking functions
- Cascading access logic
- Resource filtering functions
- Access grant management
- Collection management
- Share link management

**Key Functions:**
```typescript
// Permission checking
canCurrentUserPerformAction(action, resourceType, resourceId): Promise<boolean>
getUserHighestAccess(userId, resourceType, resourceId): Promise<AccessLevel>

// Resource filtering
getAccessibleArtists(): Promise<Artist[]>
getAccessibleReleases(): Promise<Release[]>
getAccessibleArtistReleases(artistId): Promise<Release[]>
getAccessibleDeliverables(releaseId): Promise<Deliverable[]>

// Access management
getAccessGrants(resourceType, resourceId): Promise<AccessGrant[]>
inviteUsers(params): Promise<InviteResult>
changeAccessLevel(grantId, accessLevel): Promise<void>
revokeAccess(grantId): Promise<void>

// Share links
createShareLink(params): Promise<ShareLink>
getShareLinks(resourceType, resourceId): Promise<ShareLink[]>
deleteShareLink(linkId): Promise<void>

// Collections
createCollection(params): Promise<Collection>
getCollections(): Promise<Collection[]>
addToCollection(params): Promise<void>
```

#### **lib/cache.ts**
Request deduplication and caching layer.

**Features:**
- Prevents multiple simultaneous requests for the same data
- 5-minute TTL cache for access queries
- In-memory cache for performance
- Cache key generation utilities

**Cache Keys:**
```typescript
cacheKeys.userAccess(userId, resourceType, resourceId)
cacheKeys.accessibleArtists(userId)
cacheKeys.accessibleReleases(userId)
```

#### **lib/usePermissions.ts**
React hooks for permission checking.

```typescript
// Hook for multiple permissions
const { permissions, loading, checkPermission } = usePermissions(
  'release',
  releaseId,
  ['view', 'upload_files', 'manage_access']
);

// Specialized hooks
useReleasePermissions(releaseId)
useDeliverablePermissions(deliverableId)
useArtistPermissions(artistId)
```

#### **lib/useToast.ts**
Toast notification hook.

```typescript
const { success, error, toasts, removeToast } = useToast();

// Show notifications
success('Title', 'Description', <Icon />);
error('Title', 'Description');
```

#### **lib/notificationUtils.ts**
Notification utilities for creating and managing notifications.

### Configuration Files

#### **next.config.ts**
Next.js configuration.

#### **tailwind.config.ts / tailwind.config.js**
Tailwind CSS configuration with design tokens.

#### **tsconfig.json**
TypeScript configuration.

#### **eslint.config.mjs**
ESLint rules for code quality.

#### **postcss.config.mjs**
PostCSS configuration for CSS processing.

### Environment Variables

Required environment variables in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Email Service
RESEND_API_KEY=your-resend-key

# Site URL
SITE_URL=http://localhost:3001
```

### API Routes

#### **pages/api/send-invite-supabase.ts**
Sends email invitations via Resend API.

**Request:**
```json
{
  "accessGrantId": "uuid",
  "resourceType": "artist" | "release",
  "resourceId": "uuid",
  "resourceName": "Artist/Release Name",
  "resourceDescription": "Optional description",
  "inviterEmail": "inviter@example.com"
}
```

#### **pages/api/check-users.ts**
Checks which email addresses are already registered.

**Request:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"]
}
```

**Response:**
```json
{
  "existingEmails": ["user1@example.com"],
  "newEmails": ["user2@example.com"]
}
```

#### **pages/api/get-user-by-email.ts**
Fetches user information by email (server-side only).

#### **pages/api/organizations/[id].ts**
Organization management API (PATCH for updates).

---

## 8. Known Limitations / TODOs

### Current Limitations

1. **Email Templates:**
   - Email templates are basic HTML
   - No email template builder
   - Limited customization options

2. **File Preview:**
   - Limited file type support
   - No editing capabilities
   - No version history

3. **Search:**
   - Basic text search only
   - No full-text search
   - No advanced filters

4. **Real-time Updates:**
   - Notifications use real-time, but most data doesn't
   - Manual refresh needed for some updates

5. **Mobile Experience:**
   - Desktop-first design
   - Mobile experience could be improved
   - Some features not optimized for mobile

6. **Reporting:**
   - No analytics or reporting features
   - No export functionality
   - No activity logs

7. **Comments:**
   - Comment system referenced but not fully implemented
   - No threaded discussions

8. **Calendar:**
   - Calendar page exists but not fully functional
   - No deadline visualization
   - No calendar view of releases

### Planned Improvements

1. **Enhanced File Management:**
   - Version control for files
   - File comparison tools
   - Annotation capabilities

2. **Advanced Search:**
   - Full-text search across all content
   - Advanced filters and saved searches
   - Search by file type, date ranges, etc.

3. **Analytics & Reporting:**
   - Access analytics
   - Deliverable completion metrics
   - User activity reports
   - Export to PDF/Excel

4. **Collaboration:**
   - Real-time collaboration
   - Comment threads on files
   - @mentions and notifications
   - Activity feed

5. **Automation:**
   - Automated workflows
   - Template releases
   - Bulk operations
   - Scheduled tasks

6. **Integration:**
   - API for third-party integrations
   - Webhooks
   - Export/import functionality

---

## 9. How to Extend

### Adding a New Feature

1. **Database Changes:**
   - Create SQL migration file in project root
   - Define tables, columns, constraints
   - Add Row Level Security policies
   - Create indexes for performance
   - Test migration in development

2. **Access Control:**
   - If feature needs permissions, add to `access_grants` system
   - Define permission requirements using existing `Permission` types
   - Add filtering functions in `lib/accessControl.ts`
   - Update RLS policies

3. **Backend Logic:**
   - Add business logic to utility files in `lib/`
   - Create helper functions for data operations
   - Implement caching if needed
   - Add TypeScript interfaces

4. **UI Components:**
   - Create new components in appropriate subdirectory
   - Use existing design tokens and components
   - Follow established patterns (e.g., cards, modals, forms)
   - Ensure accessibility

5. **Pages:**
   - Add pages in `pages/` directory
   - Use `AuthWrapper` for protected pages
   - Implement proper loading and error states
   - Add breadcrumb navigation

6. **Testing:**
   - Test with different permission levels
   - Verify RLS policies work correctly
   - Test on different screen sizes
   - Check performance with large datasets

### Creating a New Page

**Example: Adding a "Teams" feature**

1. **Database:**
```sql
-- teams_table.sql
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view teams they have access to" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.resource_type = 'team'
      AND ag.resource_id = teams.id
      AND ag.user_id = auth.uid()
      AND ag.is_active = true
    )
  );

-- Add to resource_type enum
ALTER TYPE resource_type ADD VALUE 'team';
```

2. **TypeScript Interface:**
```typescript
// lib/accessControl.ts
export interface Team {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  createdBy: string;
  createdAt: string;
}
```

3. **Access Control Functions:**
```typescript
// lib/accessControl.ts
export const getAccessibleTeams = async (): Promise<Team[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('access_grants')
    .select('resource_id')
    .eq('user_id', user.id)
    .eq('resource_type', 'team')
    .eq('is_active', true);

  if (error || !data) return [];

  const teamIds = data.map(grant => grant.resource_id);
  
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds);

  return teams || [];
};
```

4. **Component:**
```tsx
// components/TeamCard.tsx
interface TeamCardProps {
  team: Team;
}

export default function TeamCard({ team }: TeamCardProps) {
  return (
    <Card hoverable padding="md">
      <h3 className="text-white font-semibold">{team.name}</h3>
      <p className="text-gray-400 text-sm">{team.description}</p>
    </Card>
  );
}
```

5. **Page:**
```tsx
// pages/teams.tsx
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import AuthWrapper from '@/components/AuthWrapper';
import TeamCard from '@/components/TeamCard';
import { getAccessibleTeams, Team } from '@/lib/accessControl';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      const accessibleTeams = await getAccessibleTeams();
      setTeams(accessibleTeams);
      setLoading(false);
    };
    fetchTeams();
  }, []);

  return (
    <AuthWrapper>
      <Layout>
        <div className="text-white">
          <h1 className="text-2xl font-bold mb-6">Teams</h1>
          {loading ? (
            <Spinner size="lg" />
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {teams.map(team => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </AuthWrapper>
  );
}
```

6. **Navigation:**
```tsx
// components/GlobalNavigation.tsx
// Add to navigation items
<Link href="/teams">
  <Users className="w-5 h-5" />
  <span>Teams</span>
</Link>
```

### Best Practices

1. **Always use the component library** - Don't create raw HTML elements
2. **Implement proper permission checks** - Both UI and database level
3. **Add loading and error states** - Improve user experience
4. **Use TypeScript interfaces** - Maintain type safety
5. **Follow existing patterns** - Consistency across the codebase
6. **Test with different access levels** - Ensure permissions work correctly
7. **Add database indexes** - Maintain query performance
8. **Use caching appropriately** - Minimize database load
9. **Document new features** - Update this documentation
10. **Keep security in mind** - Never expose sensitive data

### Common Pitfalls to Avoid

1. **Forgetting RLS policies** - Data will be inaccessible or improperly secured
2. **Not handling loading states** - Poor user experience
3. **Hardcoding permissions** - Use the permission system
4. **Not using TypeScript** - Type safety prevents bugs
5. **Skipping error handling** - Applications should fail gracefully
6. **Ignoring mobile** - Test on different screen sizes
7. **Creating duplicate components** - Reuse existing components
8. **Not considering performance** - Use indexes, caching, pagination
9. **Bypassing the access control system** - Always use filtering functions
10. **Not updating documentation** - Keep this doc current

---

## Development Workflow

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

3. **Run development server:**
```bash
npm run dev
```

4. **Access the application:**
- Open http://localhost:3001
- Login with test credentials or create an account

### Database Migrations

1. **Create migration file:**
```bash
# Create a new .sql file in project root
touch add_teams_feature.sql
```

2. **Write migration SQL:**
```sql
-- Add new tables, columns, etc.
```

3. **Run migration:**
- Open Supabase SQL Editor
- Paste SQL and execute
- Verify migration success

4. **Test migration:**
- Test with different user roles
- Verify RLS policies work
- Check data integrity

### Deploying Changes

1. **Build the application:**
```bash
npm run build
```

2. **Deploy to Vercel** (or your hosting platform):
```bash
vercel deploy
```

3. **Run production migrations:**
- Execute SQL migrations in production Supabase
- Verify migrations in production

4. **Monitor for errors:**
- Check application logs
- Test critical features
- Monitor user feedback

---

## Conclusion

AMGMT is a comprehensive music management platform built on modern technologies with a focus on security, performance, and user experience. The permission-based architecture ensures that teams can collaborate effectively while maintaining proper access control.

This documentation provides a complete overview of the system architecture, features, and implementation details. When adding new features or making modifications, refer to this guide to maintain consistency and follow established patterns.

For questions or clarifications, refer to the code comments, SQL schema files, and component documentation throughout the codebase.

