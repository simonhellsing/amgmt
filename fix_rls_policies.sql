-- =====================================================
-- FIX RLS POLICIES FOR DEVELOPMENT
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view access grants they have access to" ON access_grants;
DROP POLICY IF EXISTS "Users can create access grants for resources they own" ON access_grants;
DROP POLICY IF EXISTS "Users can update access grants they created" ON access_grants;

-- Create simpler, more permissive policies for development
CREATE POLICY "Allow authenticated users to view access grants" ON access_grants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create access grants" ON access_grants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own access grants" ON access_grants
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      granted_by = auth.uid() OR user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to delete their own access grants" ON access_grants
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      granted_by = auth.uid() OR user_id = auth.uid()
    )
  );

-- Collections policies
DROP POLICY IF EXISTS "Users can view their own collections and public collections" ON collections;
DROP POLICY IF EXISTS "Users can create collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;

CREATE POLICY "Allow authenticated users to view collections" ON collections
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create collections" ON collections
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own collections" ON collections
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND created_by = auth.uid()
  );

CREATE POLICY "Allow users to delete their own collections" ON collections
  FOR DELETE USING (
    auth.role() = 'authenticated' AND created_by = auth.uid()
  );

-- Collection items policies
DROP POLICY IF EXISTS "Users can view items in collections they have access to" ON collection_items;
DROP POLICY IF EXISTS "Users can add items to their own collections" ON collection_items;
DROP POLICY IF EXISTS "Users can remove items from their own collections" ON collection_items;

CREATE POLICY "Allow authenticated users to view collection items" ON collection_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to add collection items" ON collection_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to remove items from their own collections" ON collection_items
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM collections c 
        WHERE c.id = collection_items.collection_id 
        AND c.created_by = auth.uid()
      )
    )
  );

-- Share links policies
DROP POLICY IF EXISTS "Users can view share links they created" ON share_links;
DROP POLICY IF EXISTS "Users can create share links for resources they have access to" ON share_links;
DROP POLICY IF EXISTS "Users can update their own share links" ON share_links;
DROP POLICY IF EXISTS "Users can delete their own share links" ON share_links;

CREATE POLICY "Allow authenticated users to view share links" ON share_links
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create share links" ON share_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own share links" ON share_links
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND created_by = auth.uid()
  );

CREATE POLICY "Allow users to delete their own share links" ON share_links
  FOR DELETE USING (
    auth.role() = 'authenticated' AND created_by = auth.uid()
  );

-- Invite tokens policies
DROP POLICY IF EXISTS "Users can view invite tokens for their grants" ON invite_tokens;
DROP POLICY IF EXISTS "Users can create invite tokens" ON invite_tokens;
DROP POLICY IF EXISTS "Users can update invite tokens for their grants" ON invite_tokens;

CREATE POLICY "Allow authenticated users to view invite tokens" ON invite_tokens
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create invite tokens" ON invite_tokens
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update invite tokens" ON invite_tokens
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Share link visits policies
DROP POLICY IF EXISTS "Users can view visits for their own share links" ON share_link_visits;

CREATE POLICY "Allow authenticated users to view share link visits" ON share_link_visits
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create share link visits" ON share_link_visits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
