import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    console.log('Testing email to:', email);
    console.log('RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
    console.log('SITE_URL configured:', process.env.SITE_URL);

    // Simple test email
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Email</title>
      </head>
      <body>
        <h1>Test Email</h1>
        <p>This is a test email from your music management platform.</p>
        <p>If you receive this, the email system is working!</p>
      </body>
      </html>
    `;

    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    console.log('Sending test email from:', fromEmail);

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Test Email from Music Management Platform',
        html: emailContent,
      }),
    });

    console.log('Email response status:', emailResponse.status);

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
      return res.status(500).json({ error: `Failed to send email: ${errorMessage}` });
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully',
      result: emailResult 
    });
  } catch (error) {
    console.error('Error in test-email API:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send test email' });
  }
}
