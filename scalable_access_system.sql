-- =====================================================
-- SCALABLE ACCESS CONTROL SYSTEM
-- =====================================================

-- =====================================================
-- 1. ACCESS LEVELS ENUM
-- =====================================================
CREATE TYPE access_level AS ENUM ('view', 'edit', 'artist', 'full');

-- =====================================================
-- 2. RESOURCE TYPES ENUM
-- =====================================================
CREATE TYPE resource_type AS ENUM ('organization', 'artist', 'release', 'deliverable', 'folder', 'collection');

-- =====================================================
-- 3. CORE ACCESS CONTROL TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS access_grants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Resource being accessed
  resource_type resource_type NOT NULL,
  resource_id UUID NOT NULL,
  
  -- User being granted access
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- Access details
  access_level access_level NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Invitation details
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  invite_token TEXT,
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Constraints
  UNIQUE(resource_type, resource_id, email),
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > granted_at)
);

-- =====================================================
-- 4. SHARABLE COLLECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE,
  public_expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 5. COLLECTION ITEMS (Mixed content types)
-- =====================================================
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  
  -- Item being added to collection
  item_type resource_type NOT NULL,
  item_id UUID NOT NULL,
  
  -- Ordering and metadata
  sort_order INTEGER DEFAULT 0,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(collection_id, item_type, item_id)
);

-- =====================================================
-- 6. SHARE LINKS (For view-only public access)
-- =====================================================
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- What's being shared
  resource_type resource_type NOT NULL,
  resource_id UUID NOT NULL,
  
  -- Link details
  token TEXT NOT NULL UNIQUE,
  access_level access_level DEFAULT 'view',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Expiration and usage
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  title TEXT,
  description TEXT,
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT valid_uses CHECK (max_uses IS NULL OR max_uses > 0)
);

-- =====================================================
-- 7. SHARE LINK USAGE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS share_link_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT
);

-- =====================================================
-- 8. INVITE TOKENS (For email invitations)
-- =====================================================
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  access_grant_id UUID NOT NULL REFERENCES access_grants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- =====================================================
-- 9. INDEXES FOR PERFORMANCE
-- =====================================================

-- Access grants indexes
CREATE INDEX IF NOT EXISTS idx_access_grants_resource ON access_grants(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_user ON access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_email ON access_grants(email);
CREATE INDEX IF NOT EXISTS idx_access_grants_active ON access_grants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_access_grants_expires ON access_grants(expires_at) WHERE expires_at IS NOT NULL;

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON collections(created_by);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_collections_token ON collections(public_token) WHERE public_token IS NOT NULL;

-- Collection items indexes
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item ON collection_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_order ON collection_items(collection_id, sort_order);

-- Share links indexes
CREATE INDEX IF NOT EXISTS idx_share_links_resource ON share_links(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_active ON share_links(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON share_links(expires_at) WHERE expires_at IS NOT NULL;

-- Invite tokens indexes
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires ON invite_tokens(expires_at);

-- =====================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_link_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. RLS POLICIES
-- =====================================================

-- Access grants policies
CREATE POLICY "Users can view their own access grants" ON access_grants
  FOR SELECT USING (
    email = auth.jwt() ->> 'email' OR user_id = auth.uid()
  );

CREATE POLICY "Users can manage access for resources they have full access to" ON access_grants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.resource_type = access_grants.resource_type
      AND ag.resource_id = access_grants.resource_id
      AND ag.email = auth.jwt() ->> 'email'
      AND ag.access_level = 'full'
      AND ag.is_active = true
    )
  );

-- Collections policies
CREATE POLICY "Users can view collections they have access to" ON collections
  FOR SELECT USING (
    is_public = true OR created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.resource_type = 'collection'
      AND ag.resource_id = collections.id
      AND ag.email = auth.jwt() ->> 'email'
      AND ag.is_active = true
    )
  );

CREATE POLICY "Users can manage their own collections" ON collections
  FOR ALL USING (created_by = auth.uid());

-- Collection items policies
CREATE POLICY "Users can view collection items for accessible collections" ON collection_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_items.collection_id
      AND (c.is_public = true OR c.created_by = auth.uid() OR
           EXISTS (
             SELECT 1 FROM access_grants ag
             WHERE ag.resource_type = 'collection'
             AND ag.resource_id = c.id
             AND ag.email = auth.jwt() ->> 'email'
             AND ag.is_active = true
           ))
    )
  );

CREATE POLICY "Users can manage items in their own collections" ON collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collections c
      WHERE c.id = collection_items.collection_id
      AND c.created_by = auth.uid()
    )
  );

-- Share links policies
CREATE POLICY "Users can view share links for resources they have access to" ON share_links
  FOR SELECT USING (
    is_active = true AND (expires_at IS NULL OR expires_at > NOW()) AND
    (created_by = auth.uid() OR
     EXISTS (
       SELECT 1 FROM access_grants ag
       WHERE ag.resource_type = share_links.resource_type
       AND ag.resource_id = share_links.resource_id
       AND ag.email = auth.jwt() ->> 'email'
       AND ag.is_active = true
     ))
  );

CREATE POLICY "Users can manage share links for resources they have full access to" ON share_links
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM access_grants ag
      WHERE ag.resource_type = share_links.resource_type
      AND ag.resource_id = share_links.resource_id
      AND ag.email = auth.jwt() ->> 'email'
      AND ag.access_level = 'full'
      AND ag.is_active = true
    )
  );

-- Invite tokens policies
CREATE POLICY "Users can view their own invite tokens" ON invite_tokens
  FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Service role can manage invite tokens" ON invite_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 12. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has access to a resource
CREATE OR REPLACE FUNCTION has_access(
  p_resource_type resource_type,
  p_resource_id UUID,
  p_required_level access_level DEFAULT 'view'
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM access_grants ag
    WHERE ag.resource_type = p_resource_type
    AND ag.resource_id = p_resource_id
    AND ag.email = auth.jwt() ->> 'email'
    AND ag.is_active = true
    AND (ag.expires_at IS NULL OR ag.expires_at > NOW())
    AND (
      p_required_level = 'view' OR
      (p_required_level = 'edit' AND ag.access_level IN ('edit', 'artist', 'full')) OR
      (p_required_level = 'artist' AND ag.access_level IN ('artist', 'full')) OR
      (p_required_level = 'full' AND ag.access_level = 'full')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired tokens and links
CREATE OR REPLACE FUNCTION cleanup_expired_items()
RETURNS void AS $$
BEGIN
  -- Clean up expired invite tokens
  DELETE FROM invite_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
  
  -- Clean up expired share links
  UPDATE share_links 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  
  -- Clean up expired access grants
  UPDATE access_grants 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to generate public token for collections
CREATE OR REPLACE FUNCTION generate_collection_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'col_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. TRIGGERS
-- =====================================================

-- Auto-generate public token for collections when made public
CREATE OR REPLACE FUNCTION trigger_collection_public_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND NEW.public_token IS NULL THEN
    NEW.public_token := generate_collection_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_public_token_trigger
  BEFORE INSERT OR UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_collection_public_token();

-- Update collection timestamp
CREATE OR REPLACE FUNCTION trigger_collection_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_updated_trigger
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_collection_updated();
