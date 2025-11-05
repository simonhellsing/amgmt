import { supabase } from './supabase';

/**
 * Updates all comment mentions when a user's name changes
 * This function should be called after updating a user's profile
 */
export async function updateUserMentionsInComments(
  userId: string, 
  oldName: string, 
  newName: string
): Promise<void> {
  try {
    // Get all comments where this user is tagged
    const { data: comments, error: fetchError } = await supabase
      .from('file_comments')
      .select('id, content, tagged_users')
      .contains('tagged_users', [userId]);

    if (fetchError) {
      console.error('Error fetching comments to update:', fetchError);
      return;
    }

    if (!comments || comments.length === 0) {
      console.log('No comments found with this user tagged');
      return;
    }

    // Update each comment that mentions the old name
    const updates = comments
      .filter(comment => comment.content.includes(`@${oldName}`))
      .map(comment => ({
        id: comment.id,
        content: comment.content.replace(
          new RegExp(`@${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
          `@${newName}`
        )
      }));

    if (updates.length === 0) {
      console.log('No comments need updating');
      return;
    }

    // Batch update all comments
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('file_comments')
        .update({ content: update.content })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating comment ${update.id}:`, updateError);
      }
    }

    console.log(`Updated ${updates.length} comments with new name: ${oldName} -> ${newName}`);
  } catch (error) {
    console.error('Error in updateUserMentionsInComments:', error);
  }
}

/**
 * Helper function to get a user's current full name
 */
export async function getUserFullName(userId: string): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return fullName || profile.email?.split('@')[0] || null;
  } catch (error) {
    console.error('Error in getUserFullName:', error);
    return null;
  }
}
