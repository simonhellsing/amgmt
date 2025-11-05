import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import AuthWrapper from '../components/AuthWrapper';
import ReleaseCard from '../components/ReleaseCard';
import Spinner from '../components/Spinner';
import { getAccessibleReleases, Release } from '../lib/accessControl';
import { useOrganization } from '../lib/OrganizationContext';

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedOrganization, loading: orgLoading } = useOrganization();

  useEffect(() => {
    const fetchReleases = async () => {
      // Wait for organization context to load
      if (orgLoading) {
        return;
      }

      // Ensure an organization is selected before fetching data
      if (!selectedOrganization) {
        setLoading(false);
        return;
      }

      try {
        const accessibleReleases = await getAccessibleReleases();
        
        // Sort releases by status priority, then by created date
        const sortedReleases = accessibleReleases.sort((a, b) => {
          // Define status priority (higher number = higher priority)
          const statusPriority: { [key: string]: number } = {
            'in_progress': 3,
            'final': 2,
            'not_started': 1
          };
          
          const aPriority = statusPriority[a.status || 'not_started'] || 0;
          const bPriority = statusPriority[b.status || 'not_started'] || 0;
          
          // First sort by status priority (descending)
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          // Then sort by created date (most recent first)
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          
          return 0;
        });
        
        setReleases(sortedReleases);
      } catch (error) {
        console.error('Error fetching accessible releases:', error);
        setReleases([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, [selectedOrganization, orgLoading]);

  if (loading) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Releases</h1>
            </div>
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </Layout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Layout>
        <div className="text-white">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Releases</h1>
          </div>
          
          {releases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">No releases found</p>
              <p className="text-gray-500">
                You don't have access to any releases yet. Contact your administrator to get access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4">
              {releases.map((release) => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </AuthWrapper>
  );
}