-- Check the access_grants table structure and constraints

-- 1. Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'access_grants'
ORDER BY ordinal_position;

-- 2. Show table constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'access_grants';

-- 3. Show check constraints
SELECT 
    cc.constraint_name,
    cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'access_grants';

-- 4. Show a sample of existing access_grants
SELECT 
    id,
    user_id,
    resource_type,
    resource_id,
    access_level,
    granted_by,
    granted_at,
    accepted_at,
    is_active
FROM access_grants 
LIMIT 5;
