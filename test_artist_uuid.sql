-- Test to check artist ID format
SELECT 
  id,
  name,
  pg_typeof(id) as id_type
FROM artists 
LIMIT 5;

-- Check if the artist ID is a valid UUID
SELECT 
  id,
  name,
  CASE 
    WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' 
    THEN 'Valid UUID' 
    ELSE 'Invalid UUID' 
  END as uuid_validity
FROM artists 
LIMIT 5;
