import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a server-side client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Supabase send-invite API route called with body:', req.body);

  try {
    const { accessGrantId, resourceType, resourceId, resourceName, resourceDescription, inviterEmail } = req.body;

    console.log('API route received:', { accessGrantId, resourceType, resourceId, resourceName, resourceDescription, inviterEmail });

    // Validate required fields
    if (!accessGrantId || !resourceType || !resourceId || !resourceName) {
      console.error('Missing required fields:', { accessGrantId, resourceType, resourceId, resourceName });
      throw new Error('Missing required fields');
    }

    // Get invite details using admin client to bypass RLS
    console.log('Looking for access grant with ID:', accessGrantId);
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('access_grants')
      .select('*')
      .eq('id', accessGrantId)
      .single();

    if (inviteError) {
      console.error('Error fetching invite:', inviteError);
      throw new Error(`Error fetching invite: ${inviteError.message}`);
    }

    if (!invite) {
      console.error('Invite not found for ID:', accessGrantId);
      throw new Error('Invite not found');
    }

    console.log('Found invite:', invite);

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    
    // Store invite token using admin client
    const { error: tokenError } = await supabaseAdmin
      .from('invite_tokens')
      .insert({
        token: inviteToken,
        access_grant_id: accessGrantId,
        email: invite.email,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

    if (tokenError) {
      console.error('Failed to create invite token:', tokenError);
      throw new Error('Failed to create invite token');
    }

    // Create signup URL
    const siteUrl = process.env.SITE_URL || 'http://localhost:3001';
    const signupUrl = `${siteUrl}/signup?token=${inviteToken}&resource=${resourceId}&type=${resourceType}`;

    console.log('Signup URL:', signupUrl);

    // Send email using Supabase Auth's inviteUser function
    const { data: inviteData, error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(invite.email, {
      data: {
        invite_token: inviteToken,
        resource_id: resourceId,
        resource_type: resourceType,
        resource_name: resourceName,
        resource_description: resourceDescription,
        inviter_email: inviterEmail,
        signup_url: signupUrl
      }
    });

    if (emailError) {
      console.error('Failed to send email via Supabase:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log('Email sent successfully via Supabase:', inviteData);

    // Update invite status using admin client
    const { error: updateError } = await supabaseAdmin
      .from('access_grants')
      .update({ 
        invite_sent_at: new Date().toISOString(),
        invite_token: inviteToken
      })
      .eq('id', accessGrantId);

    if (updateError) {
      console.error('Failed to update invite status:', updateError);
      // Don't throw here as the email was sent successfully
    }

    res.status(200).json({ success: true, message: 'Invite sent successfully via Supabase' });
  } catch (error) {
    console.error('Error in send-invite-supabase API:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send invite' });
  }
}
