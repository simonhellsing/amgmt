# Invite System Setup Guide

## ✅ Simplified Architecture

**Frontend** → **Next.js API Route** → **Resend API** (directly)

No Supabase Edge Functions needed!

## 🚀 Quick Setup

### 1. Environment Variables ✅
Your `.env.local` is already configured:
```bash
RESEND_API_KEY=re_ZjRcqkUF_HDZjmM2uBqXBzY4mfyBVDmaN
SITE_URL=http://localhost:3001
```

### 2. Database Schema
Run this SQL in your Supabase SQL Editor:

```sql
-- Add invite-related columns to release_access table
ALTER TABLE release_access 
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invite_token TEXT;

-- Create invite_tokens table
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  invite_id UUID NOT NULL REFERENCES release_access(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens(expires_at);

-- Enable RLS
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_tokens
CREATE POLICY "Users can view their own invite tokens" ON invite_tokens
  FOR SELECT USING (
    email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Service role can manage invite tokens" ON invite_tokens
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_invite_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM invite_tokens 
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;
```

### 3. Test the System

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Test the invite flow**:
   - Go to a release page
   - Click "Share" button
   - Add an email address
   - Click "Invite"
   - Check if the email is sent

## 🔧 How It Works

1. **User clicks "Share"** → Opens modal
2. **User enters emails** → Clicks "Invite"
3. **Next.js API route** → Creates invite tokens + sends email via Resend
4. **Recipient gets email** → Clicks "Accept Invitation"
5. **Signup page** → Validates token + creates account
6. **User redirected** → To the release page

## 📧 Email Configuration

The system uses Resend.com for sending emails. The "from" address in the API route is currently set to `noreply@yourdomain.com`. 

**For production**, you should:
1. **Verify your domain** in Resend dashboard
2. **Update the "from" address** in `pages/api/send-invite.ts` to use your verified domain

## 🎯 Features

- ✅ **Multi-email invites** with chip input
- ✅ **Beautiful HTML emails** with branding
- ✅ **Secure token system** with 7-day expiration
- ✅ **Seamless signup flow** for invited users
- ✅ **Access level management** (view, artist, edit, full)
- ✅ **Member management** (change access, remove users)
- ✅ **Share link generation** and copying

## 🐛 Troubleshooting

- **Check browser console** for API errors
- **Verify Resend API key** is correct
- **Check Supabase logs** for database errors
- **Test with a real email address** (not test@example.com)

The system is now ready to use! 🚀
