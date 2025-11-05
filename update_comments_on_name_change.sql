-- Function to update comment content when a user's name changes
CREATE OR REPLACE FUNCTION update_comments_on_name_change()
RETURNS TRIGGER AS $$
DECLARE
    old_name TEXT;
    new_name TEXT;
    comment_record RECORD;
BEGIN
    -- Get old and new full names
    old_name := TRIM(CONCAT(OLD.first_name, ' ', OLD.last_name));
    new_name := TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
    
    -- If name hasn't changed, do nothing
    IF old_name = new_name THEN
        RETURN NEW;
    END IF;
    
    -- Update all comments that mention this user
    UPDATE file_comments 
    SET content = REPLACE(content, '@' || old_name, '@' || new_name)
    WHERE NEW.id = ANY(tagged_users) 
    AND content LIKE '%@' || old_name || '%';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_comments_on_name_change ON user_profiles;
CREATE TRIGGER trigger_update_comments_on_name_change
    AFTER UPDATE OF first_name, last_name ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_on_name_change();
