-- Add invite-related columns to release_access table
ALTER TABLE release_access 
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invite_token TEXT;

-- Create invite_tokens table
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  invite_id UUID NOT NULL REFERENCES release_access(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens(expires_at);

-- Enable RLS
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_tokens
CREATE POLICY "Users can view their own invite tokens" ON invite_tokens
  FOR SELECT USING (
    email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Service role can manage invite tokens" ON invite_tokens
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_invite_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM invite_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired tokens (runs daily)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-invite-tokens', '0 0 * * *', 'SELECT cleanup_expired_invite_tokens();');
