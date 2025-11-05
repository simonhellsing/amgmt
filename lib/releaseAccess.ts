import { supabase } from './supabase';

export type AccessLevel = 'view' | 'artist' | 'edit' | 'full';

export type Member = {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  access: AccessLevel;
  isYou?: boolean;
  invitedAt: string;
  acceptedAt?: string;
};

export type ShareLink = {
  id: string;
  token: string;
  accessLevel: AccessLevel;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
};

// API Functions
export const getMembers = async (releaseId: string): Promise<Member[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserEmail = user?.email;

  const { data, error } = await supabase
    .from('release_access')
    .select(`
      id,
      email,
      access_level,
      invited_at,
      accepted_at,
      user:auth.users(
        id,
        email,
        raw_user_meta_data
      )
    `)
    .eq('release_id', releaseId)
    .order('invited_at', { ascending: true });

  if (error) {
    console.error('Error fetching members:', error);
    throw error;
  }

  return (data || []).map((member: any) => ({
    id: member.id,
    name: member.user?.raw_user_meta_data?.full_name || member.email.split('@')[0],
    email: member.email,
    avatarUrl: member.user?.raw_user_meta_data?.avatar_url,
    access: member.access_level as AccessLevel,
    isYou: member.email === currentUserEmail,
    invitedAt: member.invited_at,
    acceptedAt: member.accepted_at,
  }));
};

export const inviteMembers = async ({ 
  releaseId, 
  emails, 
  access,
  releaseName,
  artistName
}: { 
  releaseId: string; 
  emails: string[]; 
  access: AccessLevel;
  releaseName: string;
  artistName?: string;
}): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  const inviterEmail = user?.email;
  
  // First, create the invitations
  const invitations = emails.map(email => ({
    release_id: releaseId,
    email: email.toLowerCase().trim(),
    access_level: access,
    invited_by: user?.id,
  }));

  const { data: insertedInvites, error } = await supabase
    .from('release_access')
    .upsert(invitations, { 
      onConflict: 'release_id,email',
      ignoreDuplicates: false 
    })
    .select();

  if (error) {
    console.error('Error inviting members:', error);
    throw error;
  }

  // Send email invites for each invitation
  if (insertedInvites) {
    for (const invite of insertedInvites) {
      try {
        const response = await fetch('/api/send-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inviteId: invite.id,
            releaseId,
            releaseName,
            artistName,
            inviterEmail,
          }),
        });

        if (!response.ok) {
          console.error('Failed to send invite email for:', invite.email);
        }
      } catch (err) {
        console.error('Error sending invite email:', err);
      }
    }
  }
};

export const changeAccess = async ({ 
  memberId, 
  access 
}: { 
  memberId: string; 
  access: AccessLevel; 
}): Promise<void> => {
  const { error } = await supabase
    .from('release_access')
    .update({ access_level: access })
    .eq('id', memberId);

  if (error) {
    console.error('Error changing access:', error);
    throw error;
  }
};

export const revokeAccess = async ({ 
  memberId 
}: { 
  memberId: string; 
}): Promise<void> => {
  const { error } = await supabase
    .from('release_access')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error revoking access:', error);
    throw error;
  }
};

export const getOrCreateShareLink = async ({ 
  releaseId 
}: { 
  releaseId: string; 
}): Promise<{ url: string }> => {
  // Check if share link already exists
  const { data: existingLink } = await supabase
    .from('share_links')
    .select('token')
    .eq('release_id', releaseId)
    .eq('is_active', true)
    .single();

  if (existingLink) {
    return { url: `${window.location.origin}/share/${existingLink.token}` };
  }

  // Create new share link
  const { data: { user } } = await supabase.auth.getUser();
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      release_id: releaseId,
      token,
      access_level: 'view',
      created_by: user?.id,
    })
    .select('token')
    .single();

  if (error) {
    console.error('Error creating share link:', error);
    throw error;
  }

  return { url: `${window.location.origin}/share/${data.token}` };
};

export const addToCollection = async ({ 
  releaseId, 
  collectionId 
}: { 
  releaseId: string; 
  collectionId?: string; 
}): Promise<void> => {
  // TODO: Implement collection functionality
  console.log('Adding release to collection:', { releaseId, collectionId });
  // For now, just log the action
};
