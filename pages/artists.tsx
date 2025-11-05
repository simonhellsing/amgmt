import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ArtistCard from '../components/ArtistCard';
import AuthWrapper from '../components/AuthWrapper';
import Spinner from '../components/Spinner';
import { getAccessibleArtists, Artist } from '../lib/accessControl';
import { useOrganization } from '../lib/OrganizationContext';

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { selectedOrganization, loading: orgLoading } = useOrganization();

  useEffect(() => {
    const fetchArtists = async () => {
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
        const accessibleArtists = await getAccessibleArtists();
        setArtists(accessibleArtists);
      } catch (error) {
        console.error('Error fetching accessible artists:', error);
        setArtists([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [selectedOrganization, orgLoading]);

  const refreshArtists = () => {
    setLoading(true);
    setArtists([]);
    // Triggers useEffect
    router.replace(router.asPath);
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Layout>
          <div className="text-white">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Artists</h1>
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
            <h1 className="text-2xl font-bold">Artists</h1>
          </div>

          {artists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">No artists found</p>
              <p className="text-gray-500">
                You don't have access to any artists yet. Contact your administrator to get access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4 -mx-4">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </AuthWrapper>
  );
}