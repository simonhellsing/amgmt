import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import AuthWrapper from '../components/AuthWrapper';
import OrganizationImageUploader from '../components/OrganizationImageUploader';
import MultiEmailInput from '../components/MultiEmailInput';
import { AudioLines, ArrowRight, Check } from 'lucide-react';

export default function OrganizationSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: org details, 2: invite collaborators
  
  // Step 1: Organization details
  const [organizationName, setOrganizationName] = useState('');
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Step 2: Invite collaborators
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  
  // Store created organization ID
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user with detailed logging
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      console.log('Auth check:', {
        user: user?.id,
        email: user?.email,
        error: userError
      });

      if (!user) {
        setError('Not authenticated - please log in again');
        setLoading(false);
        return;
      }

      // Log the session as well
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check:', {
        hasSession: !!session,
        sessionUser: session?.user?.id
      });

      // Create the organization
      console.log('Attempting to create organization:', {
        name: organizationName.trim(),
        userId: user.id
      });

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName.trim(),
          image_url: organizationLogo,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Organization creation error:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        });
        setError(`Failed to create organization: ${orgError.message}. ${orgError.hint || ''}`);
        setLoading(false);
        return;
      }

      console.log('Organization created successfully:', orgData);

      if (orgData) {
        // Grant the creator full access to the organization
        // (This is a backup in case the database trigger isn't set up)
        const { error: grantError } = await supabase
          .from('access_grants')
          .insert({
            resource_type: 'organization',
            resource_id: orgData.id,
            user_id: user.id,
            email: user.email,
            access_level: 'full',
            granted_by: user.id,
            granted_at: new Date().toISOString(),
            accepted_at: new Date().toISOString(),
            is_active: true,
          });

        if (grantError) {
          console.error('Error granting access to creator:', grantError);
          // Don't fail the entire operation if this fails (trigger might have handled it)
        }

        setOrganizationId(orgData.id);
        // Move to invite step
        setStep(2);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCollaborators = async () => {
    if (inviteEmails.length === 0) {
      // Skip to home if no invites
      router.push('/home');
      return;
    }

    if (!organizationId) {
      setError('Organization ID not found');
      return;
    }

    setInviting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setInviting(false);
        return;
      }

      // Create access grants and invite tokens for each email
      for (const email of inviteEmails) {
        // Create access grant
        const { data: accessGrant, error: grantError } = await supabase
          .from('access_grants')
          .insert({
            resource_type: 'organization',
            resource_id: organizationId,
            email: email,
            access_level: 'view', // Default to view access
            granted_by: user.id,
            granted_at: new Date().toISOString(),
            invited_at: new Date().toISOString(),
            is_active: true,
          })
          .select()
          .single();

        if (grantError) {
          console.error('Error creating access grant for', email, grantError);
          continue;
        }

        // Create invite token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        const { error: tokenError } = await supabase
          .from('invite_tokens')
          .insert({
            token,
            access_grant_id: accessGrant.id,
            email: email,
            expires_at: expiresAt.toISOString(),
          });

        if (tokenError) {
          console.error('Error creating invite token for', email, tokenError);
          continue;
        }

        // Here you would normally send an email with the invite link
        // For now, we'll just log it
        console.log(`Invite link for ${email}:`, `/signup?token=${token}&resource=${organizationId}&type=organization`);
      }

      // Trigger organization update event before redirecting
      window.dispatchEvent(new Event('organizationUpdated'));
      
      // Redirect to home after inviting
      router.push('/home');
    } catch (err) {
      console.error('Error inviting collaborators:', err);
      setError('Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  const handleSkipInvites = () => {
    // Trigger organization update event before redirecting
    window.dispatchEvent(new Event('organizationUpdated'));
    router.push('/home');
  };

  return (
    <AuthWrapper requireAuth={true} skipOrganizationCheck={true}>
      <div className="h-screen bg-[#121212] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <AudioLines className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-white mb-2">
              {step === 1 ? 'Create your workspace' : 'Invite your team'}
            </h1>
            <p className="text-gray-400">
              {step === 1 
                ? 'Set up your organization to start collaborating' 
                : 'Add team members to your workspace (optional)'}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'
            }`}>
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-white' : 'bg-gray-800'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'
            }`}>
              2
            </div>
          </div>

          {/* Content */}
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
            {step === 1 ? (
              <form onSubmit={handleCreateOrganization} className="space-y-6">
                {/* Organization Logo */}
                <div className="flex justify-center">
                  <OrganizationImageUploader
                    onImageUploaded={setOrganizationLogo}
                    currentImageUrl={organizationLogo}
                    className="w-32 h-32"
                  />
                </div>

                {/* Organization Name */}
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-gray-300 mb-2">
                    Organization Name *
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    placeholder="e.g., Acme Records"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-900/50 border border-red-700 rounded-xl">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-white text-black hover:bg-gray-100 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                  disabled={loading || !organizationName.trim()}
                  loading={loading}
                >
                  {loading ? 'Creating...' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Invite Emails */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Addresses
                  </label>
                  <MultiEmailInput
                    emails={inviteEmails}
                    onChange={setInviteEmails}
                    placeholder="Enter email addresses to invite..."
                    disabled={inviting}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Press Enter or comma after each email address
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/50 border border-red-700 rounded-xl">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleSkipInvites}
                    variant="secondary"
                    className="flex-1 bg-gray-800 text-white hover:bg-gray-700 rounded-xl py-3 font-semibold border border-gray-700"
                    disabled={inviting}
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleInviteCollaborators}
                    variant="primary"
                    className="flex-1 bg-white text-black hover:bg-gray-100 rounded-xl py-3 font-semibold"
                    disabled={inviting || inviteEmails.length === 0}
                    loading={inviting}
                  >
                    {inviting ? 'Sending invites...' : `Invite ${inviteEmails.length > 0 ? inviteEmails.length : ''} ${inviteEmails.length === 1 ? 'person' : 'people'}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

