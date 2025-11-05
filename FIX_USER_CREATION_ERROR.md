# Fix: "Database error saving new user"

## Problem
When creating a new user through signup, you're getting a "Database error saving new user" message. This is caused by the database trigger `handle_new_user()` failing when it tries to automatically create a user profile.

## Root Cause
The trigger function that creates user profiles has one or more of these issues:
1. Missing `SECURITY DEFINER` privilege to bypass RLS policies
2. No error handling for missing user metadata
3. RLS policies preventing the trigger from inserting records

## Solution

### Step 1: Run the Fix Script
Run the SQL script `fix_user_creation_trigger.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `fix_user_creation_trigger.sql`
4. Click "Run"

### Step 2: Verify the Fix
After running the script, you should see:
- "Trigger fixed successfully!" message
- List of RLS policies on user_profiles table

### What the Fix Does

1. **Recreates the trigger function** with:
   - `SECURITY DEFINER` - allows it to bypass RLS policies
   - `SET search_path = public` - ensures it looks in the right schema
   - Better NULL handling using `COALESCE()`
   - `ON CONFLICT DO NOTHING` to prevent duplicate errors
   - Error handling that logs warnings but doesn't fail the user creation

2. **Updates RLS policies** to:
   - Allow the service role (used by triggers) to insert profiles
   - Keep existing security for user access
   - Maintain collaboration features (viewing other profiles)

3. **Grants proper permissions** to authenticated and anonymous roles

## Testing

After applying the fix, try creating a new user:

1. Go to your signup page
2. Fill in the form with a new email address
3. Submit the form
4. The user should be created successfully without errors

## Alternative: Create Users Through Invite System

If you're trying to invite users (not signup), use the Bulk Permission Management in Settings:
1. Go to Settings → Access Management tab
2. Click "Invite Users"
3. Select resource type and resource
4. Enter email addresses
5. Send invitations

The invited users will receive an email to create their account.

## Need More Help?

If the error persists after running the fix:
1. Check the Supabase logs for detailed error messages
2. Verify that the trigger exists: Look for `on_auth_user_created` in Database → Triggers
3. Check if user_profiles table has RLS enabled properly
4. Ensure your service role key is set correctly in your environment variables

