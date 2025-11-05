import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a server-side client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Keep the regular client for user context
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API route called with body:', req.body);

  try {
    const { accessGrantId, resourceType, resourceId, resourceName, resourceDescription, inviterEmail } = req.body;

    console.log('API route received:', { accessGrantId, resourceType, resourceId, resourceName, resourceDescription, inviterEmail });

    // Validate required fields
    if (!accessGrantId || !resourceType || !resourceId || !resourceName) {
      console.error('Missing required fields:', { accessGrantId, resourceType, resourceId, resourceName });
      throw new Error('Missing required fields');
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    console.log('RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
    console.log('SITE_URL configured:', process.env.SITE_URL);

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

    // Email content
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>You've been invited to collaborate</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You've been invited to collaborate!</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p><strong>${inviterEmail || 'A team member'}</strong> has invited <strong>${invite.email}</strong> to collaborate on <strong>"${resourceName}"</strong>${resourceDescription ? ` - ${resourceDescription}` : ''}.</p>
            <p><em>Note: This email was sent to you for testing purposes. In production, it would be sent to ${invite.email}.</em></p>
            <p>You'll have access to view and work on this release based on your assigned permissions.</p>
            <div style="text-align: center;">
              <a href="${signupUrl}" class="button">Accept Invitation</a>
            </div>
            <p>This invitation will expire in 7 days. If you have any questions, please contact the person who invited you.</p>
          </div>
          <div class="footer">
            <p>This invitation was sent from your music management platform.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // For testing, always send to the inviter's email (your email)
    // This works around Resend's limitation of only sending to verified emails
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const toEmail = inviterEmail || 'simonhellsing@gmail.com'; // Always send to your email for testing

    console.log('Sending email to:', toEmail, 'from:', fromEmail);
    console.log('Note: Email sent to inviter for testing. Original invitee:', invite.email);

    // Send email using Resend directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject: `You've been invited to collaborate on "${resourceName}"`,
        html: emailContent,
      }),
    });

    if (!emailResponse.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await emailResponse.json();
        console.error('Resend API error:', errorData);
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        errorMessage = `HTTP ${emailResponse.status}: ${emailResponse.statusText}`;
      }
      throw new Error(`Failed to send email: ${errorMessage}`);
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

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

    res.status(200).json({ success: true, message: 'Invite sent successfully' });
  } catch (error) {
    console.error('Error in send-invite API:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send invite' });
  }
}
