-- =====================================================
-- AUTO-CONFIRM USERS ON SIGNUP (DEVELOPMENT ONLY)
-- =====================================================
-- This script disables email confirmation requirement
-- by auto-confirming users when they sign up

-- Option 1: Create a trigger to auto-confirm new users
-- This runs automatically for every new signup
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  -- Auto-confirm the email (confirmed_at is auto-generated)
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;

-- Create trigger to auto-confirm users on signup
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

-- Option 2: Manually confirm all existing unconfirmed users
-- Run this to fix any users that were created before the trigger
-- Note: confirmed_at is auto-generated, so we only set email_confirmed_at
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Verify the changes
SELECT 
  'Auto-confirm trigger created!' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed_users
FROM auth.users;

-- Show the trigger
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_confirm_user_trigger';

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'All users have been auto-confirmed. New signups will be automatically confirmed.';
  RAISE NOTICE 'WARNING: This is for DEVELOPMENT only. Re-enable email confirmation for production!';
END $$;

