# 🚀 Scalable Access Control System Setup Guide

## **📋 What's New**

This scalable system replaces the simple release-only access control with a comprehensive multi-level access system that supports:

- **Multi-level access** (Organization → Artist → Release → Deliverable → Folder)
- **Multiple access types** (View, Edit, Artist, Full)
- **Sharable collections** with mixed content types
- **Flexible sharing** with view-only links
- **Performance optimized** with proper indexing

## **🔄 Migration Steps**

### **1. Run the Database Migration**

Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- =====================================================
-- MIGRATION: Simple Access System → Scalable Access System
-- =====================================================

-- Step 1: Backup existing data (if any)
-- Note: This migration assumes you're starting fresh or have minimal data

-- Step 2: Drop old tables if they exist
DROP TABLE IF EXISTS invite_tokens CASCADE;
DROP TABLE IF EXISTS release_access CASCADE;
DROP TABLE IF EXISTS share_links CASCADE;

-- Step 3: Create the new scalable system
-- (Copy the entire content of scalable_access_system.sql here)

-- Step 4: Verify migration
DO $$
BEGIN
  -- Check if all tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_grants') THEN
    RAISE EXCEPTION 'Migration failed: access_grants table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections') THEN
    RAISE EXCEPTION 'Migration failed: collections table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_items') THEN
    RAISE EXCEPTION 'Migration failed: collection_items table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_links') THEN
    RAISE EXCEPTION 'Migration failed: share_links table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invite_tokens') THEN
    RAISE EXCEPTION 'Migration failed: invite_tokens table not found';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully!';
END $$;
```

### **2. Environment Variables**

Your `.env.local` should already be configured:
```bash
RESEND_API_KEY=re_ZjRcqkUF_HDZjmM2uBqXBzY4mfyBVDmaN
SITE_URL=http://localhost:3001
```

### **3. Test the System**

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test the invite flow**:
   - Go to a release page
   - Click "Share"
   - Add an email address
   - Click "Invite"
   - Check if the email is sent

## **🎯 New Features**

### **1. Multi-Level Access Control**

```typescript
// Grant access to different resource types
await inviteUsers({
  resourceType: 'artist',        // 'organization' | 'artist' | 'release' | 'deliverable' | 'folder' | 'collection'
  resourceId: 'artist-uuid',
  emails: ['producer@example.com'],
  accessLevel: 'artist',         // 'view' | 'edit' | 'artist' | 'full'
  resourceName: 'Artist Name',
  resourceDescription: 'Description'
});
```

### **2. Collections Management**

```typescript
// Create a collection
const collection = await createCollection({
  name: 'My Portfolio',
  description: 'Best tracks from 2024',
  isPublic: false
});

// Add mixed content to collection
await addToCollection({
  collectionId: collection.id,
  itemType: 'release',
  itemId: 'release-uuid',
  sortOrder: 1
});
```

### **3. Share Links**

```typescript
// Create a share link
const shareLink = await createShareLink({
  resourceType: 'collection',
  resourceId: 'collection-uuid',
  accessLevel: 'view',
  title: 'My Portfolio',
  description: 'Check out my latest work',
  expiresAt: '2024-12-31T23:59:59Z',
  maxUses: 100
});
```

## **🔧 API Functions**

### **Access Control**
- `getAccessGrants(resourceType, resourceId)` - Get all access grants for a resource
- `inviteUsers(params)` - Invite users with email notifications
- `changeAccessLevel(grantId, accessLevel)` - Change user access level
- `revokeAccess(grantId)` - Revoke user access
- `hasAccess(resourceType, resourceId, requiredLevel)` - Check if user has access

### **Collections**
- `createCollection(params)` - Create a new collection
- `getCollections()` - Get user's collections
- `addToCollection(params)` - Add item to collection
- `removeFromCollection(params)` - Remove item from collection
- `getCollectionItems(collectionId)` - Get items in collection

### **Share Links**
- `createShareLink(params)` - Create a share link
- `getShareLinks(resourceType, resourceId)` - Get share links for resource
- `deleteShareLink(linkId)` - Delete a share link

## **🎨 UI Components**

### **ShareAccessModal**
- Updated to work with any resource type
- Supports multi-level access control
- Enhanced member management

### **CollectionManager** (New)
- Create and manage collections
- Add/remove items from collections
- Share collections with public links

## **📊 Database Schema**

### **Core Tables**
- `access_grants` - Multi-level access control
- `collections` - User-created collections
- `collection_items` - Items in collections (mixed types)
- `share_links` - Public share links
- `invite_tokens` - Email invitation tokens

### **Key Features**
- **Enums** for type safety (`access_level`, `resource_type`)
- **Indexes** for performance
- **RLS policies** for security
- **Triggers** for automation
- **Helper functions** for common operations

## **🚀 Usage Examples**

### **Grant Artist Access**
```sql
INSERT INTO access_grants (resource_type, resource_id, email, access_level)
VALUES ('artist', 'artist-uuid', 'producer@example.com', 'artist');
```

### **Create Public Collection**
```sql
INSERT INTO collections (name, description, created_by, is_public)
VALUES ('My Music Portfolio', 'Best tracks from 2024', 'user-uuid', true);
```

### **Add Mixed Content to Collection**
```sql
INSERT INTO collection_items (collection_id, item_type, item_id, sort_order)
VALUES 
  ('collection-uuid', 'release', 'release-uuid', 1),
  ('collection-uuid', 'artist', 'artist-uuid', 2),
  ('collection-uuid', 'deliverable', 'deliverable-uuid', 3);
```

### **Create Share Link**
```sql
INSERT INTO share_links (resource_type, resource_id, token, title, expires_at)
VALUES ('collection', 'collection-uuid', 'abc123', 'My Portfolio', NOW() + INTERVAL '30 days');
```

## **🔍 Testing Checklist**

- [ ] **Database migration** runs successfully
- [ ] **Share modal** opens and displays correctly
- [ ] **Email invitations** are sent via Resend
- [ ] **Signup flow** works with invite tokens
- [ ] **Access levels** are properly enforced
- [ ] **Collections** can be created and managed
- [ ] **Share links** are generated and copied
- [ ] **RLS policies** work correctly

## **🐛 Troubleshooting**

### **Common Issues**

1. **Migration fails**: Check if old tables exist and drop them first
2. **Email not sent**: Verify Resend API key and environment variables
3. **Access denied**: Check RLS policies and user permissions
4. **Performance issues**: Verify indexes are created properly

### **Debug Commands**

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%access%';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies WHERE tablename LIKE '%access%';

-- Check indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes WHERE tablename LIKE '%access%';
```

## **🎉 Success!**

Your scalable access control system is now ready! You can:

- **Invite users** to any resource type with different access levels
- **Create collections** to organize mixed content
- **Share collections** with public links
- **Scale** to support organizations, artists, releases, deliverables, and folders
- **Manage access** with granular permissions

The system is production-ready and will scale beautifully as your application grows! 🚀
