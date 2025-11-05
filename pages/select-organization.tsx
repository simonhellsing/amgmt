import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useOrganization } from '../lib/OrganizationContext';
import AuthWrapper from '../components/AuthWrapper';
import Spinner from '../components/Spinner';
import { AudioLines, Building2, ChevronRight } from 'lucide-react';

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { allOrganizations, setSelectedOrganization, loading, refreshOrganizations } = useOrganization();
  const [selecting, setSelecting] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Force refresh organizations when this page loads
  useEffect(() => {
    console.log('SelectOrganization: Component mounted, refreshing organizations');
    const doRefresh = async () => {
      await refreshOrganizations();
      setInitialLoadComplete(true);
    };
    doRefresh();
  }, [refreshOrganizations]);

  useEffect(() => {
    console.log('SelectOrganization: loading:', loading, 'initialLoadComplete:', initialLoadComplete, 'orgs:', allOrganizations.length);
    
    // Only process redirects after initial refresh is complete
    if (!initialLoadComplete) {
      return;
    }

    // Wait until context has finished loading
    if (loading) {
      return;
    }

    // If user has only one organization, auto-select it and redirect to home
    if (allOrganizations.length === 1) {
      console.log('SelectOrganization: Single org found, auto-selecting:', allOrganizations[0].name);
      setSelectedOrganization(allOrganizations[0]);
      router.push('/home');
      return;
    }

    // If user has multiple organizations, show selection screen (do nothing, let UI render)
    if (allOrganizations.length > 1) {
      console.log('SelectOrganization: Multiple orgs found, showing selection screen');
      return;
    }

    // Only redirect to organization setup if we're absolutely sure there are no organizations
    // This should only happen for brand new users
    if (allOrganizations.length === 0) {
      console.log('SelectOrganization: No orgs found after initial load, redirecting to setup');
      router.push('/organization-setup');
      return;
    }
  }, [loading, allOrganizations, router, setSelectedOrganization, initialLoadComplete]);

  const handleSelectOrganization = async (org: any) => {
    setSelecting(true);
    setSelectedOrganization(org);
    // Small delay to show selection feedback
    setTimeout(() => {
      router.push('/home');
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Don't render the selection UI if we're redirecting
  if (allOrganizations.length <= 1) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <Spinner size="lg" />
      </div>
    );
  }

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
              Select your workspace
            </h1>
            <p className="text-gray-400">
              Choose which organization you want to work with
            </p>
          </div>

          {/* Organization List */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
            <div className="divide-y divide-gray-800">
              {allOrganizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrganization(org)}
                  disabled={selecting}
                  className="w-full px-6 py-5 flex items-center gap-4 hover:bg-gray-800/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                >
                  {/* Organization Logo */}
                  <div className="flex-shrink-0">
                    {org.image_url ? (
                      <img
                        src={org.image_url}
                        alt={org.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Organization Name */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-gray-100">
                      {org.name}
                    </h3>
                  </div>

                  {/* Arrow Icon */}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Footer Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              You can switch between organizations anytime from the settings
            </p>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

