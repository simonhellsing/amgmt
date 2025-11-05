# Organization Invite System - Implementation Guide

## Overview
Users can now invite others to their organization through the Settings page. This document explains how the system works and how to test it.

## Features Implemented

### 1. Organization Members Management
- **Location**: Settings → Members tab
- **Access**: Only visible to users with `full` (admin) access to the organization
- **Features**:
  - View all organization members
  - See member status (Active, Pending, Inactive)
  - View access levels (Viewer, Editor, Artist, Admin)
  - Invite new members
  - Remove existing members

### 2. Invite Flow
1. Admin navigates to Settings → Members tab
2. Click "Invite Members" button
3. Enter email addresses (comma or newline separated)
4. Select access level:
   - **Viewer**: Can view organization content
   - **Editor**: Can edit organization content
   - **Artist**: Artist-level permissions
   - **Admin**: Full administrative access
5. Click "Send Invitations"
6. System sends email invites to each recipient
7. Recipients receive email with signup link
8. After signup, they automatically get access to the organization

### 3. Member Management
- **View Members**: See all users with access to the organization
- **Member Status**:
  - ✅ **Active**: User has accepted invite and is active
  - 📧 **Pending**: Invitation sent but not yet accepted
  - ⚫ **Inactive**: User access has been revoked
- **Remove Members**: Click trash icon to revoke member access

## Technical Implementation

### Files Modified/Created

#### New Component
- `components/OrganizationMembers.tsx` - Full members management UI

#### Modified Files
1. `pages/settings.tsx`
   - Added "Members" tab
   - Integrated OrganizationMembers component

2. `lib/accessControl.ts`
   - Added 'organization' to ResourceType
   - Now supports organization invites

3. `pages/signup.tsx`
   - Added organization invite handling
   - Redirects to home after accepting organization invite

### Database Schema
The system uses the existing `access_grants` table:
- `resource_type = 'organization'`
- `resource_id = [organization UUID]`
- `access_level` = 'view' | 'edit' | 'artist' | 'full'
- `is_active` = true/false

Invite tokens stored in `invite_tokens` table:
- References `access_grants.id`
- Expires after 7 days
- Can only be used once

### Permissions Model
- **Organization Admin** (`access_level = 'full'`):
  - Can invite new members
  - Can remove members
  - Can manage organization settings
  - Can view all members

- **Other Levels**: Cannot access Members tab

## Testing Instructions

### Prerequisites
1. Ensure you're logged in as a user with admin access to an organization
2. Make sure email service is configured (RESEND_API_KEY in .env)

### Test Steps

#### Test 1: View Members Tab
1. Navigate to Settings page
2. Verify "Members" tab is visible (next to "Organization" tab)
3. Click on Members tab
4. Should see list of current organization members

#### Test 2: Invite New Member
1. In Members tab, click "Invite Members"
2. Enter email addresses:
   ```
   test1@example.com, test2@example.com
   ```
3. Select access level (e.g., "Editor")
4. Click "Send Invitations"
5. Verify success message
6. Check that new pending members appear in the list

#### Test 3: Invite Multiple Members
1. Click "Invite Members"
2. Enter multiple emails (newline separated):
   ```
   user1@test.com
   user2@test.com
   user3@test.com
   ```
3. Select access level
4. Send invitations
5. Verify all members added with "Pending" status

#### Test 4: Accept Invitation
1. Check invitee's email for invitation
2. Click invitation link
3. Complete signup process
4. After signup, verify redirect to home page
5. Verify user can see organization content
6. As admin, check Members tab - user should now show as "Active"

#### Test 5: Remove Member
1. In Members tab, find a member to remove
2. Click trash icon next to member
3. Confirm removal in dialog
4. Verify member is removed from list
5. Verify member can no longer access organization

#### Test 6: Duplicate Invite
1. Try to invite an email that already has access
2. Should see warning: "X user(s) already have access"
3. No duplicate access grant created

#### Test 7: Invalid Email
1. Try to invite with invalid email format
2. Should see error: "Invalid email addresses: [email]"
3. No invitation sent

### Expected Behavior

#### Email Invite Content
- Subject: "You've been invited to collaborate on [Organization Name]"
- Contains signup link with invite token
- Link format: `https://yoursite.com/signup?token=[TOKEN]&resource=[ORG_ID]&type=organization`
- Expires in 7 days

#### Signup Page
- Shows blue banner: "You've been invited! Join [Organization Name]"
- Email field pre-filled with invited email
- After signup, automatically grants access to organization
- Redirects to home page

#### Permissions Cascade
When a user has organization access, they inherit access to:
- All artists in the organization (via `organization_id` in artists table)
- All releases related to those artists
- All deliverables in those releases
- All folders in the organization

## API Endpoints Used

### POST `/api/send-invite`
- Sends email invitation
- Creates invite token
- Updates access grant with invite_sent_at

### POST `/api/check-users`
- Checks which emails already have accounts
- Prevents duplicate invitations

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com
SITE_URL=http://localhost:3001
```

## Troubleshooting

### Members Tab Not Visible
- Verify user has `full` access level to organization
- Check `access_grants` table for user's organization access

### Email Not Sending
- Verify RESEND_API_KEY is set
- Check server logs for email errors
- For testing, email may be sent to inviter instead of invitee

### Invite Link Not Working
- Check token hasn't expired (7 days)
- Verify token exists in `invite_tokens` table
- Check `used_at` is NULL
- Verify `expires_at` is in future

### New Member Can't See Organization
- Check signup completed successfully
- Verify `access_grants` entry has `is_active = true`
- Check `accepted_at` timestamp is set
- Verify organization ID matches

## Database Queries for Debugging

### Check User's Organization Access
```sql
SELECT 
  ag.*,
  o.name as org_name
FROM access_grants ag
JOIN organizations o ON o.id = ag.resource_id
WHERE ag.resource_type = 'organization'
  AND ag.email = 'user@example.com'
  AND ag.is_active = true;
```

### View All Organization Members
```sql
SELECT 
  ag.email,
  ag.access_level,
  ag.invited_at,
  ag.accepted_at,
  ag.is_active,
  up.first_name,
  up.last_name
FROM access_grants ag
LEFT JOIN user_profiles up ON up.email = ag.email
WHERE ag.resource_type = 'organization'
  AND ag.resource_id = '[ORG_UUID]'
  AND ag.is_active = true
ORDER BY ag.invited_at DESC;
```

### Check Pending Invites
```sql
SELECT 
  ag.email,
  ag.access_level,
  ag.invited_at,
  ag.invite_sent_at,
  it.expires_at,
  it.used_at
FROM access_grants ag
LEFT JOIN invite_tokens it ON it.access_grant_id = ag.id
WHERE ag.resource_type = 'organization'
  AND ag.resource_id = '[ORG_UUID]'
  AND ag.accepted_at IS NULL
  AND ag.is_active = true;
```

## Future Enhancements

Potential improvements for future iterations:
1. **Bulk Actions**: Select multiple members for bulk removal
2. **Role Change**: Allow changing member access level after invitation
3. **Resend Invite**: Resend invitation email to pending members
4. **Invite History**: View history of all invitations sent
5. **Custom Invite Message**: Add personalized message to invitations
6. **Invite Limits**: Set limits on pending invitations
7. **Member Activity**: Track member activity and last login
8. **Team Management**: Create teams/groups within organization

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify database schema is up to date
4. Ensure all environment variables are set

---

**Last Updated**: November 1, 2025
**Version**: 1.0

