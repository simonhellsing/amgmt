-- Create release access management tables

-- Release access table
CREATE TABLE IF NOT EXISTS release_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'artist', 'edit', 'full')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(release_id, email)
);

-- Share links table
CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'artist', 'edit', 'full')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_release_access_release_id ON release_access(release_id);
CREATE INDEX IF NOT EXISTS idx_release_access_email ON release_access(email);
CREATE INDEX IF NOT EXISTS idx_share_links_release_id ON share_links(release_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);

-- Enable RLS
ALTER TABLE release_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for release_access
CREATE POLICY "Users can view access for releases they have access to" ON release_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM release_access ra
      WHERE ra.release_id = release_access.release_id
      AND ra.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can manage access for releases they have full access to" ON release_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM release_access ra
      WHERE ra.release_id = release_access.release_id
      AND ra.email = auth.jwt() ->> 'email'
      AND ra.access_level = 'full'
    )
  );

-- RLS Policies for share_links
CREATE POLICY "Users can view share links for releases they have access to" ON share_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM release_access ra
      WHERE ra.release_id = share_links.release_id
      AND ra.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can manage share links for releases they have full access to" ON share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM release_access ra
      WHERE ra.release_id = share_links.release_id
      AND ra.email = auth.jwt() ->> 'email'
      AND ra.access_level = 'full'
    )
  );
