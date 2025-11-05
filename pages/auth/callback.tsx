import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import AuthWrapper from '../../components/AuthWrapper';
import Spinner from '../../components/Spinner';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth callback error:', error);
        router.push('/login?error=auth_failed');
        return;
      }

      if (data.session) {
        // Clear saved organization to force selection screen for multi-org users
        localStorage.removeItem('selectedOrganizationId');
        // Redirect to select-organization which will handle routing
        router.push('/select-organization');
      } else {
        // No session found, redirect to login
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <AuthWrapper requireAuth={false}>
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-white mt-4">Completing sign in...</p>
        </div>
      </div>
    </AuthWrapper>
  );
}
