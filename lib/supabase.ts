import { createClient } from '@supabase/supabase-js'
import { invalidateAccessCache } from './cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Update a release's status based on its deliverables
 */
export const updateReleaseStatus = async (releaseId: string) => {
  // Get all deliverables for this release
  const { data: allDeliverables, error } = await supabase
    .from('deliverables')
    .select('status')
    .eq('release_id', releaseId);

  if (error) {
    console.error('Error fetching deliverables for status update:', error);
    return;
  }

  let newReleaseStatus = 'not_started';

  if (allDeliverables && allDeliverables.length > 0) {
    const hasInProgress = allDeliverables.some(d => d.status === 'in_progress');
    const allFinal = allDeliverables.every(d => d.status === 'final');

    if (allFinal) {
      newReleaseStatus = 'final';
    } else if (hasInProgress) {
      newReleaseStatus = 'in_progress';
    }
  }

  // Update release status
  const { error: updateError } = await supabase
    .from('releases')
    .update({ status: newReleaseStatus })
    .eq('id', releaseId);

  if (updateError) {
    console.error('Error updating release status:', updateError);
  } else {
    console.log('Successfully updated release status to:', newReleaseStatus);
    // Invalidate access cache so the updated release status is reflected
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      invalidateAccessCache(user.id);
    }
  }
};
