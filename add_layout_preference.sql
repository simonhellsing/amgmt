-- =====================================================
-- ADD LAYOUT PREFERENCE TO USER_PROFILES
-- =====================================================

-- Add layout_preference column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS layout_preference TEXT DEFAULT 'simple' CHECK (layout_preference IN ('simple', 'complex'));

-- Add comment to explain the field
COMMENT ON COLUMN user_profiles.layout_preference IS 'User preference for interface layout: simple (minimal navigation) or complex (full sidebar navigation)';

SELECT 'Layout preference column added to user_profiles table!' as status;
