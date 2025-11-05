-- Performance Indexes for AMGMT
-- These indexes optimize the most frequently queried columns in the permission system
-- Run this in Supabase SQL Editor to improve query performance

-- ==================================================
-- ACCESS_GRANTS TABLE INDEXES (Most Critical)
-- ==================================================

-- Index for user access lookups (used in almost every permission check)
CREATE INDEX IF NOT EXISTS idx_access_grants_user_resource 
ON access_grants(user_id, resource_type, resource_id) 
WHERE is_active = true;

-- Index for resource-based queries (used when fetching all users with access to a resource)
CREATE INDEX IF NOT EXISTS idx_access_grants_resource 
ON access_grants(resource_type, resource_id, is_active);

-- Index for email-based invitations (used when inviting new users)
CREATE INDEX IF NOT EXISTS idx_access_grants_email 
ON access_grants(email, resource_type, resource_id) 
WHERE is_active = true;

-- Index for checking user's overall access across all resources
CREATE INDEX IF NOT EXISTS idx_access_grants_user_active 
ON access_grants(user_id, is_active, resource_type);

-- ==================================================
-- RELEASE_ARTISTS TABLE INDEXES
-- ==================================================

-- Index for finding releases by artist (used in cascading permissions)
CREATE INDEX IF NOT EXISTS idx_release_artists_artist 
ON release_artists(artist_id, release_id);

-- Index for finding artists by release
CREATE INDEX IF NOT EXISTS idx_release_artists_release 
ON release_artists(release_id, artist_id);

-- ==================================================
-- DELIVERABLES TABLE INDEXES
-- ==================================================

-- Index for finding deliverables by release (used frequently)
CREATE INDEX IF NOT EXISTS idx_deliverables_release 
ON deliverables(release_id, created_at DESC);

-- Index for deliverable status queries
CREATE INDEX IF NOT EXISTS idx_deliverables_status 
ON deliverables(release_id, status);

-- ==================================================
-- DELIVERABLE_FILES TABLE INDEXES
-- ==================================================

-- Index for finding files by deliverable
CREATE INDEX IF NOT EXISTS idx_deliverable_files_deliverable 
ON deliverable_files(deliverable_id, created_at DESC);

-- Index for file status queries
CREATE INDEX IF NOT EXISTS idx_deliverable_files_status 
ON deliverable_files(deliverable_id, status);

-- ==================================================
-- FOLDERS TABLE INDEXES
-- ==================================================

-- Index for finding folders by artist
CREATE INDEX IF NOT EXISTS idx_folders_artist 
ON folders(artist_id, created_at DESC);

-- ==================================================
-- ARTISTS TABLE INDEXES
-- ==================================================

-- Index for artist name searches (if search functionality is added)
CREATE INDEX IF NOT EXISTS idx_artists_name 
ON artists(name);

-- Index for organization-based queries
CREATE INDEX IF NOT EXISTS idx_artists_organization 
ON artists(organization_id) 
WHERE organization_id IS NOT NULL;

-- ==================================================
-- RELEASES TABLE INDEXES
-- ==================================================

-- Index for release status and date queries
CREATE INDEX IF NOT EXISTS idx_releases_status_date 
ON releases(status, created_at DESC);

-- Index for catalog number lookups
CREATE INDEX IF NOT EXISTS idx_releases_catalog 
ON releases(catalog_number) 
WHERE catalog_number IS NOT NULL;

-- ==================================================
-- SHARE_LINKS TABLE INDEXES
-- ==================================================

-- Index for token-based lookups (public share links)
CREATE INDEX IF NOT EXISTS idx_share_links_token 
ON share_links(token) 
WHERE is_active = true;

-- Index for finding share links by resource
CREATE INDEX IF NOT EXISTS idx_share_links_resource 
ON share_links(resource_type, resource_id, is_active);

-- ==================================================
-- COLLECTIONS TABLE INDEXES
-- ==================================================

-- Index for finding collections by user
CREATE INDEX IF NOT EXISTS idx_collections_user 
ON collections(created_by, updated_at DESC);

-- Index for public collections
CREATE INDEX IF NOT EXISTS idx_collections_public 
ON collections(is_public, public_expires_at) 
WHERE is_public = true;

-- ==================================================
-- COLLECTION_ITEMS TABLE INDEXES
-- ==================================================

-- Index for finding items in a collection
CREATE INDEX IF NOT EXISTS idx_collection_items_collection 
ON collection_items(collection_id, sort_order);

-- Index for finding collections containing a specific item
CREATE INDEX IF NOT EXISTS idx_collection_items_item 
ON collection_items(item_type, item_id);

-- ==================================================
-- USER_PROFILES TABLE INDEXES
-- ==================================================

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON user_profiles(email);

-- ==================================================
-- NOTIFICATIONS TABLE INDEXES (if it exists)
-- ==================================================

-- Index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON notifications(user_id, created_at DESC);

-- ==================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ==================================================

-- Update PostgreSQL statistics for better query planning
ANALYZE access_grants;
ANALYZE release_artists;
ANALYZE deliverables;
ANALYZE deliverable_files;
ANALYZE folders;
ANALYZE artists;
ANALYZE releases;
ANALYZE share_links;
ANALYZE collections;
ANALYZE collection_items;
ANALYZE user_profiles;

-- ==================================================
-- VERIFY INDEXES
-- ==================================================

-- Check which indexes were created successfully
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'access_grants', 
    'release_artists', 
    'deliverables', 
    'deliverable_files',
    'folders',
    'artists',
    'releases',
    'share_links',
    'collections',
    'collection_items',
    'user_profiles'
  )
ORDER BY tablename, indexname;

