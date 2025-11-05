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
-- (This will run the entire scalable_access_system.sql)

-- Step 4: Migrate any existing data (if applicable)
-- Since we're likely starting fresh, this section is empty for now

-- Step 5: Verify migration
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
