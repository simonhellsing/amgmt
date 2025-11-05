import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../lib/OrganizationContext';
import Spinner from './Spinner';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  skipOrganizationCheck?: boolean;
}

export default function AuthWrapper({ children, requireAuth = true, skipOrganizationCheck = false }: AuthWrapperProps) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { needsOrganizationSelection, loading: orgLoading } = useOrganization();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (requireAuth && !user) {
        // User not authenticated, redirect to login
        router.push('/login');
        return;
      }
      
      if (!requireAuth && user) {
        // User is authenticated but on auth pages, redirect to home
        router.push('/home');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [requireAuth, router]);

  useEffect(() => {
    // After auth check, check if organization selection is needed
    if (!loading && !orgLoading && requireAuth && !skipOrganizationCheck) {
      if (needsOrganizationSelection && router.pathname !== '/select-organization') {
        console.log('AuthWrapper: Redirecting to select-organization, needsOrganizationSelection:', needsOrganizationSelection);
        router.push('/select-organization');
      }
    }
  }, [loading, orgLoading, requireAuth, skipOrganizationCheck, needsOrganizationSelection, router.pathname, router]);

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
} 