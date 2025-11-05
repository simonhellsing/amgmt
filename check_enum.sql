-- Check the resource_type enum values
SELECT unnest(enum_range(NULL::resource_type)) as resource_types;

-- Check if there are any access_grants at all
SELECT COUNT(*) as total_access_grants FROM access_grants;

-- Check access_grants for the specific user
SELECT * FROM access_grants WHERE user_id = 'ccff5ea3-3e13-42e1-a117-f8d0fecc6889';

-- Check if the user exists in user_profiles
SELECT * FROM user_profiles WHERE id = 'ccff5ea3-3e13-42e1-a117-f8d0fecc6889';

-- Check all organizations
SELECT * FROM organizations;
