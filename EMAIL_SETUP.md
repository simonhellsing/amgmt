# Email Setup Guide

To make the invite system functional, you need to set up an email service. Here are the steps:

## Option 1: Resend (Recommended)

1. **Sign up for Resend** at https://resend.com
2. **Get your API key** from the dashboard
3. **Add environment variables** to your `.env.local`:

```bash
RESEND_API_KEY=re_ZjRcqkUF_HDZjmM2uBqXBzY4mfyBVDmaN
SITE_URL=http://localhost:3001
```

## Option 2: Supabase SMTP (Alternative)

If you prefer to use Supabase's built-in SMTP:

1. **Configure SMTP in Supabase Dashboard**:
   - Go to Settings > SMTP
   - Add your SMTP credentials
   - Set up email templates

2. **Update the Edge Function** to use Supabase SMTP instead of Resend

## Option 3: Other Email Services

You can modify the Edge Function to use any email service:
- SendGrid
- Mailgun
- AWS SES
- etc.

## Environment Variables Needed

Add these to your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Service
RESEND_API_KEY=your_resend_api_key

# Site URL
SITE_URL=http://localhost:3001
```

## Deploy the Edge Function

1. **Install Supabase CLI** if you haven't already
2. **Deploy the function**:

```bash
supabase functions deploy send-invite
```

## Test the System

1. **Run the database migrations**:
   ```sql
   -- Run the contents of create_invite_system.sql in your Supabase SQL editor
   ```

2. **Test the invite flow**:
   - Go to a release page
   - Click "Share"
   - Add an email address
   - Click "Invite"
   - Check if the email is sent

## Troubleshooting

- **Check Edge Function logs**: `supabase functions logs send-invite`
- **Verify environment variables** are set correctly
- **Test email service** credentials separately
- **Check database permissions** for the invite_tokens table
