import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'
import AuthWrapper from '../components/AuthWrapper'
import AuthLayout from '../components/AuthLayout'
import GoogleSignInButton from '../components/GoogleSignInButton'
import ProfileImageUploader from '../components/ProfileImageUploader'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [location, setLocation] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{
    token: string;
    resourceId: string;
    resourceType: string;
    resourceName: string;
    resourceDescription?: string;
    email: string;
  } | null>(null)
  const router = useRouter()

  // Check for invite token in URL
  useEffect(() => {
    const { token, resource, type } = router.query;
    if (token && resource && type) {
      // Validate the invite token
      validateInviteToken(token as string, resource as string, type as string);
    }
  }, [router.query]);

  const validateInviteToken = async (token: string, resourceId: string, resourceType: string) => {
    try {
      const { data, error } = await supabase
        .from('invite_tokens')
        .select(`
          token,
          email,
          expires_at,
          used_at,
          access_grants!inner(
            resource_id,
            resource_type,
            access_level
          )
        `)
        .eq('token', token)
        .eq('access_grants.resource_id', resourceId)
        .eq('access_grants.resource_type', resourceType)
        .single();

      if (error || !data) {
        setError('Invalid or expired invitation link');
        return;
      }

      if (data.used_at) {
        setError('This invitation has already been used');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      // Get resource details based on type
      let resourceName = '';
      let resourceDescription = '';

      if (resourceType === 'release') {
        const { data: releaseData } = await supabase
          .from('releases')
          .select(`
            title,
            release_artists!inner(
              artist:artists(name)
            )
          `)
          .eq('id', resourceId)
          .single();

        if (releaseData) {
          resourceName = releaseData.title;
          resourceDescription = releaseData.release_artists?.[0]?.artist?.[0]?.name || undefined;
        }
      } else if (resourceType === 'artist') {
        const { data: artistData } = await supabase
          .from('artists')
          .select('name')
          .eq('id', resourceId)
          .single();

        if (artistData) {
          resourceName = artistData.name;
        }
      } else if (resourceType === 'organization') {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', resourceId)
          .single();

        if (orgData) {
          resourceName = orgData.name;
          resourceDescription = 'organization';
        }
      }

      setInviteInfo({
        token,
        resourceId,
        resourceType,
        resourceName,
        resourceDescription,
        email: data.email,
      });

      // Pre-fill the email
      setEmail(data.email);
    } catch (err) {
      console.error('Error validating invite token:', err);
      setError('Invalid invitation link');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber || null,
            location: location || null,
            avatar_url: profileImageUrl || null,
          }
        }
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        // Create a user profile record in a custom table
        // Note: This might be handled by a database trigger, so we'll try but not fail if it errors
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: authData.user.id,
              first_name: firstName,
              last_name: lastName,
              email: email,
              phone_number: phoneNumber || null,
              location: location || null,
              avatar_url: profileImageUrl || null,
            }
          ])

        if (profileError) {
          console.error('Profile creation error:', profileError)
          console.error('Profile error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          })
          // Check if it's a duplicate key error (profile already exists from trigger)
          if (profileError.code !== '23505') {
            // If it's not a duplicate error, we should show it to the user
            setError(`Profile setup error: ${profileError.message}`)
            setLoading(false)
            return
          }
          // If it's a duplicate, that's fine - the trigger probably created it
        }

        // If this was an invite signup, mark the token as used and redirect to the resource
        if (inviteInfo) {
          await supabase
            .from('invite_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', inviteInfo.token);

          // Get the access grant ID from the invite token
          const { data: tokenData } = await supabase
            .from('invite_tokens')
            .select('access_grant_id')
            .eq('token', inviteInfo.token)
            .single();

          if (tokenData) {
            // Update the access_grants record to link the user
            await supabase
              .from('access_grants')
              .update({ 
                user_id: authData.user.id,
                accepted_at: new Date().toISOString()
              })
              .eq('id', tokenData.access_grant_id);
          }

          // Clear saved organization for new users
          localStorage.removeItem('selectedOrganizationId');
          
          // Redirect to the appropriate resource page
          if (inviteInfo.resourceType === 'release') {
            router.push(`/releases/${inviteInfo.resourceId}`);
          } else if (inviteInfo.resourceType === 'artist') {
            router.push(`/artists/${inviteInfo.resourceId}`);
          } else if (inviteInfo.resourceType === 'organization') {
            router.push('/select-organization');
          } else {
            router.push('/select-organization');
          }
        } else {
          // Regular signup - redirect to organization setup
          router.push('/organization-setup');
        }
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUploaded = (url: string) => {
    setProfileImageUrl(url)
  }

  return (
    <AuthWrapper requireAuth={false}>
      <AuthLayout 
        title="Create account"
        subtitle={
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-gray-300 hover:text-white underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="space-y-6">
          {inviteInfo && (
            <div className="p-4 bg-blue-600/20 border border-blue-600/30 rounded-xl">
              <h3 className="text-blue-400 font-medium mb-1">You've been invited!</h3>
              <p className="text-blue-300 text-sm">
                Join <strong>"{inviteInfo.resourceName}"</strong>
                {inviteInfo.resourceDescription && ` - ${inviteInfo.resourceDescription}`}
              </p>
            </div>
          )}

          {/* Google SSO Button */}
          <GoogleSignInButton onError={(errorMsg) => setError(errorMsg)} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#121212] text-gray-400">or</span>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Email Field */}
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!!inviteInfo}
              className={`w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                inviteInfo ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              required
            />

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full bg-white text-black hover:bg-gray-100 rounded-xl py-3 font-medium"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Creating Account...' : 'Continue'}
            </Button>
          </form>

          {/* Terms & Privacy */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-gray-400 hover:text-white underline">
                Terms & Conditions
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-gray-400 hover:text-white underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    </AuthWrapper>
  )
}
